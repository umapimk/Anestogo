# Anesthculator v0.71.0 — Clinical Reasoning Foundation

This sprint adds the first executable foundation for the Clinical Reasoning Platform while preserving the existing Drug Calculator, Drug Library and Crisis modules.

## Delivered

- Runtime weighted reasoning engine (`clinical-reasoning.js`)
- TypeScript domain contracts (`src/clinical-reasoning/types.ts`)
- JSON Schema (`schemas/clinical-case.schema.json`)
- Hypotension Fast Mode vertical slice
- Ranked differential, immediate actions and next-best-question output
- Action/response reassessment loop
- Node regression test for the reasoning engine

## Safety boundary

This is a clinical decision-support prototype and not an autonomous diagnostic system. Scores are prioritization aids, not probabilities. Clinical content requires clinician review, evidence reconciliation, institutional approval and simulation testing before patient-care use.
