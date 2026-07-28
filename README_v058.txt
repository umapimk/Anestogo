Anesthculator v0.58 — Evidence Intake Hub

Working intake routes:
- Manual Add Drug
- CSV import with preview and column mapping
- XLSX/XLS import when the browser spreadsheet parser is available
- PDF, DOCX and plain-text document analysis
- Pasted clinical text analysis

Candidate classifications:
Exact match, probable match, new dose record, conflict, new drug and insufficient evidence.

Safety:
- Nothing is silently merged or applied.
- The review queue is advisory.
- Conflict and probable-match candidates require manual resolution.
- Image OCR is not enabled in this build.
- Direct commit from the Intake Hub is intentionally disabled; use Manual Add or Reconciliation after mapping.

No SQL migration required.
