CREATE TABLE public.payment_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  gateway text NOT NULL DEFAULT 'razorpay',
  gateway_order_id text NOT NULL,
  gateway_payment_id text,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'INR',
  status text NOT NULL DEFAULT 'created',
  error_message text,
  credited_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX payment_orders_gateway_order_id_key ON public.payment_orders (gateway, gateway_order_id);
CREATE INDEX payment_orders_user_id_idx ON public.payment_orders (user_id, created_at DESC);

GRANT SELECT, INSERT ON public.payment_orders TO authenticated;
GRANT ALL ON public.payment_orders TO service_role;

ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own payment orders" ON public.payment_orders
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users create own payment orders" ON public.payment_orders
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER set_payment_orders_updated_at
  BEFORE UPDATE ON public.payment_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.credit_wallet_from_payment(_gateway text, _gateway_order_id text, _gateway_payment_id text, _amount numeric)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.payment_orders;
  v_balance numeric;
BEGIN
  SELECT * INTO v_row FROM public.payment_orders
  WHERE gateway = _gateway AND gateway_order_id = _gateway_order_id
  FOR UPDATE;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Payment order not found';
  END IF;

  IF v_row.status = 'paid' THEN
    RETURN false;
  END IF;

  UPDATE public.profiles
    SET wallet_balance = wallet_balance + _amount
    WHERE id = v_row.user_id
    RETURNING wallet_balance INTO v_balance;

  INSERT INTO public.wallet_transactions (user_id, type, amount, balance_after, description, reference_id)
  VALUES (v_row.user_id, 'credit', _amount, v_balance, 'Wallet top-up (' || _gateway || ')', v_row.id);

  UPDATE public.payment_orders
    SET status = 'paid',
        gateway_payment_id = COALESCE(_gateway_payment_id, gateway_payment_id),
        credited_at = now()
    WHERE id = v_row.id;

  RETURN true;
END $$;