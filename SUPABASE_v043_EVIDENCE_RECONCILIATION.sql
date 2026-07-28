-- Anesthculator v0.43
-- Evidence ingestion / reconciliation queue.
-- Human review remains required before medication data is changed.

begin;

create table if not exists public.evidence_reconciliations (
  id uuid primary key default gen_random_uuid(),
  reference_id uuid not null references public.references(id) on delete cascade,
  reference_file_id uuid not null references public.reference_files(id) on delete cascade,
  drug_id uuid references public.drugs(id) on delete set null,
  dose_record_id uuid references public.dose_records(id) on delete set null,
  matched_drug_name text,
  status text not null default 'uploaded',
  evidence_excerpt text,
  page_reference text,
  proposed_changes jsonb not null default '{}'::jsonb,
  applied_changes jsonb,
  extracted_by uuid references auth.users(id) on delete set null,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint evidence_reconciliations_status_check
    check (status in ('uploaded','extracted','review_required','approved','rejected'))
);

alter table public.evidence_reconciliations enable row level security;

drop policy if exists "authenticated read evidence reconciliations"
on public.evidence_reconciliations;
create policy "authenticated read evidence reconciliations"
on public.evidence_reconciliations
for select to authenticated
using (true);

drop policy if exists "edit evidence reconciliations"
on public.evidence_reconciliations;
create policy "edit evidence reconciliations"
on public.evidence_reconciliations
for all to authenticated
using (public.can_edit_library())
with check (public.can_edit_library());

-- Approval updates dose_records. Existing "edit doses" policy already allows
-- editor/reviewer/admin through can_edit_library(). Verification insert remains
-- restricted by the existing can_verify_library() policy for reviewer/admin.

create index if not exists evidence_reconciliations_reference_idx
  on public.evidence_reconciliations(reference_id);

create index if not exists evidence_reconciliations_file_idx
  on public.evidence_reconciliations(reference_file_id);

create index if not exists evidence_reconciliations_dose_idx
  on public.evidence_reconciliations(dose_record_id);

commit;

select column_name, data_type, is_nullable
from information_schema.columns
where table_schema='public'
  and table_name='evidence_reconciliations'
order by ordinal_position;
