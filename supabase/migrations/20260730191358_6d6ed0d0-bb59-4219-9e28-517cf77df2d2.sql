insert into public.providers (name, api_url, api_key_encrypted, priority, is_active, timeout_ms, currency)
select 'ElectroSMM', 'https://electrosmm.com/api/v2', '', 1, true, 30000, 'INR'
where not exists (select 1 from public.providers);

insert into public.user_roles (user_id, role)
values ('47e3e1e5-dbbb-4339-9a80-d1aa8a8b3136', 'admin')
on conflict (user_id, role) do nothing;