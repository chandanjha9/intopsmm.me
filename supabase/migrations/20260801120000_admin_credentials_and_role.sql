-- Confirm admin email and grant admin role to admin@growmesmm.in
UPDATE auth.users
SET email_confirmed_at = COALESCE(email_confirmed_at, now())
WHERE email = 'admin@growmesmm.in';

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM auth.users
WHERE email = 'admin@growmesmm.in'
ON CONFLICT (user_id, role) DO NOTHING;

-- Update handle_new_user trigger to automatically assign admin role to admin accounts
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data ->> 'username',
      split_part(COALESCE(NEW.email, 'user'), '@', 1) || '_' || substr(NEW.id::text, 1, 6)
    ),
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'),
    NEW.raw_user_meta_data ->> 'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;

  IF (NEW.email ILIKE 'admin%' OR (NEW.raw_user_meta_data ->> 'username') = 'admin' OR (NEW.raw_user_meta_data ->> 'is_admin') = 'true') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;
