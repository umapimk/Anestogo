/* ============================================================
   clinical-engine.js — Anesthculator v0.72
   Owns: the clinical model (diagnoses + evidence weights) and
   scoring. Knows nothing about the DOM, questions, or wording.

   SAFETY: prioritization aid only. Scores are NOT probabilities.
   No drug names or doses live here — pathways defer to local
   protocol and clinician judgement.
   ============================================================ */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.AnesthClinical = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  /* ---------- Diagnoses ---------------------------------- */

  const DIAGNOSES = [
    { id: 'hypovolemia',  label: 'Hypovolemia / hemorrhage',   base: 1.0 },
    { id: 'vasodilation', label: 'Vasodilation / low SVR',     base: 1.0 },
    { id: 'measurement',  label: 'Measurement / delivery error', base: 0.7 },
    { id: 'anaphylaxis',  label: 'Perioperative anaphylaxis',  base: 0.5 },
    { id: 'pump-failure', label: 'Pump failure / ischemia',    base: 0.5 },
    { id: 'arrhythmia',   label: 'Rate / rhythm problem',      base: 0.4 },
    { id: 'obstruction',  label: 'Obstructive physiology',     base: 0.3 }
  ];

  /* ---------- Evidence ------------------------------------
     Each entry maps a questionId + answer value to weight
     deltas. Weights are UX-prototype placeholders pending
     clinician review and evidence reconciliation.
     ------------------------------------------------------- */

  const EVIDENCE = {
    q_field: {
      yes:     { hypovolemia: 5, vasodilation: -1, measurement: -1 },
      no:      { hypovolemia: -2 },
      unclear: {}
    },
    q_delivery: {
      yes:     { measurement: 6 },
      no:      { measurement: -2 },
      unclear: {}
    },
    q_skin: {
      yes:      { anaphylaxis: 6, vasodilation: 1 },
      no:       { anaphylaxis: -1 },
      'covered': {}
    },
    q_drug: {
      yes:    { anaphylaxis: 4, vasodilation: 2 },
      no:     { anaphylaxis: -2 },
      unsure: {}
    },
    q_airway: {
      yes:     { anaphylaxis: 3, obstruction: 3 },
      no:      { anaphylaxis: -1, obstruction: -1 },
      unclear: {}
    },
    q_etco2: {
      yes:     { obstruction: 5, 'pump-failure': 2, hypovolemia: 1 },
      no:      { obstruction: -2 },
      unclear: {}
    },
    q_dbp: {
      yes:     { vasodilation: 4, anaphylaxis: 2 },
      no:      { vasodilation: -1, hypovolemia: 1 },
      unclear: {}
    },
    q_rhythm: {
      yes:     { arrhythmia: 4 },
      no:      { arrhythmia: -2 },
      unclear: {}
    },
    q_rhythm_type: {
      af:         { arrhythmia: 4, 'pump-failure': 1 },
      svt:        { arrhythmia: 4 },
      vt:         { arrhythmia: 6, 'pump-failure': 3 },
      'sinus-tachy': { hypovolemia: 2, vasodilation: 2, arrhythmia: -2 },
      brady:      { arrhythmia: 3 },
      uncertain:  {}
    },
    q_af_onset: {
      new:      { arrhythmia: 2 },
      'pre-existing': { arrhythmia: -1, hypovolemia: 1, vasodilation: 1 },
      unknown:  {}
    },
    q_af_stability: {
      unstable:  { arrhythmia: 3 },
      stable:    { arrhythmia: -2, hypovolemia: 1, vasodilation: 1 },
      uncertain: {}
    },
    q_af_rate: {
      slow:      { arrhythmia: -2 },
      moderate:  { arrhythmia: 1 },
      fast:      { arrhythmia: 3 },
      uncertain: {}
    },
    q_af_trigger: {
      volume:     { hypovolemia: 4, arrhythmia: -1 },
      hypoxia:    { obstruction: 2 },
      light:      { vasodilation: 1 },
      electrolyte: {},
      none:       {}
    },
    q_ecg: {
      yes:     { 'pump-failure': 5, arrhythmia: 2 },
      no:      { 'pump-failure': -2 },
      unclear: {}
    }
  };

  /* ---------- Scoring ------------------------------------- */

  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

  // Confidence is a display aid only, not a probability.
  function confidenceFromScore(score) { return clamp(Math.round(35 + score * 8), 5, 95); }

  /**
   * Compute raw score vector from answers + response adjustments.
   * @param {object} answers        { questionId: value }
   * @param {Array}  responseDeltas [{ id, deltas:{dx:number} }] from response-engine
   */
  function scoreVector(answers, responseDeltas) {
    const s = {};
    DIAGNOSES.forEach(d => { s[d.id] = d.base; });

    Object.entries(answers || {}).forEach(([qid, value]) => {
      const w = (EVIDENCE[qid] || {})[value];
      if (!w) return;
      Object.entries(w).forEach(([dx, delta]) => { s[dx] = (s[dx] || 0) + delta; });
    });

    (responseDeltas || []).forEach(entry => {
      Object.entries(entry.deltas || {}).forEach(([dx, delta]) => {
        s[dx] = (s[dx] || 0) + delta;
      });
    });

    return s;
  }

  /**
   * Full ranked evaluation.
   * @param {object} state { answers, responseDeltas, roles }
   */
  function evaluate(state) {
    const answers = state.answers || {};
    const roles = state.roles || {};
    const s = scoreVector(answers, state.responseDeltas);

    const ranked = DIAGNOSES
      .map(d => ({
        id: d.id,
        label: d.label,
        score: Number(s[d.id].toFixed(1)),
        confidence: confidenceFromScore(s[d.id]),
        role: roles[d.id] || null   // 'contributor' | 'excluded' | null
      }))
      .sort((a, b) => b.score - a.score);

    // A diagnosis explicitly demoted to contributor should not
    // hold the top slot even if its raw score is still high.
    const primary = ranked.find(d => d.role !== 'contributor' && d.role !== 'excluded') || ranked[0];

    return {
      generatedAt: new Date().toISOString(),
      scores: s,
      ranked,
      top: primary,
      // Is the picture still ambiguous? Used to decide whether to
      // keep asking questions or move to a pathway.
      ambiguous: ranked.length > 1 && (ranked[0].score - ranked[1].score) < 2
    };
  }

  return { DIAGNOSES, EVIDENCE, evaluate, scoreVector, confidenceFromScore };
});
