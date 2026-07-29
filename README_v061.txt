Anesthculator v0.61 — Unit-safety and correctness release

No new clinical content. No existing dose value changed.

Fixed:
- CRITICAL: calc() divided dose by stock concentration without checking unit
  compatibility, producing 1000-fold volume errors where dose was in mcg and
  stock in mg/mL. Affected esmolol bolus (1500 mL -> 1.5 mL), esmolol infusion
  (300 -> 0.3 mL/min) and rocuronium infusion (60 -> 0.06 mL/min).
- Volume is now withheld with an explanation when the stock unit is not a
  mass-per-mL (unit/mL, mg/vial, percent) instead of printing a meaningless
  number.
- Dilution dialog DRAW volume and the saved working line used the raw dose
  against a target concentration expressed in the stock unit; both now use the
  converted dose.
- AdjBW returned a value below actual body weight when TBW < IBW; it now falls
  back to actual body weight and labels the fallback.
- Midazolam carried norepinephrine's category and drug class.
- Mivacurium carried tranexamic acid's category and drug class.
- Ten records declared ref: twice; JS silently kept the last one and discarded
  the earlier reference. Shadowed keys removed, effective reference unchanged.
- Service worker changed from network-first to cache-first with background
  revalidation for the app shell; cloud data remains network-first. Cache name
  now carries the app version.
- Free-text fields interpolated into innerHTML are now HTML-escaped.
- Stock unit dropdown no longer coerces a non-standard unit to mg/mL.
- Version strings reconciled (index.html said v0.58 while the release was
  v0.60, and the service worker cache said v038).

Added:
- validate.js  — release-gate validator for the drug library
- test-calc.js — regression tests for the unit engine

Not fixed (documented in README.md):
- Clinical data still in localStorage rather than IndexedDB
- IBW uses Lemmens rather than Devine
- alert() still used for validation errors

Safety:
This remains a workflow prototype. Institutional clinical approval and
simulation testing are required before patient-care deployment.
