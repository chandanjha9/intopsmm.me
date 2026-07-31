# ElectroSMM Provider Integration

Goal: your panel sells services, buys them from ElectroSMM behind the scenes. Customers never see the provider. All provider traffic happens on the server; the API key is stored encrypted and never reaches the browser.

## What I need from you before building

1. **ElectroSMM API key** — I'll ask for it through the secure secret form (never in code). Encrypted-at-rest copies for extra providers are stored in the database with an app encryption key I generate.
2. **Which account is admin** — the email of the user who should get the admin panel.

## Architecture

```text
Customer UI ──> server functions ──> ProviderService ──> HttpClient ──> ElectroSMM
                     │                                        │
                     └──> Database (orders, services, logs) <──┘
Cron (pg_cron) ──> /api/public/hooks/{status-sync,balance-sync,import-services}
```

- `src/lib/providers/http-client.ts` — retry (3x exponential backoff), timeout, JSON validation, structured logging; never retries auth/validation errors.
- `src/lib/providers/electrosmm.ts` — one class, all 10 provider actions (services, add, status, multi-status, refill, multi-refill, refill status, multi-refill status, cancel, balance).
- `src/lib/providers/*.repository.server.ts` — data access, no HTTP.
- `*.functions.ts` — thin RPC wrappers used by the UI; admin ones verify the admin role server-side.

## Database (single migration, RLS + grants on every table)

`app_role` enum + `user_roles` + `has_role()` (roles never on profiles).

Tables: `providers` (name, api_url, encrypted api key, priority, status, timeout, currency), `provider_services` (imported catalog, `is_available` flag), `services` (internal sellable service: internal name/category, provider link, markup type + value, computed selling price, status), `orders` (customer-facing: service, link, quantity, charge, status, start_count, remains), `provider_orders` (provider order id, request/response payloads), `order_status_history`, `refill_requests`, `cancel_requests`, `provider_logs` (request, response, ms, status code, retry count), `provider_balance_logs`, `cron_logs`, plus `wallet_transactions` for balance debits.

Customers can read only their own orders/transactions; provider tables are admin-only (no `anon`, no client-side rate exposure).

## Phase 1 — Foundation (this build)
- Migration above, encryption helper, HTTP client, ElectroSMM provider class, logging.
- Admin area `/_authenticated/admin`: Providers CRUD, enable/disable, priority, **Test connection**, **View balance**, **Import services** (upsert by provider service id, disable missing, no duplicates).
- Internal services + pricing engine (fixed markup or percentage; provider rate hidden from all customer-facing payloads).

## Phase 2 — Ordering
- Customer New Order form reads internal services; checkout validates wallet balance, creates local order atomically, debits wallet, forwards to provider `action=add`, stores provider order id + payloads, refunds wallet on provider failure.
- Duplicate-order guard (same user/service/link/quantity within a short window).
- Order history and transactions pages switch from mock data to real rows.

## Phase 3 — Sync, refill, cancel
- `/api/public/hooks/status-sync` — bulk `action=status` in batches of 100, every 2 min via pg_cron.
- `/api/public/hooks/balance-sync`, `/api/public/hooks/import-services` (daily), retry-failed-orders, log cleanup — all scheduled and logged to `cron_logs`.
- Refill and cancel buttons in order history for eligible services, with provider refill/cancel calls and status polling.

## Phase 4 — Admin dashboard, logs, tests
- Admin dashboard cards: provider balance + last updated, imported services, pending/completed/failed orders, API error count, last sync, health status.
- API log viewer with filters.
- Admin notifications (provider offline, low balance, cron/import/retry failure) stored in a notifications table and surfaced in the admin header.
- Vitest suites: http client retry/timeout, provider client with mocked responses, pricing engine, order creation, status sync batching.

## Notes on scope
This is a large build; I'll implement it phase by phase in order, verifying the build after each phase, and report progress. Nothing will be left as a stub or mock endpoint.

## Technical details
- Provider calls only from server functions / server routes; `.server.ts` modules and dynamic imports keep them out of client bundles.
- Zod validation on every input and on every provider response shape.
- Wallet debits/credits and order creation via a `security definer` SQL function so balance can't go negative under concurrency.
- Cron endpoints live under `/api/public/hooks/*` and authenticate with the project's publishable key header.
