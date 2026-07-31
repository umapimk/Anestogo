# Anesthculator v0.73.1 — Senior Mentor Engine

## What changed
- AF branch now asks onset, stability, ventricular rate, and likely reversible trigger.
- Intervention no longer ends the flow.
- Every intervention opens a mandatory Response Assessment.
- Each response is stored in Response History and feeds back into the working diagnosis.
- After a response, the system reopens the next reasoning/action cycle.
- Mentor wording explains why the next question matters.

## Suggested AF test path
Rhythm change → AF → new onset → stability → rate → trigger → choose intervention → response → observe re-ranked diagnosis → choose next action.

## Safety
Prototype only. Not clinically validated. Do not use for patient care.
