import { HttpClient, type HttpLogEntry } from "./http-client.server";
import {
  ProviderApiError,
  type RemoteBalance,
  type RemoteCancelResponse,
  type RemoteOrderResponse,
  type RemoteOrderStatus,
  type RemoteRefillResponse,
  type RemoteRefillStatus,
  type RemoteService,
  type SmmProvider,
} from "./types";

export type ElectroSmmConfig = {
  apiUrl: string;
  apiKey: string;
  timeoutMs?: number;
  maxRetries?: number;
  onLog?: (entry: HttpLogEntry) => void | Promise<void>;
};

/**
 * ElectroSMM (Perfect Panel v2 compatible) adapter.
 * Every provider action lives here; the HTTP concerns live in HttpClient.
 */
export class ElectroSmmProvider implements SmmProvider {
  private readonly http: HttpClient;
  private readonly apiKey: string;

  constructor(config: ElectroSmmConfig) {
    this.apiKey = config.apiKey;
    this.http = new HttpClient({
      baseUrl: config.apiUrl,
      timeoutMs: config.timeoutMs,
      maxRetries: config.maxRetries,
      onLog: config.onLog,
    });
  }

  private call<T>(action: string, params: Record<string, string | number> = {}): Promise<T> {
    return this.http.postForm<T>(action, { key: this.apiKey, action, ...params });
  }

  async getServices(): Promise<RemoteService[]> {
    const result = await this.call<unknown>("services");
    if (!Array.isArray(result)) {
      throw new ProviderApiError("Provider returned an unexpected service list shape");
    }
    return result.filter(
      (item): item is RemoteService =>
        !!item && typeof item === "object" && "service" in item && "name" in item,
    );
  }

  async createOrder(input: { service: string; link: string; quantity: number }): Promise<RemoteOrderResponse> {
    const result = await this.call<RemoteOrderResponse>("add", {
      service: input.service,
      link: input.link,
      quantity: input.quantity,
    });
    if (!result || result.order === undefined || result.order === null) {
      throw new ProviderApiError("Provider did not return an order id");
    }
    return result;
  }

  getOrderStatus(orderId: string): Promise<RemoteOrderStatus> {
    return this.call<RemoteOrderStatus>("status", { order: orderId });
  }

  getMultipleOrderStatus(orderIds: string[]): Promise<Record<string, RemoteOrderStatus>> {
    return this.call<Record<string, RemoteOrderStatus>>("status", { orders: orderIds.join(",") });
  }

  createRefill(orderId: string): Promise<RemoteRefillResponse> {
    return this.call<RemoteRefillResponse>("refill", { order: orderId });
  }

  createMultipleRefill(orderIds: string[]): Promise<unknown> {
    return this.call<unknown>("refill", { orders: orderIds.join(",") });
  }

  getRefillStatus(refillId: string): Promise<RemoteRefillStatus> {
    return this.call<RemoteRefillStatus>("refill_status", { refill: refillId });
  }

  getMultipleRefillStatus(refillIds: string[]): Promise<unknown> {
    return this.call<unknown>("refill_status", { refills: refillIds.join(",") });
  }

  cancelOrders(orderIds: string[]): Promise<RemoteCancelResponse[]> {
    return this.call<RemoteCancelResponse[]>("cancel", { orders: orderIds.join(",") });
  }

  async getBalance(): Promise<RemoteBalance> {
    const result = await this.call<RemoteBalance>("balance");
    if (!result || typeof result.balance === "undefined") {
      throw new ProviderApiError("Provider did not return a balance");
    }
    return { balance: String(result.balance), currency: result.currency ?? "USD" };
  }
}
