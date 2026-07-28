Anesthculator v0.46 — Evidence Table/Text Extraction

Changes from v0.45:
- Reconstructs PDF text into rows using PDF coordinates instead of flattening all fragments.
- Normalizes Unicode dashes, spacing, mcg symbols and /kg units.
- Finds Cloud generic/display drug names line-by-line before dose extraction.
- Reads multiple dose candidates near the same drug (e.g. induction and maintenance).
- Associates the nearest TBW / IBW / LBW / AdjBW statement with each extracted dose.
- Uses nearby phase/indication words to match the most likely dose_record.
- Adds extraction diagnostics: extracted character count, drug names found, structured candidate count.
- Still requires reviewer/admin approval before any dose record changes.

No SQL migration is required for v0.46.
