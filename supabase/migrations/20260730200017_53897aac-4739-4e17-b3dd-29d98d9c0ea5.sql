CREATE POLICY "Users view own provider order refs"
ON public.provider_orders FOR SELECT
TO authenticated
USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = provider_orders.order_id AND o.user_id = auth.uid()));

GRANT SELECT ON public.provider_orders TO authenticated;