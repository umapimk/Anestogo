Anesthculator v0.36 — GitHub Pages build

This build is adjusted for GitHub Pages project-site subpaths such as:
https://USERNAME.github.io/Anesthculator/

Upload ALL files in this folder to the ROOT of the GitHub repository.
index.html must appear directly in the repository root, not inside another folder.

GitHub Pages setup:
1. Repository > Settings > Pages
2. Source: Deploy from a branch
3. Branch: main
4. Folder: /(root)
5. Save

Important:
- Supabase publishable key is client-safe with the configured RLS policies.
- Never add a Supabase secret/service_role key to this repository.
- Patient calculator data remains local in the browser; Cloud features cover shared library/reference data.


v0.36: Every Drug Library dose record now has a real Verify action button; verification remains phase/indication-specific.
