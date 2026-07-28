Anesthculator v0.50
Table-aware evidence reconciliation:
- Parses PDF row coordinates and Induction/Maintenance columns.
- Uses same-cell dose and weight basis.
- Maps fallback drug names to Cloud UUID/dose records where possible.
- Merges duplicates by drug + phase + page.
- Conflicting variants require manual review.
- No SQL migration required.
