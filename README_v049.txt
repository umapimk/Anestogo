Anesthculator v0.49 — Evidence Matcher Source Fallback

- Diagnoses Cloud medication query status and error.
- Retries the Supabase drugs query independently during evidence analysis.
- Falls back to the app built-in/local Drug Library if Cloud returns zero drugs or is unavailable.
- De-duplicates matcher names and prefers Cloud IDs when available.
- Evidence candidates from built-in/local names are stored without an invalid foreign-key drug_id and remain human-review only.
- No SQL migration required.

Safety: fallback improves name detection but cannot guarantee the evidence is matched to the correct Cloud dose record. Reviewer/admin approval remains mandatory.
