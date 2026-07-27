Anesthculator v0.33 Cloud

Added:
- Supabase email/password authentication.
- Role display from public.profiles (viewer/editor/reviewer/admin).
- Shared cloud Drug Library read/sync from drugs + dose_records.
- Reference Evidence Manager for references + reference_files.
- Private Supabase Storage evidence upload support (PDF/Excel/images).
- Patient/case fields remain local-only; cloud.js contains no patient upload path.
- v0.32 Local Verify remains available and dose-record-specific.

Before evidence upload / role management:
1. Run SUPABASE_v033_SETUP.sql once in Supabase SQL Editor.
2. Create/sign in a user from the Cloud tab.
3. New users default to viewer. Change the intended user's public.profiles.role to editor/reviewer/admin from SQL Editor or Table Editor as appropriate.

Security:
- Frontend contains only the Supabase Project URL + publishable key.
- Never put a secret/service_role key in this PWA.
- RLS remains the enforcement layer.
