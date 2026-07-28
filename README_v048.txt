Anesthculator v0.48 — Drug Matcher Repair

Fixes evidence extraction cases where PDF.js successfully returns text but no drug names are matched.

Changes:
- Normal + compact drug-name matching.
- Handles token/glyph spacing such as P r o p o f o l.
- Searches both reconstructed lines and whole-page text.
- Uses generic_name and display_name plus conservative formatting variants.
- Whole-page context fallback for complex tables.
- Diagnostic now shows Cloud drug count, matched terms and extracted-text preview.
- Existing v0.47 Storage upload/download/hash fixes retained.
- Human reviewer/admin approval is still required before medication data changes.

No SQL migration required.
