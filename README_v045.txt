Anesthculator v0.45 — Robust Evidence Storage

Fixes evidence files that appeared as metadata but downloaded as 0 bytes.

Changes:
- Reads the selected File into ArrayBuffer before upload.
- Refuses iOS/iCloud placeholders with metadata but zero readable bytes.
- Uploads the ArrayBuffer payload to Supabase Storage.
- Downloads the object immediately and compares byte-for-byte size.
- Private download first uses the authenticated endpoint; if it returns an empty body, v0.45 falls back to a short-lived signed URL.
- PDF evidence must begin with %PDF- before metadata is registered.
- Broken uploads are not added to reference_files; best-effort Storage cleanup runs on verification failure.
- Upload diagnostic displays Selected file / Binary payload / Storage path / Upload response / Download verification.

No SQL migration is required.
