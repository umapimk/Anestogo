begin;

alter table public.dose_records
  add column if not exists dosing_weight text not null default 'TBW',
  add column if not exists dosing_weight_formula text;

alter table public.dose_records
  drop constraint if exists dose_records_dosing_weight_check;

alter table public.dose_records
  add constraint dose_records_dosing_weight_check
  check (dosing_weight in ('TBW','IBW','LBW','AdjBW','FIXED'));

-- Do NOT bulk-assign LBW/IBW/AdjBW to existing drugs.
-- Existing records remain TBW until each dose record is source/local verified.

commit;

select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema='public' and table_name='dose_records'
  and column_name in ('dosing_weight','dosing_weight_formula')
order by ordinal_position;
