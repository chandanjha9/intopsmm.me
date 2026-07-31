REVOKE EXECUTE ON FUNCTION public.create_order_with_debit(uuid,uuid,text,integer) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.refund_order(uuid,text) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;