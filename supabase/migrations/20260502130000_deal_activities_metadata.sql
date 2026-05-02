alter table public.deal_activities
  add column if not exists metadata jsonb null;
