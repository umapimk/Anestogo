Anesthculator v0.56 — Strict Row Parser & Cloud Mapping Repair

- Stops extraction before the next detected drug row.
- Parses the same physical PDF row before using a bounded fallback.
- Caps multi-row fallback and stops at section headers.
- Reduces cross-row dose leakage.
- Loads Cloud drugs and dose_records with separate direct queries.
- Displays Cloud query status and row counts.
- Requires meaningful phase/context agreement before mapping a dose record.
- Blocks approval unless Cloud drugs and Cloud dose records are available.
- Multiple ranges, units, phases, or weight bases remain manual-review-only.

No SQL migration is required.
