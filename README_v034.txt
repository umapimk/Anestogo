Anesthculator v0.34 — Dose-record Verification CTA

Changes from v0.33:
- Every dose record in Drug Library now has a real verification button.
- Unverified unlocked records show “Verify this dose”.
- Source-verified records show “Review / Local Verify”.
- Dose-locked records show “Local Verify & Unlock”.
- Locally verified records show “Edit Local Verify”.
- Verification remains dose-record specific: phase + indication/context are part of the key.
- Verifying Fentanyl Induction does NOT automatically verify its Intraoperative, Maintenance, or Post-op records.
- Purple reference strip remains reference text; the explicit button above it is the action control.
- Existing Supabase cloud setup, RLS, evidence manager, GitHub Pages paths, and patient local-only boundary are unchanged.

GitHub Pages update:
Upload/replace index.html, app.js, style.css, sw.js, cloud.js, manifest.json at repository root.
After deployment, reload once or close/reopen the PWA so the v0.34 service worker cache replaces v0.33.
