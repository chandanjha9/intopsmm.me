import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAdmin } from "@/lib/admin-guard.server";
import {
  fetchAdminOverview,
  fetchApiLogs,
  fetchInternalServices,
  fetchProviderCatalog,
  fetchProviders,
  removeInternalService,
  removeProvider,
  saveInternalService,
  saveProvider,
  testProviderConnection,
} from "./admin.server";
import {
  cleanOldLogs,
  importProviderServices,
  retryFailedOrders,
  syncOrderStatuses,
  syncProviderBalances,
} from "./sync.server";

const providerSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(80),
  apiUrl: z.string().trim().url().max(300),
  apiKey: z.string().trim().min(8).max(300).optional(),
  priority: z.number().int().min(1).max(100),
  isActive: z.boolean(),
  timeoutMs: z.number().int().min(2000).max(120000),
  currency: z.string().trim().min(2).max(8),
});

const serviceSchema = z.object({
  id: z.string().uuid().optional(),
  providerId: z.string().uuid(),
  providerServiceId: z.string().trim().min(1).max(64),
  name: z.string().trim().min(2).max(160),
  category: z.string().trim().min(1).max(80),
  platform: z.string().trim().min(1).max(40),
  description: z.string().trim().max(500).optional(),
  markupType: z.enum(["percentage", "fixed"]),
  markupValue: z.number().min(0).max(100000),
  isActive: z.boolean(),
});

export const isCurrentUserAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    return { isAdmin: Boolean(data) };
  });

export const adminListProviders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => fetchProviders(await requireAdmin(context.supabase, context.userId)));

export const adminSaveProvider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => providerSchema.parse(input))
  .handler(async ({ data, context }) =>
    saveProvider(await requireAdmin(context.supabase, context.userId), data),
  );

export const adminDeleteProvider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await removeProvider(await requireAdmin(context.supabase, context.userId), data.id);
    return { deleted: true };
  });

export const adminTestProvider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    return testProviderConnection(data.id);
  });

export const adminImportServices = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ providerId: z.string().uuid().optional() }).parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    return importProviderServices(data.providerId ?? null);
  });

export const adminSyncBalances = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    return syncProviderBalances();
  });

export const adminSyncStatuses = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    return syncOrderStatuses();
  });

export const adminRetryFailedOrders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    return retryFailedOrders();
  });

export const adminCleanLogs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    return cleanOldLogs();
  });

export const adminListCatalog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        providerId: z.string().uuid().optional(),
        search: z.string().trim().max(80).optional(),
        limit: z.number().int().min(1).max(500).default(100),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }) =>
    fetchProviderCatalog(await requireAdmin(context.supabase, context.userId), data),
  );

export const adminListServices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => fetchInternalServices(await requireAdmin(context.supabase, context.userId)));

export const adminSaveService = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => serviceSchema.parse(input))
  .handler(async ({ data, context }) =>
    saveInternalService(await requireAdmin(context.supabase, context.userId), data),
  );

export const adminDeleteService = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await removeInternalService(await requireAdmin(context.supabase, context.userId), data.id);
    return { deleted: true };
  });

export const adminListLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        action: z.string().trim().max(40).optional(),
        onlyErrors: z.boolean().default(false),
        limit: z.number().int().min(1).max(200).default(50),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }) =>
    fetchApiLogs(await requireAdmin(context.supabase, context.userId), data),
  );

export const adminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => fetchAdminOverview(await requireAdmin(context.supabase, context.userId)));
