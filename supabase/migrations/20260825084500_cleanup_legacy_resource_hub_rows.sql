-- Remove the old resource-hub rows that were actually internal site navigation.
-- All genuine resource rows in v4 carry at least one item in links[].

delete from public.resource_hub_items
where links = '[]'::jsonb
  and coalesce(url,'') = ''
  and coalesce(secondary_url,'') = '';
