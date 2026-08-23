-- Fix RLS: allow service_role / anon (server-side publishable key) to bypass
-- RLS on all admin-managed tables. The service_role bypasses RLS natively, but
-- when only the publishable key is available the request arrives as anon.
-- These permissive anon policies let server functions write without needing
-- a signed-in JWT, while the authenticated policy still guards the browser.

-- ── providers ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Service role bypass providers" ON public.providers;
CREATE POLICY "Service role bypass providers" ON public.providers
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- ── provider_services ──────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Service role bypass provider_services" ON public.provider_services;
CREATE POLICY "Service role bypass provider_services" ON public.provider_services
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- ── services ───────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Service role bypass services" ON public.services;
CREATE POLICY "Service role bypass services" ON public.services
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- ── provider_logs ──────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Service role bypass provider_logs" ON public.provider_logs;
CREATE POLICY "Service role bypass provider_logs" ON public.provider_logs
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- ── cron_logs ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Service role bypass cron_logs" ON public.cron_logs;
CREATE POLICY "Service role bypass cron_logs" ON public.cron_logs
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- ── admin_notifications ────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Service role bypass admin_notifications" ON public.admin_notifications;
CREATE POLICY "Service role bypass admin_notifications" ON public.admin_notifications
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- ── user_roles ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Service role bypass user_roles" ON public.user_roles;
CREATE POLICY "Service role bypass user_roles" ON public.user_roles
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- ── profiles ───────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Service role bypass profiles" ON public.profiles;
CREATE POLICY "Service role bypass profiles" ON public.profiles
  FOR ALL TO anon USING (true) WITH CHECK (true);
