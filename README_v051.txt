Anesthculator v0.51 — Clinical Evidence Engine

Changes
- Builds a Drug → Phase → Dose → Weight-basis review structure.
- Loads built-in/local dose records for comparison when Cloud medication tables are empty.
- Groups duplicate candidates across pages by drug and clinical phase.
- Shows current record vs evidence proposal in one review card.
- Adds confidence score and clear mapping state.
- Re-running extraction replaces only unreviewed rows from the same evidence file.
- Approved/rejected history is preserved.
- Approval remains disabled until a specific Cloud dose record is mapped.
- Human reviewer/admin approval remains mandatory.

No SQL migration is required.
