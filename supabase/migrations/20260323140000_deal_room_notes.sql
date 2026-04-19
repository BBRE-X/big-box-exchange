create table if not exists public.deal_room_notes (
  id uuid primary key default gen_random_uuid(),
  deal_room_id uuid not null references public.deal_rooms (id) on delete cascade,
  company_id uuid not null,
  created_by uuid not null,
  body text not null,
  created_at timestamp with time zone not null default now()
);

create index if not exists deal_room_notes_room_created_at_idx
  on public.deal_room_notes (deal_room_id, created_at desc);

alter table public.deal_room_notes enable row level security;

create policy "deal_room_notes_select_for_company_members"
  on public.deal_room_notes
  for select
  using (
    exists (
      select 1
      from public.memberships m
      where m.company_id = deal_room_notes.company_id
        and m.user_id = auth.uid()
        and (m.status is null or m.status = 'active')
    )
  );

create policy "deal_room_notes_insert_for_company_members"
  on public.deal_room_notes
  for insert
  with check (
    created_by = auth.uid()
    and exists (
      select 1
      from public.memberships m
      where m.company_id = deal_room_notes.company_id
        and m.user_id = auth.uid()
        and (m.status is null or m.status = 'active')
    )
    and exists (
      select 1
      from public.deal_rooms dr
      where dr.id = deal_room_notes.deal_room_id
        and dr.company_id = deal_room_notes.company_id
    )
  );
