Anesthculator v0.27 — Visibility/Search fix

Critical behavior fix:
- Hide in Drug Library affects Drug Library display state ONLY.
- It NEVER removes a drug from Plan.
- Plan Hide/Unhide remains phase-specific and independent.
- Existing old global-hidden values are ignored by Plan immediately.

Drug Library:
- Search searches the entire unified generic library even if a Category filter is currently selected.
- Hidden drugs remain in search results and display HIDDEN.
- Unified cards use generic-level Hide/Unhide: all duplicate underlying records are restored together.
- Old partially-hidden duplicate records are detected as HIDDEN and can be restored with one tap.

Clinical dose data and verification logic are unchanged from v0.26.
