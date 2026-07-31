/* ============================================================
   question-engine.js — Anesthculator v0.72
   Owns: the question bank, branching rules, and choosing the
   single next-best question by information gain.

   Only ONE question is ever surfaced. Questions direct the
   user's attention ("Look at the ventilator") rather than
   asking for data entry ("Peak airway pressure?").
   ============================================================ */
(function (root, factory) {
  const api = factory(root.AnesthClinical);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.AnesthQuestions = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Clinical) {
  'use strict';

  /* ---------- Question bank -------------------------------
     text   : mentor-voice prompt (directs attention)
     options: [{ value, label }]
     when   : optional predicate(answers) for branching
     ------------------------------------------------------- */

  const QUESTIONS = [
    {
      id: 'q_field', label: 'Surgical field',
      text: 'มองที่ surgical field — มีเลือดออกหรือเสียสารน้ำผิดปกติหรือไม่',
      options: [
        { value: 'yes', label: 'มี' },
        { value: 'no', label: 'ไม่มี' },
        { value: 'unclear', label: 'ยังไม่เห็นชัด' }
      ]
    },
    {
      id: 'q_rhythm', label: 'Rhythm / rate',
      text: 'มองที่ monitor — จังหวะหรืออัตราการเต้นหัวใจเปลี่ยนไปหรือไม่',
      options: [
        { value: 'yes', label: 'เปลี่ยน' },
        { value: 'no', label: 'ไม่เปลี่ยน' },
        { value: 'unclear', label: 'ไม่แน่ใจ' }
      ]
    },
    {
      id: 'q_rhythm_type', label: 'Rhythm type',
      text: 'ดู ECG trace — เป็นจังหวะอะไร',
      when: a => a.q_rhythm === 'yes', depth: 1,
      options: [
        { value: 'af', label: 'AF' },
        { value: 'svt', label: 'SVT' },
        { value: 'vt', label: 'VT' },
        { value: 'sinus-tachy', label: 'Sinus tachycardia' },
        { value: 'brady', label: 'Bradycardia' },
        { value: 'uncertain', label: 'ยังแยกไม่ได้' }
      ]
    },
    {
      id: 'q_af_stability', label: 'AF — hemodynamic impact',
      text: 'ผู้ป่วยไม่มั่นคงจาก AF นี้หรือไม่',
      when: a => a.q_rhythm_type === 'af', depth: 2,
      options: [
        { value: 'unstable', label: 'ไม่มั่นคง' },
        { value: 'stable', label: 'ยังมั่นคง' },
        { value: 'uncertain', label: 'ไม่แน่ใจ' }
      ]
    },
    {
      id: 'q_af_onset', label: 'AF — onset',
      text: 'AF นี้เพิ่งเกิด หรือมีอยู่เดิม',
      when: a => a.q_rhythm_type === 'af', depth: 2,
      options: [
        { value: 'new', label: 'เพิ่งเกิด' },
        { value: 'pre-existing', label: 'มีเดิม' },
        { value: 'unknown', label: 'ไม่ทราบ' }
      ]
    },
    {
      id: 'q_af_rate', label: 'AF — ventricular rate',
      text: 'ดูอัตราการเต้น ventricular ประมาณเท่าไร',
      when: a => a.q_rhythm_type === 'af', depth: 2,
      options: [
        { value: 'slow', label: '< 110' },
        { value: 'moderate', label: '110–150' },
        { value: 'fast', label: '> 150' },
        { value: 'uncertain', label: 'ไม่แน่ใจ' }
      ]
    },
    {
      id: 'q_af_trigger', label: 'AF — underlying trigger',
      text: 'มองหาตัวกระตุ้น — อะไรน่าจะเป็นสาเหตุของ AF ครั้งนี้มากที่สุด',
      when: a => a.q_rhythm_type === 'af', depth: 2,
      options: [
        { value: 'volume', label: 'Hypovolemia' },
        { value: 'hypoxia', label: 'Hypoxia / ventilation' },
        { value: 'light', label: 'Light anesthesia / pain' },
        { value: 'electrolyte', label: 'Electrolyte' },
        { value: 'none', label: 'ยังไม่พบ' }
      ]
    },
    {
      id: 'q_ecg', label: 'Ischemia / contractility',
      text: 'มองที่ ECG — มี ST change หรือสัญญาณว่าหัวใจบีบตัวแย่ลงหรือไม่',
      when: a => a.q_rhythm !== undefined, depth: 1,
      options: [
        { value: 'yes', label: 'มี' },
        { value: 'no', label: 'ไม่มี' },
        { value: 'unclear', label: 'ยังประเมินไม่ได้' }
      ]
    },
    {
      id: 'q_skin', label: 'Skin / swelling',
      text: 'มองที่ตัวผู้ป่วย — มีผื่น หน้าแดง หรือบวมหรือไม่',
      options: [
        { value: 'yes', label: 'มี' },
        { value: 'no', label: 'ไม่มี' },
        { value: 'covered', label: 'ผ้าคลุมบัง ดูไม่ได้' }
      ]
    },
    {
      id: 'q_airway', label: 'Peak airway pressure',
      text: 'มองที่เครื่องช่วยหายใจ — peak airway pressure สูงขึ้นหรือไม่',
      options: [
        { value: 'yes', label: 'สูงขึ้น' },
        { value: 'no', label: 'ไม่เปลี่ยน' },
        { value: 'unclear', label: 'ไม่แน่ใจ' }
      ]
    },
    {
      id: 'q_etco2', label: 'ETCO₂ trend',
      text: 'มองที่ capnograph — ETCO₂ ตกลงเฉียบพลันหรือไม่',
      options: [
        { value: 'yes', label: 'ตกลง' },
        { value: 'no', label: 'ไม่ตก' },
        { value: 'unclear', label: 'ไม่แน่ใจ' }
      ]
    },
    {
      id: 'q_drug', label: 'Recent drug / blood',
      text: 'ย้อนกลับไป 10 นาที — มียา ยาปฏิชีวนะ หรือเลือดที่เพิ่งให้หรือไม่',
      options: [
        { value: 'yes', label: 'มี' },
        { value: 'no', label: 'ไม่มี' },
        { value: 'unsure', label: 'ไม่แน่ใจ' }
      ]
    },
    {
      id: 'q_dbp', label: 'Diastolic pattern',
      text: 'ดูค่าความดัน — diastolic ต่ำผิดส่วนเมื่อเทียบกับ systolic หรือไม่',
      options: [
        { value: 'yes', label: 'ต่ำผิดส่วน' },
        { value: 'no', label: 'ได้สัดส่วน' },
        { value: 'unclear', label: 'ไม่แน่ใจ' }
      ]
    },
    {
      id: 'q_delivery', label: 'Reading / delivery',
      text: 'ตรวจ cuff, transducer และสาย IV — มีเหตุให้สงสัยค่าที่วัดหรือการให้ยาหรือไม่',
      options: [
        { value: 'yes', label: 'สงสัย' },
        { value: 'no', label: 'เชื่อถือได้' },
        { value: 'unclear', label: 'ยังไม่ได้ตรวจ' }
      ]
    }
  ];

  const byId = id => QUESTIONS.find(q => q.id === id);

  /* ---------- Presentation → implied answers --------------
     If the user already told us the presentation, we must not
     ask the same thing again. Selecting "High airway pressure"
     answers q_airway; selecting "Rash / Angioedema" answers
     q_skin. These are locked and shown as "จากอาการที่เลือก".
     ------------------------------------------------------- */

  const PRESENTATION_IMPLIES = {
    'high-airway-pressure': { q_airway: 'yes' },
    'rash-angioedema':      { q_skin: 'yes' },
    'tachy-arrhythmia':     { q_rhythm: 'yes' },
    'bradycardia':          { q_rhythm: 'yes', q_rhythm_type: 'brady' },
    'hypoxemia':            { q_etco2: 'unclear' },
    'hypotension':          {}
  };

  function impliedAnswers(presentationId) {
    return Object.assign({}, PRESENTATION_IMPLIES[presentationId] || {});
  }

  function isImplied(presentationId, questionId) {
    return Object.prototype.hasOwnProperty.call(PRESENTATION_IMPLIES[presentationId] || {}, questionId);
  }


  /** Questions whose branch conditions are currently satisfied. */
  function applicable(answers) {
    return QUESTIONS.filter(q => !q.when || q.when(answers || {}));
  }

  function unanswered(answers) {
    const a = answers || {};
    return applicable(a).filter(q => a[q.id] === undefined);
  }

  /* ---------- Information gain ----------------------------
     "Which question would most change my mind?"
     For each candidate we simulate every answer, then measure
     how far apart the resulting score vectors are (mean
     pairwise L1 distance). The most discriminating question
     wins. This replaces the fixed question order.
     ------------------------------------------------------- */

  function l1(a, b) {
    let d = 0;
    Object.keys(a).forEach(k => { d += Math.abs(a[k] - (b[k] || 0)); });
    return d;
  }

  function informationGain(question, state) {
    const vectors = question.options.map(opt => {
      const trial = Object.assign({}, state.answers, { [question.id]: opt.value });
      return Clinical.scoreVector(trial, state.responseDeltas);
    });

    let total = 0, pairs = 0;
    for (let i = 0; i < vectors.length; i++) {
      for (let j = i + 1; j < vectors.length; j++) {
        total += l1(vectors[i], vectors[j]);
        pairs++;
      }
    }
    return pairs ? total / pairs : 0;
  }

  /**
   * The single next question to show, or null when the useful
   * set is exhausted. Branch questions get a small priority
   * bonus so an opened branch is finished before jumping away.
   */
  function nextQuestion(state) {
    const pending = unanswered(state.answers);
    if (!pending.length) return null;

    let best = null, bestGain = -Infinity;
    pending.forEach(q => {
      let gain = informationGain(q, state);
      // Finish the deepest open branch before jumping back out:
      // a question two levels into the AF branch outranks a
      // sibling that only depends on the rhythm question.
      gain += (q.depth || 0) * 1.5;
      if (gain > bestGain) { bestGain = gain; best = q; }
    });

    return bestGain <= 0.05 ? null : best;
  }

  function answeredList(answers) {
    return Object.keys(answers || {})
      .map(id => {
        const q = byId(id);
        if (!q) return null;
        const opt = q.options.find(o => o.value === answers[id]);
        return { id, label: q.label, text: q.text, value: answers[id], valueLabel: opt ? opt.label : answers[id], options: q.options };
      })
      .filter(Boolean);
  }

  /** Drop answers whose branch is no longer reachable (after an edit). */
  function pruneOrphans(answers) {
    const out = Object.assign({}, answers);
    let changed = true;
    while (changed) {
      changed = false;
      Object.keys(out).forEach(id => {
        const q = byId(id);
        if (q && q.when && !q.when(out)) { delete out[id]; changed = true; }
      });
    }
    return out;
  }

  return { QUESTIONS, PRESENTATION_IMPLIES, byId, applicable, unanswered, nextQuestion, informationGain, answeredList, pruneOrphans, impliedAnswers, isImplied };
});
