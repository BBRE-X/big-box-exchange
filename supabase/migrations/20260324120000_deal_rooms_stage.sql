alter table public.deal_rooms
  add column if not exists stage text;

update public.deal_rooms
set stage = 'lead'
where stage is null or trim(stage) = '';

alter table public.deal_rooms
  alter column stage set default 'lead';

alter table public.deal_rooms
  alter column stage set not null;

alter table public.deal_rooms
  drop constraint if exists deal_rooms_stage_check;

alter table public.deal_rooms
  add constraint deal_rooms_stage_check
  check (
    stage in (
      'lead',
      'qualified',
      'under_review',
      'negotiation',
      'under_contract',
      'closed'
    )
  );

drop policy if exists "deal_rooms_update_for_company_members" on public.deal_rooms;

create policy "deal_rooms_update_for_company_members"
  on public.deal_rooms
  for update
  using (
    exists (
      select 1
      from public.memberships m
      where m.company_id = deal_rooms.company_id
        and m.user_id = auth.uid()
        and (m.status is null or m.status = 'active')
    )
  )
  with check (
    exists (
      select 1
      from public.memberships m
      where m.company_id = deal_rooms.company_id
        and m.user_id = auth.uid()
        and (m.status is null or m.status = 'active')
    )
  );
