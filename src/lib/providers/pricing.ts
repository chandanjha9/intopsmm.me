import type { MarkupType } from "./types";

/**
 * Pricing engine. Provider cost + profit = selling price.
 * Rates are per 1000 units, matching the provider convention.
 */
export function calculateSellingRate(
  providerRate: number,
  markupType: MarkupType,
  markupValue: number,
  fxRate = 1,
): number {
  const cost = providerRate * fxRate;
  const raw = markupType === "percentage" ? cost * (1 + markupValue / 100) : cost + markupValue;
  return Math.round(Math.max(raw, 0) * 10000) / 10000;
}

/** Charge for a given quantity, rate is per 1000 units. */
export function calculateCharge(sellingRate: number, quantity: number): number {
  return Math.round((sellingRate * quantity) / 1000 * 100) / 100;
}

export function formatInr(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}
