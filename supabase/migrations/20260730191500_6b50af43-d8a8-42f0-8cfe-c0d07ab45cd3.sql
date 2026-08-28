insert into public.services (
  provider_id, provider_service_id, name, category, platform,
  markup_type, markup_value, selling_rate,
  min_quantity, max_quantity, refill_supported, cancel_supported, is_active
)
select ps.provider_id, ps.provider_service_id, ps.name, coalesce(nullif(ps.category,''),'Other'),
  case
    when ps.name ilike '%instagram%' or ps.category ilike '%instagram%' then 'Instagram'
    when ps.name ilike '%youtube%' or ps.category ilike '%youtube%' then 'YouTube'
    when ps.name ilike '%tiktok%' or ps.category ilike '%tiktok%' then 'TikTok'
    when ps.name ilike '%telegram%' or ps.category ilike '%telegram%' then 'Telegram'
    when ps.name ilike '%whatsapp%' or ps.category ilike '%whatsapp%' then 'WhatsApp'
    when ps.name ilike '%twitter%' or ps.name ilike '% x %' or ps.category ilike '%twitter%' then 'X'
    when ps.name ilike '%facebook%' or ps.category ilike '%facebook%' then 'Facebook'
    else 'Other'
  end,
  'percentage', 20, round((ps.rate * 1.2)::numeric, 4),
  ps.min_quantity, ps.max_quantity, ps.refill_supported, ps.cancel_supported, ps.is_available
from public.provider_services ps
where ps.is_available
  and not exists (
    select 1 from public.services s
    where s.provider_id = ps.provider_id and s.provider_service_id = ps.provider_service_id
  );