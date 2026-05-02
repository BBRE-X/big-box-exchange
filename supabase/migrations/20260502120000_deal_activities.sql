create table if not exists public.deal_activities (
  id          uuid        primary key default gen_random_uuid(),
  deal_id     uuid        not null references public.deals(id) on delete cascade,
  company_id  uuid        not null,
  user_id     uuid        null,
  action_type text        not null,
  from_stage  text        null,
  to_stage    text        null,
  created_at  timestamptz not null default now()
);

create index if not exists deal_activities_deal_idx
  on public.deal_activities (deal_id, created_at desc);

alter table public.deal_activities enable row level security;

create policy "deal_activities_select_for_company_members"
  on public.deal_activities for select
  using (
    exists (
      select 1 from public.memberships m
      where m.company_id = deal_activities.company_id
        and m.user_id = auth.uid()
        and (m.status is null or m.status = 'active')
    )
  );

create policy "deal_activities_insert_for_company_members"
  on public.deal_activities for insert
  with check (
    exists (
      select 1 from public.memberships m
      where m.company_id = deal_activities.company_id
        and m.user_id = auth.uid()
        and (m.status is null or m.status = 'active')
    )
  );
