import {
  cleanOldLogs,
  importProviderServices,
  logCronRun,
  retryFailedOrders,
  syncOrderStatuses,
  syncProviderBalances,
} from "./sync.server";

export type JobName =
  | "status-sync"
  | "balance-sync"
  | "import-services"
  | "retry-failed-orders"
  | "clean-logs";

const JOBS: Record<JobName, () => Promise<Record<string, unknown>>> = {
  "status-sync": async () => ({ ...(await syncOrderStatuses()) }),
  "balance-sync": async () => ({ ...(await syncProviderBalances()) }),
  "import-services": async () => ({ ...(await importProviderServices(null)) }),
  "retry-failed-orders": async () => ({ ...(await retryFailedOrders()) }),
  "clean-logs": async () => ({ ...(await cleanOldLogs()) }),
};

function isAuthorised(request: Request): boolean {
  const expected = process.env.CRON_SECRET || process.env.JWT_SECRET;
  if (!expected) return true;
  const provided =
    request.headers.get("x-cron-secret") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return Boolean(provided) && provided === expected;
}

/** Shared entry point for every scheduled hook: auth, run, log, respond. */
export async function runScheduledJob(job: JobName, request: Request): Promise<Response> {
  if (!isAuthorised(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const started = Date.now();
  try {
    const details = await JOBS[job]();
    await logCronRun(job, "success", details, Date.now() - started);
    return Response.json({ job, ...details });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown job failure";
    await logCronRun(job, "error", { error: message }, Date.now() - started);
    console.error(`[cron:${job}] ${message}`);
    return Response.json({ job, error: message }, { status: 500 });
  }
}
