# HANDOFF.md — Anesthculator v0.72 → Claude Code / Codex CLI

Written by Claude (chat/sandbox environment) for whoever picks this up next
in a real terminal against the actual GitHub repository. Everything below
was built and unit-tested in an isolated sandbox — **not verified in a real
browser or deployed to GitHub Pages.** Treat it as a strong draft, not a
finished sprint.

---

## 0. What environment this came from, and why it stops here

This work happened in a chat sandbox with:
- no persistent git remote (can't push/PR)
- no real browser (only Node.js — DOM was stubbed by hand for tests)
- no network egress (can't deploy or hit GitHub Pages)

So everything claimed "done" below means **passed a Node-based unit/smoke
test**, not "confirmed working in Safari/Chrome" or "confirmed deployed."
The product owner correctly flagged that this gap makes chat-delivered zips
unreliable for this project going forward. Claude Code / Codex CLI running
against the real repo should close that gap: real browser (via Playwright/
Puppeteer or manual check), real `git`, real GitHub Pages deploy.

---

## 1. Role split (per product owner's direction)

- **Product owner**: Chief Product Architect + Clinical UX Designer + Clinical
  Expert. Owns UX specs, clinical reasoning correctness, mentor voice,
  algorithm flow, and reviews every sprint.
- **Claude Code / Codex CLI**: Software engineer. Edits the real repo files,
  runs build/tests/lint, commits with git, deploys, reports back.
- **This document**: context transfer only. It is not an instruction to
  merge anything as-is — re-verify against the specs below before treating
  any of it as final.

---

## 2. Base repository state

- Base: **Anesthculator v0.71.0** ("Clinical Reasoning Foundation")
- Must preserve unchanged: Drug Calculator, Drug Library, Crisis, Reference,
  existing CSS rules (append-only was the rule followed here), existing
  routing/tab architecture, `manifest.json` PWA behavior.
- Repo layout (unchanged from v0.71 except additions noted in §3):
  ```
  index.html          — single-page app, tab-based routing
  app.js               — ~2,180 lines, all UI logic incl. Drug Calculator etc.
  clinical-reasoning.js — pre-existing v0.71 engine (now superseded for
                          Hypotension only — still loaded, not deleted)
  style.css            — ~1,026 lines
  cloud.js, sw.js, manifest.json, validate.js, test-calc.js,
  test-reasoning.js, schemas/, sql/, src/clinical-reasoning/types.ts, docs/
  ```

---

## 3. What was added this sprint (Sprint 1 + spec-compliance revision)

### 3.1 New engine modules — `engines/` (all DOM-free, Node-requireable)

| File | Lines | Owns |
|---|---|---|
| `engines/clinical-engine.js` | 180 | Diagnoses list, evidence-weight table, `scoreVector()`, `evaluate()` |
| `engines/question-engine.js` | 279 | Question bank, branching (`when` predicates), information-gain question selection, `PRESENTATION_IMPLIES` map, `pruneOrphans()` |
| `engines/response-engine.js` | 122 | `RESPONSES` table, Action→Response→Reinterpret deltas, `awaitingAssessment()` |
| `engines/algorithm-router.js` | 238 | Per-diagnosis pathway builder (`ALGORITHMS`), `route()`, `crisisLinks()` |
| `engines/mentor-engine.js` | 164 | Mentor Bar copy, `currentPriority()`, `currentPlan()`, `questionRationale()` |

Each uses the UMD pattern already used by `clinical-reasoning.js`
(`root.AnesthX = api`), so they work both via `<script>` tag (browser
global) and `require()` (Node tests).

### 3.2 `app.js` changes

- **Only the Hypotension "Clinical Approach" render block was touched.**
  Everything else (Drug Calculator, Drug Library, Crisis, Reference,
  routing, service worker registration line) is untouched except the
  cache-busting query string `?v=0710` → `?v=0720`.
- Old `fastReasoningHTML()` / clue-picker block **deleted** and replaced
  with a new block (search for `/* ===== v0.72 Senior Mentor Mode`) that:
  - renders 9 sections in spec order (§4)
  - reads/writes a `fastCase` state object
  - wires click + touch (swipe) handlers via **event delegation on
    `document`**, not per-element listeners (existing app.js pattern)
- `initClinicalApproach()` was simplified: free-text search wiring removed,
  now just calls `fastSetPresentation()` + renders.
- Selecting a presentation card now calls `fastSetPresentation(id)`, which
  seeds `fastCase.answers` from `AnesthQuestions.impliedAnswers(id)`.

### 3.3 `index.html` changes

- Added 5 `<script>` tags for the new engines, loaded **before** `app.js`
  and **after** `clinical-reasoning.js` (order matters — engines don't
  depend on each other except `question-engine.js` reads
  `window.AnesthClinical` at call time, not load time, so order is safe
  but keep it as-is).
- Removed: the green "Reasoning Foundation" badge, the duplicated
  `CLINICAL REASONING MODE` eyebrow + `🧭 Clinical Approach` heading +
  "What is happening?" mode badge (now just one `<h2>Clinical Approach</h2>`),
  the entire free-text/semantic search card (`#approachSearch` etc.).
- Renamed "Entry symptoms" → "Current Presentation" in the aside header.
- Service worker cache-busting bumped `?v=0710` → `?v=0720` throughout.

### 3.4 `style.css` changes

- **Append-only.** Nothing existing was edited or deleted. New rules added
  at the end under two comment blocks:
  `/* ===== v0.72 Senior Mentor Mode ===== */` and
  `/* ===== v0.72 spec update: Mentor Bar + working hypothesis ===== */`.
- Also a small readability patch to `.approachEntry` (font-size/contrast/
  spacing) per the "Current Presentation must be readable immediately"
  requirement — this one is NOT append-only, it edits existing selectors
  (`.approachEntry`, `.approachEntry b`, `.approachEntry .entryNum`,
  `.approachEntry .entryUrgency`, `.approachListHead b`). Verify these
  don't visually clash with anything else using `.approachEntry` elsewhere.

### 3.5 `sw.js` changes

- Version bumped `v0710-r1` → `v0720-r1`, cache name changes accordingly
  (old cache auto-evicted on activate — this is existing v0.71 behavior).
- `SHELL` array updated to include the 5 new `engines/*.js` files so they're
  precached for offline use.

### 3.6 `package.json`, `.github/workflows/validate.yml`, `docs/README_v072.md`

- `package.json`: version bumped to `0.72.0`, `test` script now runs
  `test-calc.js && test-reasoning.js && test-engines.js && test-mentor-ui.js
  && validate.js`. New `test:engines` script added.
- CI workflow: added steps for `test-reasoning.js`, `test-engines.js`,
  `test-mentor-ui.js` (previously only `test-calc.js` + `validate.js` ran).
- `docs/README_v072.md`: sprint summary, written from the sandbox's
  perspective — re-read and correct anything that turns out wrong once
  real browser testing happens.

### 3.7 Two new test files (Node-only, DOM stubbed)

- **`test-engines.js`** (21 assertions) — pure engine logic. No DOM at all.
- **`test-mentor-ui.js`** (23 assertions) — extracts the render block out
  of `app.js` via string slicing + `eval()` and drives it against a
  **hand-rolled DOM stub** (`document.addEventListener`,
  `document.getElementById` returning `null`). This is a real limitation:
  it proves the render functions produce the right HTML strings and the
  right data-flow, but it has **never touched a real DOM**, never checked
  CSS actually applies, never checked touch events fire correctly on an
  actual mobile browser, and never checked `$()` (querySelector) calls that
  the real `app.js` makes elsewhere still resolve correctly against the
  real `index.html` structure.

Run everything: `npm test`. Currently: 13 + reasoning + 21 + 23 + validate
all pass in Node. **This is necessary but not sufficient** — see checklist.

---

## 4. UX spec this sprint targeted (as given by product owner)

Two spec documents were provided across the conversation. The **second,
more detailed one** ("Anesthculator v0.72 UX Redesign Specification")
supersedes the first. Key points implemented against v2:

- **Fast Mode layout, in this exact order**: Mentor Bar → Current Priority
  → Immediate Actions → Next Best Question → Leading Causes → Next Action
  → Response Assessment → Continuous Reassessment → Timeline.
- **Mentor Bar**: first-person coaching line, tone changes by stage
  (`start` / `ask` / `act` / `assess`). Copy lives in
  `engines/mentor-engine.js` → `DX_CONCERN`, `LOOK_HINT`, `mentorBar()`.
  **This copy was written by the sandbox, not the product owner** — it's a
  first draft matching the example lines given
  ("ตอนนี้ผมกังวลเรื่องเลือดออกมากที่สุด...") but the full phrase set for
  every diagnosis × question combination needs clinical/tone review.
- **"Working Hypothesis" replaces "Diagnosis"** — done in the Leading
  Causes section render.
- **No duplicate logic**: `PRESENTATION_IMPLIES` in `question-engine.js`
  hardcodes which questions are pre-answered by which of the 12
  presentation cards. **Only 6 of the 12 presentations have mappings
  filled in** (`high-airway-pressure`, `rash-angioedema`, `tachy-arrhythmia`,
  `bradycardia`, `hypoxemia`, `hypotension`). The other 6
  (`cardiac-arrest`, `hyperthermia`, `seizure-last`, `delayed-emergence`,
  `severe-hypertension`, `emergence-agitation`) don't have question banks
  at all yet — selecting them still falls through to the old placeholder
  panel (`renderApproachPanel()`'s generic "structure ready" branch). This
  is expected per the brief ("Sprint 1 = Hypotension only, vertical slice"),
  just flagging it explicitly so it isn't mistaken for a bug.
- **Removed**: green Reasoning Foundation badge, duplicated titles,
  semantic/free-text search in Fast Mode, duplicated explanations.
- **One tap, no keyboard, no Save/Next button** — verified by a Node test
  that greps the rendered HTML for `<input`/`<textarea`/"Save"/"Next" and
  asserts none are present. This is a weak proxy for the real UX principle
  and should be re-validated by actually using the app one-handed on a
  phone.

---

## 5. The one clinical worked example that's under real test coverage

From the brief:
> AF treated → HR improved but MAP still low → AF becomes a **contributor**,
> not primary → weight shifts toward hypovolemia / vasodilation / pump.

This exact scenario is a named test in `test-engines.js`:
`'BRIEF SCENARIO: AF treated, HR improved, MAP still low → AF becomes contributor'`.
It passes. This is the one piece of clinical logic that was explicitly
checked against the brief's own example rather than invented — treat it as
the most trustworthy part of the scoring engine. Everything else in
`EVIDENCE` (question-engine.js) and `RESPONSES` (response-engine.js) is
placeholder weighting that needs real clinical review — this was already
flagged in `docs/REASONING.md` from v0.71 and remains true.

---

## 6. Known gaps / explicitly NOT done

- **No real browser test ever ran.** No Playwright/Puppeteer, no manual
  Safari/Chrome check, no screenshot review.
- **No GitHub Pages deploy test.** Path handling (`./engines/...` relative
  paths, service worker scope) has not been confirmed to survive a real
  Pages deployment (different base path scenarios, cache behavior on
  first load vs. update).
- **No lint run.** Repo doesn't appear to have an ESLint config in what
  was extracted — check for one before assuming "no lint errors" is
  meaningful; if there isn't one, consider adding one as part of this
  next phase.
- **No accessibility check** (screen reader, color contrast beyond the
  one manual fix in §3.4, focus order for the new buttons).
- **Only 6 of 12 presentations wired** (see §4). The other 6 need their
  own question banks + algorithm entries following the same pattern as
  Hypotension before they'll do anything beyond the old placeholder.
- **Mentor Bar copy is a first draft**, not reviewed by the product owner
  for tone/clinical accuracy.
- **`clinical-reasoning.js` (the old v0.71 engine) was left in place and
  still loaded** but is no longer used by the Hypotension panel. Confirm
  whether anything else in the app still calls `window.AnesthReasoning`
  before removing it — a quick `grep -n "AnesthReasoning" app.js` will
  tell you.

---

## 7. Suggested first session for Claude Code / Codex CLI

1. `git clone` the real repo, check out a new branch (e.g. `v0.72-senior-mentor`).
2. Apply the diffs described here (or request the sandbox's zip as a
   reference/starting patch — but re-verify every file against the real
   repo's current `main`, since it may have moved on since v0.71.0).
3. `npm test` — confirm the same pass counts as §3.7.
4. Serve locally (`npx serve .` or similar) and manually click through:
   - Drug Calculator still computes correctly
   - Drug Library / Crisis / Reference tabs still open
   - Clinical Approach → Hypotension → full flow: presentation select →
     question → AF branch → intervention → mark given → response →
     Leading Causes updates → timeline logs everything
   - swipe-left/right on Immediate Actions works on an actual touchscreen
     (or Chrome DevTools touch emulation at minimum)
5. Check browser console for errors on load and through the flow above.
6. Deploy to a preview/staging GitHub Pages branch if possible before
   merging to the branch Pages actually serves from.
7. Only then run through the checklist the product owner listed:
   local server ✓ / CSS ✓ / no console errors ✓ / routing ✓ /
   Drug Calculator ✓ / Clinical Approach flow ✓ / deployed + opens in
   Safari and Chrome ✓.
8. Report back per-item, not just "done" — the product owner has asked
   for exactly this level of verification going forward.

---

## 8. Files delivered alongside this document

- `Anesthculator_v0.72.0_Senior_Mentor.zip` — the full modified repo tree
  as it stood at the end of the sandbox session (superset of everything
  described above). **Use as a reference patch, not a trusted final
  artifact** — see §0.
