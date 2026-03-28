create table if not exists public.deals (
  id uuid primary key default gen_random_uuid (),
  deal_room_id uuid not null references public.deal_rooms (id) on delete cascade,
  company_id uuid not null,
  title text not null,
  summary text,
  stage text not null default 'lead',
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint deals_stage_check check (
    stage in (
      'lead',
      'qualified',
      'under_review',
      'negotiation',
      'under_contract',
      'closed'
    )
  )
);

create index if not exists deals_room_updated_idx
  on public.deals (deal_room_id, updated_at desc);

create or replace function public.set_deals_updated_at ()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists deals_set_updated_at on public.deals;

create trigger deals_set_updated_at
  before update on public.deals
  for each row
  execute function public.set_deals_updated_at();

alter table public.deals enable row level security;

create policy "deals_select_for_company_members"
  on public.deals
  for select
  using (
    exists (
      select 1
      from public.memberships m
      where m.company_id = deals.company_id
        and m.user_id = auth.uid ()
        and (m.status is null or m.status = 'active')
    )
  );

create policy "deals_insert_for_company_members"
  on public.deals
  for insert
  with check (
    exists (
      select 1
      from public.memberships m
      where m.company_id = deals.company_id
        and m.user_id = auth.uid ()
        and (m.status is null or m.status = 'active')
    )
    and exists (
      select 1
      from public.deal_rooms dr
      where dr.id = deals.deal_room_id
        and dr.company_id = deals.company_id
    )
  );

create policy "deals_update_for_company_members"
  on public.deals
  for update
  using (
    exists (
      select 1
      from public.memberships m
      where m.company_id = deals.company_id
        and m.user_id = auth.uid ()
        and (m.status is null or m.status = 'active')
    )
  )
  with check (
    exists (
      select 1
      from public.memberships m
      where m.company_id = deals.company_id
        and m.user_id = auth.uid ()
        and (m.status is null or m.status = 'active')
    )
    and exists (
      select 1
      from public.deal_rooms dr
      where dr.id = deals.deal_room_id
        and dr.company_id = deals.company_id
    )
  );

insert into public.deals (deal_room_id, company_id, title, summary, stage)
select
  dr.id,
  dr.company_id,
  'Primary deal',
  null,
  'lead'
from public.deal_rooms dr
where not exists (
  select 1
  from public.deals d
  where d.deal_room_id = dr.id
);
