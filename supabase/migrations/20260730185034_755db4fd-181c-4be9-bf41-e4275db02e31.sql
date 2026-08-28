-- ============ ROLES ============
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin','moderator','user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- ============ PROVIDERS ============
CREATE TABLE public.providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  api_url text NOT NULL,
  api_key_encrypted text NOT NULL,
  priority integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  timeout_ms integer NOT NULL DEFAULT 30000,
  currency text NOT NULL DEFAULT 'USD',
  last_balance numeric,
  last_balance_at timestamptz,
  last_error text,
  last_checked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.providers TO authenticated;
GRANT ALL ON public.providers TO service_role;
ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage providers" ON public.providers
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ PROVIDER SERVICES ============
CREATE TABLE public.provider_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  provider_service_id text NOT NULL,
  name text NOT NULL,
  category text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT 'Default',
  rate numeric NOT NULL DEFAULT 0,
  min_quantity integer NOT NULL DEFAULT 1,
  max_quantity integer NOT NULL DEFAULT 1000000,
  refill_supported boolean NOT NULL DEFAULT false,
  cancel_supported boolean NOT NULL DEFAULT false,
  is_available boolean NOT NULL DEFAULT true,
  last_imported_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider_id, provider_service_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.provider_services TO authenticated;
GRANT ALL ON public.provider_services TO service_role;
ALTER TABLE public.provider_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage provider services" ON public.provider_services
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ INTERNAL SERVICES ============
CREATE TABLE public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES public.providers(id) ON DELETE SET NULL,
  provider_service_id text,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'Other',
  platform text NOT NULL DEFAULT 'other',
  description text,
  markup_type text NOT NULL DEFAULT 'percentage',
  markup_value numeric NOT NULL DEFAULT 20,
  selling_rate numeric NOT NULL DEFAULT 0,
  min_quantity integer NOT NULL DEFAULT 1,
  max_quantity integer NOT NULL DEFAULT 1000000,
  refill_supported boolean NOT NULL DEFAULT false,
  cancel_supported boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.services TO authenticated;
GRANT ALL ON public.services TO service_role;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users can view active services" ON public.services
  FOR SELECT TO authenticated USING (is_active = true OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage services" ON public.services
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ ORDERS ============
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  service_name text NOT NULL,
  link text NOT NULL,
  quantity integer NOT NULL,
  charge numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  start_count integer NOT NULL DEFAULT 0,
  remains integer NOT NULL DEFAULT 0,
  error_message text,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own orders" ON public.orders
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Users create own orders" ON public.orders
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins update orders" ON public.orders
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ PROVIDER ORDERS ============
CREATE TABLE public.provider_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  provider_id uuid REFERENCES public.providers(id) ON DELETE SET NULL,
  provider_order_id text,
  request_payload jsonb,
  response_payload jsonb,
  status text NOT NULL DEFAULT 'pending',
  retry_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.provider_orders TO authenticated;
GRANT ALL ON public.provider_orders TO service_role;
ALTER TABLE public.provider_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage provider orders" ON public.provider_orders
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ ORDER STATUS HISTORY ============
CREATE TABLE public.order_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.order_status_history TO authenticated;
GRANT ALL ON public.order_status_history TO service_role;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own order history" ON public.order_status_history
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(),'admin')
    OR EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid())
  );

-- ============ REFILL / CANCEL ============
CREATE TABLE public.refill_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_refill_id text,
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.refill_requests TO authenticated;
GRANT ALL ON public.refill_requests TO service_role;
ALTER TABLE public.refill_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own refills" ON public.refill_requests
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Users create own refills" ON public.refill_requests
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.cancel_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.cancel_requests TO authenticated;
GRANT ALL ON public.cancel_requests TO service_role;
ALTER TABLE public.cancel_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own cancels" ON public.cancel_requests
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Users create own cancels" ON public.cancel_requests
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- ============ WALLET TRANSACTIONS ============
CREATE TABLE public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  amount numeric NOT NULL,
  balance_after numeric NOT NULL DEFAULT 0,
  description text,
  reference_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.wallet_transactions TO authenticated;
GRANT ALL ON public.wallet_transactions TO service_role;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own transactions" ON public.wallet_transactions
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

-- ============ LOGS ============
CREATE TABLE public.provider_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES public.providers(id) ON DELETE SET NULL,
  action text NOT NULL,
  request_payload jsonb,
  response_payload jsonb,
  status_code integer,
  duration_ms integer,
  retry_count integer NOT NULL DEFAULT 0,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.provider_logs TO authenticated;
GRANT ALL ON public.provider_logs TO service_role;
ALTER TABLE public.provider_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view provider logs" ON public.provider_logs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.provider_balance_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  balance numeric NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.provider_balance_logs TO authenticated;
GRANT ALL ON public.provider_balance_logs TO service_role;
ALTER TABLE public.provider_balance_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view balance logs" ON public.provider_balance_logs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.cron_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name text NOT NULL,
  status text NOT NULL,
  details jsonb,
  duration_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.cron_logs TO authenticated;
GRANT ALL ON public.cron_logs TO service_role;
ALTER TABLE public.cron_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view cron logs" ON public.cron_logs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.admin_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  severity text NOT NULL DEFAULT 'warning',
  title text NOT NULL,
  message text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.admin_notifications TO authenticated;
GRANT ALL ON public.admin_notifications TO service_role;
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage notifications" ON public.admin_notifications
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins mark notifications read" ON public.admin_notifications
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ TIMESTAMP TRIGGERS ============
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['providers','provider_services','services','orders','provider_orders','refill_requests','cancel_requests']
  LOOP
    EXECUTE format('CREATE TRIGGER set_%1$s_updated_at BEFORE UPDATE ON public.%1$s FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()', t);
  END LOOP;
END $$;

-- ============ WALLET-SAFE ORDER CREATION ============
CREATE OR REPLACE FUNCTION public.create_order_with_debit(
  _user_id uuid,
  _service_id uuid,
  _link text,
  _quantity integer
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_service public.services;
  v_charge numeric;
  v_balance numeric;
  v_order_id uuid;
BEGIN
  SELECT * INTO v_service FROM public.services WHERE id = _service_id AND is_active = true;
  IF v_service.id IS NULL THEN RAISE EXCEPTION 'Service not available'; END IF;
  IF _quantity < v_service.min_quantity OR _quantity > v_service.max_quantity THEN
    RAISE EXCEPTION 'Quantity must be between % and %', v_service.min_quantity, v_service.max_quantity;
  END IF;

  v_charge := round((v_service.selling_rate * _quantity / 1000.0)::numeric, 2);

  SELECT wallet_balance INTO v_balance FROM public.profiles WHERE id = _user_id FOR UPDATE;
  IF v_balance IS NULL THEN RAISE EXCEPTION 'Profile not found'; END IF;
  IF v_balance < v_charge THEN RAISE EXCEPTION 'Insufficient wallet balance'; END IF;

  IF EXISTS (
    SELECT 1 FROM public.orders
    WHERE user_id = _user_id AND service_id = _service_id AND link = _link
      AND quantity = _quantity AND created_at > now() - interval '2 minutes'
  ) THEN
    RAISE EXCEPTION 'Duplicate order detected, please wait before retrying';
  END IF;

  UPDATE public.profiles SET wallet_balance = wallet_balance - v_charge WHERE id = _user_id
  RETURNING wallet_balance INTO v_balance;

  INSERT INTO public.orders (user_id, service_id, service_name, link, quantity, charge, status, remains)
  VALUES (_user_id, _service_id, v_service.name, _link, _quantity, v_charge, 'pending', _quantity)
  RETURNING id INTO v_order_id;

  INSERT INTO public.wallet_transactions (user_id, type, amount, balance_after, description, reference_id)
  VALUES (_user_id, 'debit', v_charge, v_balance, 'Order: ' || v_service.name, v_order_id);

  INSERT INTO public.order_status_history (order_id, to_status, note)
  VALUES (v_order_id, 'pending', 'Order created');

  RETURN v_order_id;
END $$;

CREATE OR REPLACE FUNCTION public.refund_order(_order_id uuid, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_order public.orders; v_balance numeric;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF v_order.id IS NULL THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF v_order.status = 'refunded' THEN RETURN; END IF;

  UPDATE public.profiles SET wallet_balance = wallet_balance + v_order.charge WHERE id = v_order.user_id
  RETURNING wallet_balance INTO v_balance;

  INSERT INTO public.wallet_transactions (user_id, type, amount, balance_after, description, reference_id)
  VALUES (v_order.user_id, 'credit', v_order.charge, v_balance, COALESCE(_reason,'Order refund'), _order_id);

  UPDATE public.orders SET status = 'refunded', error_message = _reason WHERE id = _order_id;

  INSERT INTO public.order_status_history (order_id, from_status, to_status, note)
  VALUES (_order_id, v_order.status, 'refunded', _reason);
END $$;

REVOKE ALL ON FUNCTION public.create_order_with_debit(uuid,uuid,text,integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.refund_order(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_order_with_debit(uuid,uuid,text,integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.refund_order(uuid,text) TO service_role;

CREATE INDEX idx_orders_user ON public.orders(user_id, created_at DESC);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_provider_orders_order ON public.provider_orders(order_id);
CREATE INDEX idx_provider_logs_created ON public.provider_logs(created_at DESC);
CREATE INDEX idx_wallet_tx_user ON public.wallet_transactions(user_id, created_at DESC);