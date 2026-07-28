Anesthculator v0.57 — Reject Confirmation Hotfix

Fix:
- Reject confirmation now occurs before any database or UI state change.
- Cancel leaves the candidate unchanged and keeps the Reject button visible.
- Confirm marks only the reconciliation candidate as rejected.
- Evidence files and medication dose records are not deleted or modified by Reject.

No SQL migration required.
