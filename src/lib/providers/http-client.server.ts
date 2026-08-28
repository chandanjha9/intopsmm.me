import { ProviderApiError } from "./types";

export type HttpClientOptions = {
  baseUrl: string;
  timeoutMs?: number;
  maxRetries?: number;
  onLog?: (entry: HttpLogEntry) => void | Promise<void>;
};

export type HttpLogEntry = {
  action: string;
  request: Record<string, unknown>;
  response: unknown;
  statusCode: number | null;
  durationMs: number;
  retryCount: number;
  error: string | null;
};

const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);
const NON_RETRYABLE_MESSAGES = [
  "incorrect api key",
  "invalid api key",
  "incorrect service",
  "invalid service",
  "incorrect order id",
  "incorrect link",
  "invalid link",
  "not enough funds",
  "incorrect quantity",
  "invalid quantity",
];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function redact(payload: Record<string, unknown>): Record<string, unknown> {
  const clone = { ...payload };
  if ("key" in clone) clone.key = "***";
  return clone;
}

function classifyProviderError(message: string): ProviderApiError {
  const lower = message.toLowerCase();
  const retryable = !NON_RETRYABLE_MESSAGES.some((needle) => lower.includes(needle));
  return new ProviderApiError(message, null, retryable);
}

function formatRawError(status: number, text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith("<!DOCTYPE") || trimmed.startsWith("<html") || trimmed.includes("Cloudflare")) {
    if (status === 403) {
      return "Provider responded 403 Forbidden (Cloudflare / Bot Protection). The provider panel is blocking cloud datacenter server requests. Please check if provider requires IP Whitelisting or allowlists.";
    }
    if (status === 404) {
      return "Provider responded 404 Not Found. Please check that the API URL endpoint is correct (e.g. https://domain.com/api/v2).";
    }
    return `Provider returned an HTML page with HTTP status ${status}.`;
  }
  return `Provider responded ${status}: ${text.slice(0, 200)}`;
}

function normalizeUrl(url: string): string {
  let cleaned = url.trim().replace(/^[,;\s"']+|[,;\s"']+$/g, "");
  if (!cleaned.startsWith("http://") && !cleaned.startsWith("https://")) {
    cleaned = `https://${cleaned}`;
  }
  // Remove trailing slashes
  cleaned = cleaned.replace(/\/+$/, "");

  // If user passed just domain (e.g. https://electrosmm.com), append /api/v2
  try {
    const parsed = new URL(cleaned);
    if (!parsed.pathname || parsed.pathname === "/" || parsed.pathname === "") {
      parsed.pathname = "/api/v2";
      cleaned = parsed.toString().replace(/\/+$/, "");
    }
  } catch {
    // Ignore URL parse error
  }

  return cleaned;
}

/**
 * Reusable form-urlencoded JSON HTTP client with timeout, exponential-backoff
 * retries, response validation and structured logging. All provider traffic
 * flows through this single class so there is no duplicated fetch logic.
 */
export class HttpClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly onLog?: HttpClientOptions["onLog"];
  private readonly origin: string;

  constructor(options: HttpClientOptions) {
    this.baseUrl = normalizeUrl(options.baseUrl);
    this.timeoutMs = options.timeoutMs ?? 30000;
    this.maxRetries = options.maxRetries ?? 3;
    this.onLog = options.onLog;

    try {
      const parsed = new URL(this.baseUrl);
      this.origin = parsed.origin;
    } catch {
      this.origin = "";
    }
  }

  async postForm<T>(action: string, payload: Record<string, string | number>): Promise<T> {
    const started = Date.now();
    let attempt = 0;
    let lastError: ProviderApiError = new ProviderApiError("Provider request failed", null, true);

    const headers: Record<string, string> = {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Accept: "application/json, text/javascript, */*; q=0.01",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
      "X-Requested-With": "XMLHttpRequest",
      "sec-ch-ua": '"Not/A)Brand";v="8", "Chromium";v="126", "Google Chrome";v="126"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"Windows"',
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-origin",
    };

    if (this.origin) {
      headers["Origin"] = this.origin;
      headers["Referer"] = `${this.origin}/`;
    }

    while (attempt < this.maxRetries) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const body = new URLSearchParams();
        for (const [key, value] of Object.entries(payload)) body.append(key, String(value));

        const response = await fetch(this.baseUrl, {
          method: "POST",
          headers,
          body: body.toString(),
          signal: controller.signal,
        });

        const text = await response.text();

        if (!response.ok) {
          const friendlyMessage = formatRawError(response.status, text);
          const isRetryable = RETRYABLE_STATUS.has(response.status) && !text.includes("<!DOCTYPE");
          const error = new ProviderApiError(friendlyMessage, response.status, isRetryable);
          if (!error.retryable) {
            await this.log(action, payload, text, response.status, started, attempt, error.message);
            throw error;
          }
          lastError = error;
        } else {
          let parsed: unknown;
          try {
            parsed = JSON.parse(text);
          } catch {
            const friendlyMessage = formatRawError(response.status, text);
            const error = new ProviderApiError(
              friendlyMessage,
              response.status,
              false,
            );
            lastError = error;
            throw error;
          }

          if (parsed && typeof parsed === "object" && "error" in parsed) {
            const message = String((parsed as { error: unknown }).error ?? "Unknown provider error");
            const error = classifyProviderError(message);
            await this.log(action, payload, parsed, response.status, started, attempt, message);
            if (!error.retryable) throw error;
            lastError = error;
          } else {
            await this.log(action, payload, parsed, response.status, started, attempt, null);
            return parsed as T;
          }
        }
      } catch (error) {
        if (error instanceof ProviderApiError && !error.retryable) throw error;
        if (error instanceof Error && error.name === "AbortError") {
          lastError = new ProviderApiError(`Provider request timed out after ${this.timeoutMs}ms`, null, true);
        } else if (!(error instanceof ProviderApiError)) {
          lastError = new ProviderApiError(
            error instanceof Error ? error.message : "Network failure contacting provider",
            null,
            true,
          );
        }
      } finally {
        clearTimeout(timer);
      }

      attempt += 1;
      if (attempt < this.maxRetries) await sleep(2 ** attempt * 250);
    }

    await this.log(action, payload, null, lastError.statusCode, started, attempt, lastError.message);
    throw lastError;
  }

  private async log(
    action: string,
    payload: Record<string, string | number>,
    response: unknown,
    statusCode: number | null,
    started: number,
    retryCount: number,
    error: string | null,
  ): Promise<void> {
    if (!this.onLog) return;
    try {
      await this.onLog({
        action,
        request: redact(payload),
        response: typeof response === "string" ? { raw: response.slice(0, 2000) } : response,
        statusCode,
        durationMs: Date.now() - started,
        retryCount,
        error,
      });
    } catch (logError) {
      console.error("[provider] failed to persist log", logError);
    }
  }
}
