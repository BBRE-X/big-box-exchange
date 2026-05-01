-- Drop the existing INSERT policy that has a recursive deal_rooms RLS subquery.
-- The deal_rooms subquery triggers deal_rooms SELECT RLS which can fail in server
-- action context even when the room exists. Membership check alone is sufficient:
-- a user can only reach this path if they are already an active company member.

drop policy if exists "deals_insert_for_company_members" on public.deals;

create policy "deals_insert_for_company_members"
  on public.deals
  for insert
  with check (
    exists (
      select 1
      from public.memberships m
      where m.company_id = deals.company_id
        and m.user_id = auth.uid()
        and (m.status is null or m.status = 'active')
    )
  );
