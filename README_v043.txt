Anesthculator v0.43 — Evidence Ingestion & Reconciliation

Workflow:
Upload evidence -> Extract & Compare -> Review Required -> Approve / Reject -> update Cloud dose record -> verification history.

What v0.43 does:
- Adds Cloud > Reconciliation.
- Reads stored PDF evidence in-browser with PDF.js when CDN access is available.
- Reads XLS/XLSX/CSV evidence in-browser with SheetJS when CDN access is available.
- Conservative matching against Cloud generic drug names.
- Extracts explicit dose/kg ranges or single dose/kg statements and TBW/IBW/LBW/AdjBW phrases.
- Attempts to match a specific dose record using phase/indication/route/population words.
- Stores proposed changes in evidence_reconciliations.
- NEVER changes medication data merely because a file was uploaded or extracted.
- Reviewer/admin must explicitly Approve.
- Approval updates only fields explicitly extracted, then creates a source_verified verification record.
- Reject keeps evidence/history without changing the dose record.

IMPORTANT:
Run SUPABASE_v043_EVIDENCE_RECONCILIATION.sql once before using Reconciliation.
Machine extraction is assistive and may miss or misread context; always open the evidence and verify page/table/section before approval.
