Anesthculator v0.40 — Local Drug Edit/Delete UX + immediate refresh

Fixed:
- Primary Category dropdown changes now become visible immediately after Save.
- Existing stale Local Classification overrides are synchronized instead of silently overriding the edited category.
- Drug class/subcategory updates immediately.
- Category/phase edits refresh and reopen the same Drug Card immediately.
- No need to leave Drug Library and re-enter to see changes.
- Edit Drug and Delete buttons are now placed inside the LOCAL drug's own Drug Card header.
- Delete removes the selected LOCAL drug and its local hide/classification/stock/local-verification state, then refreshes the Library immediately.
- Delete confirmation includes the exact generic drug name.

Existing Cloud tabs, evidence controls, Back behavior, hidden Library guide, and weight-basis features are preserved.
