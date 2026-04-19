-- Create deal_notes table
create table if not exists public.deal_notes (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals (id) on delete cascade,
  company_id uuid not null,
  created_by uuid not null,
  body text not null,
  created_at timestamp with time zone not null default now()
);

-- Ensure body column exists (in case table was created without it)
alter table public.deal_notes add column if not exists body text;

create index if not exists deal_notes_deal_created_at_idx
  on public.deal_notes (deal_id, created_at desc);

alter table public.deal_notes enable row level security;

create policy "deal_notes_select_for_company_members"
  on public.deal_notes
  for select
  using (
    exists (
      select 1
      from public.memberships m
      where m.company_id = deal_notes.company_id
        and m.user_id = auth.uid()
        and (m.status is null or m.status = 'active')
    )
  );

create policy "deal_notes_insert_for_company_members"
  on public.deal_notes
  for insert
  with check (
    created_by = auth.uid()
    and exists (
      select 1
      from public.memberships m
      where m.company_id = deal_notes.company_id
        and m.user_id = auth.uid()
        and (m.status is null or m.status = 'active')
    )
    and exists (
      select 1
      from public.deals d
      where d.id = deal_notes.deal_id
        and d.company_id = deal_notes.company_id
    )
  );