create table if not exists public.deal_rooms (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  asset_id uuid not null,
  mandate_id uuid not null,
  created_at timestamp with time zone not null default now()
);

create unique index if not exists deal_rooms_company_asset_mandate_key
  on public.deal_rooms (company_id, asset_id, mandate_id);

alter table public.deal_rooms enable row level security;

create policy "deal_rooms_select_for_company_members"
  on public.deal_rooms
  for select
  using (
    exists (
      select 1
      from public.memberships m
      where m.company_id = deal_rooms.company_id
        and m.user_id = auth.uid()
        and (m.status is null or m.status = 'active')
    )
  );

create policy "deal_rooms_insert_for_company_members"
  on public.deal_rooms
  for insert
  with check (
    exists (
      select 1
      from public.memberships m
      where m.company_id = deal_rooms.company_id
        and m.user_id = auth.uid()
        and (m.status is null or m.status = 'active')
    )
  );
