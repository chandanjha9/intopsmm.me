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

  constructor(options: HttpClientOptions) {
    this.baseUrl = options.baseUrl;
    this.timeoutMs = options.timeoutMs ?? 30000;
    this.maxRetries = options.maxRetries ?? 3;
    this.onLog = options.onLog;
  }

  async postForm<T>(action: string, payload: Record<string, string | number>): Promise<T> {
    const started = Date.now();
    let attempt = 0;
    let lastError: ProviderApiError = new ProviderApiError("Provider request failed", null, true);

    while (attempt < this.maxRetries) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const body = new URLSearchParams();
        for (const [key, value] of Object.entries(payload)) body.append(key, String(value));

        const response = await fetch(this.baseUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Accept: "application/json",
          },
          body: body.toString(),
          signal: controller.signal,
        });

        const text = await response.text();

        if (!response.ok) {
          const error = new ProviderApiError(
            `Provider responded ${response.status}: ${text.slice(0, 300)}`,
            response.status,
            RETRYABLE_STATUS.has(response.status),
          );
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
            const error = new ProviderApiError(
              `Provider returned malformed JSON: ${text.slice(0, 200)}`,
              response.status,
              true,
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
