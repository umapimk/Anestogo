Anesthculator v0.44 — Evidence Storage Reliability

Changes from v0.43:
- Downloads the actual Supabase Storage object and rejects zero-byte downloads before parsing.
- Validates PDF %PDF- header before extraction.
- Shows Evidence diagnostic: metadata size, downloaded size, PDF validity, extraction readiness.
- New uploads are SHA-256 hashed and exact duplicate files are blocked.
- Upload is downloaded back and size-verified before reference_files metadata is committed.
- Evidence Files now has Delete evidence; deleting a file keeps the parent Reference.
- Existing v0.43 reconciliation / clinician approval workflow is preserved.

No new SQL migration is required if SUPABASE_v043_EVIDENCE_RECONCILIATION.sql has already been run.
