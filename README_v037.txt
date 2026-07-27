Anesthculator v0.37 — Dosing Weight Basis

New:
- Per-dose-record dosing weight basis: TBW / IBW / LBW / AdjBW.
- Existing per-kg records default to TBW unless explicitly verified otherwise.
- Patient-derived BMI, IBW (Lemmens 2005), LBW (Janmahasatian 2005), and AdjBW are calculated locally.
- Dose detail shows the selected weight basis, kg value, and formula.
- Local Verify now stores weight basis per phase + indication record.
- Back button retained; in-app back does not reload or erase patient data.
- Long Library guide remains collapsed by default.

Clinical safety:
No drug was automatically reassigned to IBW/LBW/AdjBW in this release. Weight basis must be verified for the specific drug + indication + phase before clinical use.
