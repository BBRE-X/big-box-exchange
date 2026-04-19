alter table public.deals
  add column if not exists source text not null default 'manual';

alter table public.deals
  drop constraint if exists deals_source_check;

alter table public.deals
  add constraint deals_source_check check (
    source in ('manual', 'match', 'mandate_response')
  );

update public.deals
set source = 'match'
where source = 'manual'
  and (
    title like '%·%'
    or title = 'Active deal'
  );
