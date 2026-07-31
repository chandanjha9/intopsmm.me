/**
 * Shared, client-safe types for the provider integration layer.
 * Nothing in this file touches the network or reads secrets.
 */

export type MarkupType = "percentage" | "fixed";

export type ProviderSummary = {
  id: string;
  name: string;
  api_url: string;
  priority: number;
  is_active: boolean;
  timeout_ms: number;
  currency: string;
  last_balance: number | null;
  last_balance_at: string | null;
  last_error: string | null;
  last_checked_at: string | null;
  has_api_key: boolean;
  created_at: string;
  updated_at: string;
};

export type ProviderServiceRecord = {
  id: string;
  provider_id: string;
  provider_service_id: string;
  name: string;
  category: string;
  type: string;
  rate: number;
  min_quantity: number;
  max_quantity: number;
  refill_supported: boolean;
  cancel_supported: boolean;
  is_available: boolean;
};

/** Raw shapes returned by the ElectroSMM (Perfect Panel compatible) API. */
export type RemoteService = {
  service: string;
  name: string;
  type: string;
  category: string;
  rate: string;
  min: string;
  max: string;
  refill?: boolean;
  cancel?: boolean;
};

export type RemoteOrderResponse = { order: number | string };

export type RemoteOrderStatus = {
  charge?: string;
  start_count?: string;
  status?: string;
  remains?: string;
  currency?: string;
  error?: string;
};

export type RemoteRefillResponse = { refill: number | string };

export type RemoteRefillStatus = { refill?: number | string; status?: string; error?: string };

export type RemoteCancelResponse = { order: number | string; cancel: unknown };

export type RemoteBalance = { balance: string; currency: string };

/** Normalised, provider-agnostic contract every provider adapter implements. */
export interface SmmProvider {
  getServices(): Promise<RemoteService[]>;
  createOrder(input: { service: string; link: string; quantity: number }): Promise<RemoteOrderResponse>;
  getOrderStatus(orderId: string): Promise<RemoteOrderStatus>;
  getMultipleOrderStatus(orderIds: string[]): Promise<Record<string, RemoteOrderStatus>>;
  createRefill(orderId: string): Promise<RemoteRefillResponse>;
  createMultipleRefill(orderIds: string[]): Promise<unknown>;
  getRefillStatus(refillId: string): Promise<RemoteRefillStatus>;
  getMultipleRefillStatus(refillIds: string[]): Promise<unknown>;
  cancelOrders(orderIds: string[]): Promise<unknown>;
  getBalance(): Promise<RemoteBalance>;
}

/** Non-retryable provider failures (bad key, bad service, bad order, ...). */
export class ProviderApiError extends Error {
  constructor(
    message: string,
    readonly statusCode: number | null = null,
    readonly retryable = false,
  ) {
    super(message);
    this.name = "ProviderApiError";
  }
}

export const ORDER_STATUS_MAP: Record<string, string> = {
  pending: "pending",
  "in progress": "in_progress",
  inprogress: "in_progress",
  processing: "processing",
  completed: "completed",
  partial: "partial",
  canceled: "canceled",
  cancelled: "canceled",
  refunded: "refunded",
  error: "error",
};

export function normaliseStatus(raw: string | undefined): string {
  if (!raw) return "pending";
  return ORDER_STATUS_MAP[raw.trim().toLowerCase()] ?? raw.trim().toLowerCase().replace(/\s+/g, "_");
}

export const ACTIVE_ORDER_STATUSES = ["pending", "in_progress", "processing", "queued"] as const;
