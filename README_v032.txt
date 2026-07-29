Anesthculator v0.32 — Local Verification Restored

Important finding:
- Source cross-check is NOT complete for the entire Drug Library.
- v0.23 Batch 1 source verification remains in the app for selected drugs/records.
- Remaining entries stay VERIFY / THAI CROSS-CHECK PENDING / DOSE LOCKED as appropriate.

Local Verify:
- Restored working Verify & Unlock handler lost during later UI refactors.
- Verification is now tied to a specific dose record (drug + phase + indication/context), not automatically the whole generic drug.
- Example: a hospital can locally verify Fentanyl Induction dose without automatically verifying its Post-op or Maintenance record.
- Required: population, route, dose min/default/max, unit, stock concentration/unit, reference, edition/version/date, page/table/section.
- Optional: target concentration, final volume, verification note.
- LOCAL VERIFIED data is stored on the current browser/device.
- Built-in reference records remain unchanged.
- Local verification can be edited or removed.

Existing old whole-drug Local Verified records remain backward-compatible.
