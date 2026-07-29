# Anesthculator v0.63.1

Anesthesia dose, dilution and perioperative crisis decision-support prototype.
Offline-capable PWA, deployable to GitHub Pages with no build step.

> **Clinical decision-support prototype.** Verify every dose, stock
> concentration, dilution, contraindication and crisis algorithm against your
> current approved institutional protocol before clinical use. This software
> has not been through institutional clinical approval or simulation testing.

---

## What changed in v0.63.1

v0.63.1 is a **safety and correctness release**. No new clinical content was
added and no existing dose value was altered.

### 1. Fixed a 1000-fold volume error (critical)

`calc()` previously divided the dose by the stock concentration without
checking that the two units matched. Any record where the dose was in mcg but
the stock was in mg/mL produced a volume 1000× too large:

| Record | Dose | Stock | v0.60 showed | v0.63.1 shows |
|---|---|---|---|---|
| Esmolol bolus | 250 mcg/kg | 10 mg/mL | 1500 mL | **1.5 mL** |
| Esmolol infusion | 50 mcg/kg/min | 10 mg/mL | 300 mL | **0.3 mL** |
| Rocuronium infusion | 10 mcg/kg/min | 10 mg/mL | 60 mL | **0.06 mL** |

The infusion cases were the more dangerous ones: 1500 mL is obviously wrong,
but 60 mL/min instead of 0.06 mL/min is a plausible-looking number that can be
dialled straight into a syringe pump.

All mass units are now normalised to mg before the division. The fix is in the
calculation engine rather than in individual records, so it also covers cloud
records and locally added drugs.

### 2. Volume is now withheld rather than guessed

If the stock unit is not a mass-per-mL — `unit/mL`, `mg/vial`, `percent` — the
app shows `—` and explains why, instead of printing an arithmetically valid but
clinically meaningless number. Vasopressin, cefazolin and lipid emulsion were
all affected.

### 3. Unit conversions are made visible

When a conversion is applied, the card and the dilution dialog say so
explicitly, so the person drawing up the drug can sanity-check the arithmetic
rather than trusting it silently.

### 4. Dilution and "prepared concentration" arithmetic

The DRAW volume in the dilution dialog and in the saved working line used the
raw dose against a target concentration in the stock unit — the same mismatch.
Both now use the converted dose.

### 5. Adjusted body weight guard

`AdjBW = IBW + 0.4 × (TBW − IBW)` returned a value **below the patient's actual
weight** when TBW < IBW. AdjBW now falls back to actual body weight in that
situation and labels itself accordingly.

### 6. Data integrity

- **Midazolam** was carrying norepinephrine's category and drug class
  ("Potent Alpha/Beta-1 Vasopressor"). Corrected to Premedication & Anxiolytics
  / Short-acting Benzodiazepine.
- **Mivacurium** was carrying tranexamic acid's category and class
  ("Antifibrinolytic Lysine Analog"). Corrected to Neuromuscular Blocking Agents.
- Ten records declared `ref:` twice in the same object. JavaScript silently
  keeps the last one, so the earlier reference was being discarded without any
  error. The shadowed keys were removed; the effective reference is unchanged.

### 7. Offline behaviour

The service worker was network-first, which is the worst strategy for an
operating theatre: weak-but-alive WiFi made every request wait for a timeout
before falling back to cache, so the app was slower on bad WiFi than with no
WiFi at all. It is now cache-first with background revalidation for the app
shell, while cloud data stays network-first so shared library records are never
served stale. The cache name now carries the app version, so a release always
evicts the previous shell.

### 8. Escaping

Free-text fields interpolated into `innerHTML` are now HTML-escaped. Previously
only single quotes were handled, so a drug name containing `&` or `<` — from
the shared cloud library or a locally added drug — broke the card silently.

---

## Verifying the fix yourself

```bash
node test-calc.js     # regression tests for the unit engine
node validate.js      # structural + unit validation of all 101 records
```

`validate.js` exits non-zero on failure, so it can gate a release. It checks
for duplicate keys, dose ranges where the default sits outside min/max,
missing references, duplicate ids, unit mismatches and category/class
incoherence. Run both before every release.

**What these do not check:** whether a dose is *clinically* correct. That still
requires source review by a clinician. The validator only guarantees that the
arithmetic and the structure are sound.

---

## Deploying to GitHub Pages

Upload the repository contents to the root of the repo — `index.html` must sit
directly in the root, not inside a folder.

1. Repository → Settings → Pages
2. Source: Deploy from a branch
3. Branch: `main`, Folder: `/(root)`
4. Save

The `.nojekyll` file must be present or GitHub Pages will ignore some assets.

**Never commit a Supabase `service_role` or secret key.** The publishable key is
client-safe only with the RLS policies in `sql/` applied.

---

## Repository layout

```
index.html          app shell
app.js              drug library, calculators, crisis engine
cloud.js            Supabase sync
style.css
sw.js               service worker (cache-first)
manifest.json
validate.js         release-gate validator
test-calc.js        unit engine regression tests
.nojekyll
docs/               release notes v0.32 – v0.60
sql/                Supabase schema and migrations
```

---

## v0.63.1 safety hardening status

- Added an IndexedDB mirror for locally verified records, local drugs and classification data while retaining localStorage as a compatibility cache. Browser storage is still not a permanent archive; use the new full safety backup export/import.
- IBW is explicitly labelled **Lemmens BMI-22**. The formula was not silently changed to Devine because that would alter dose behaviour.
- Blocking `alert()` messages are replaced with non-blocking in-app notifications.
- Ondansetron calculated dosing is **locked** until population-specific records (adult/>12 years, pediatric ≤40 kg, pediatric >40 kg) are implemented and clinically re-verified.
- Active crisis start time, steps, timers (absolute due timestamps), timeline and CPR roles persist across reload. CPR role assignment appears only for perioperative cardiac arrest.
- Service-worker cache is versioned `v0631-r1` and uses cache-first/stale-while-revalidate for the same-origin app shell.

### Remaining clinical requirement

The validator checks structure, categories, duplicate keys and unit consistency. It cannot establish that a dose, indication, age branch or crisis recommendation is clinically correct. Every clinical record still requires clinician review and simulation testing before patient use.

## Safety statement

This remains a workflow and calculation prototype. Institutional clinical
approval and simulation testing are required before any patient-care
deployment. Records marked `DOSE LOCKED`, `VERIFY` or `THAI CROSS-CHECK
PENDING` have not completed source reconciliation and must not be relied on.

## v0.63.1 — Interactive Crisis Checklist

This release redesigns Crisis Mode for readability under stress:

- status is shown by a left rail, icon, and badge rather than tinting the entire card;
- completed steps keep full text contrast and collapse to a compact summary;
- the next actionable step is highlighted and opened automatically;
- a progress indicator shows completed steps;
- contextual timers are embedded in relevant steps (including LAST lipid bolus/reassessment);
- timer controls remain on a white, high-contrast card;
- CPR role assignment remains limited to perioperative cardiac arrest;
- Timeline stays collapsed until requested;
- active crisis state and timer due timestamps continue to persist across reloads.

Clinical algorithms and doses still require clinician review and simulation testing before patient use.
