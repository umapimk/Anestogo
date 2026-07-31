# Anesthculator v0.72.0 — Senior Mentor Mode (Hypotension slice)

Sprint 1 converts Hypotension Fast Mode from a clue-picker into a guided
reasoning loop, using the existing v0.71 repository. Drug Calculator,
Drug Library, Crisis, Reference, routing and CSS are unchanged.

## What shipped

Five reusable engines under `engines/`, each with a single responsibility:

| Module | Owns |
|---|---|
| `clinical-engine.js` | diagnoses, evidence weights, scoring |
| `question-engine.js` | question bank, branching, next-best question |
| `response-engine.js` | Action → Response → Reinterpret loop |
| `algorithm-router.js` | which pathway opens, and its interventions |
| `mentor-engine.js` | the voice: one priority, one plan |

The engines are DOM-free and Node-testable. `app.js` only renders them.

## Behaviour changes

- **One question at a time**, selected by information gain — the question
  that would most change the ranking is asked first, rather than a fixed order.
- **Real branching.** Rhythm changed → rhythm type → AF branch (stability,
  onset, rate, trigger). Editing an upstream answer prunes orphaned
  branch answers automatically.
- **Contextual algorithms.** The leading diagnosis opens its own pathway;
  unstable AF offers a different intervention set from stable fast AF.
- **Mandatory response assessment.** An intervention marked as given
  pauses the question flow until a response is recorded. Reasoning never
  ends at a treatment recommendation.
- **Response updates the ranking.** Per the brief: AF treated → HR improved
  but MAP still low → AF is demoted to *contributor* and weight shifts to
  hypovolemia / vasodilation / pump failure. Covered by a named regression test.
- **Mentor Bar** at the top of every screen: a first-person coaching line
  that names the current concern and points where to look
  ("ตอนนี้ผมกังวลเรื่องเลือดออกมากที่สุด — ช่วยดู surgical field ก่อน").
  Tone changes with the stage: start / ask / act / assess.
- **Screen order** follows the spec exactly: Mentor Bar → Current Priority →
  Immediate Actions → Next Best Question → Leading Causes → Next Action →
  Response Assessment → Continuous Reassessment → Timeline.
- **Working Hypothesis** replaces "diagnosis" wording; ranking is dynamic only.
- **No duplicate logic.** Selecting a presentation answers its own question:
  High airway pressure locks `q_airway`, Rash locks `q_skin`, Bradycardia
  enters the rhythm branch directly. Locked answers are labelled
  "จากอาการที่เลือก" and are never asked again.
- **Search removed from Fast Mode.** Entry symptoms renamed
  **Current Presentation**, one tap to select. No keyboard anywhere.
- **Gestures.** Tap = done, swipe right = done, swipe left = defer. No
  dialogs, no Save, no Next, no keyboard.
- **Timeline** distinguishes `answer` from `correction`, and records
  actions, plans, responses and diagnosis updates automatically.
- Removed the green status banner and the version/foundation badges.
  Removed the duplicated "Hypotension Fast Mode" heading.
- Entry symptoms: larger type, stronger contrast, more spacing (CSS appended,
  nothing replaced).

## Tests

```
npm test
```

`test-engines.js` (21) covers the engines; `test-mentor-ui.js` (23) extracts
the render block from `app.js` and drives a full case with a DOM stub.
Existing `test-calc.js`, `test-reasoning.js` and `validate.js` still pass.

## Safety boundary

Prototype decision support, not an autonomous diagnostic system. Scores are
prioritization aids, not probabilities. **No drug names, doses or rates are
encoded in any pathway** — a regression test enforces this. Every pathway
defers to the approved local protocol. Clinical content still requires
clinician review, evidence reconciliation, institutional approval and
simulation testing before any patient-care use.

## Next sprint

Reuse the same engines for Hypoxemia, Bradycardia, High Airway Pressure,
Delayed Emergence and Cardiac Arrest by adding question banks and pathways —
no engine changes should be needed. Then: distinguish *correction* from
*clinical change* in the model (not just the timeline), and add Expert Mode.
