/* ============================================================
   response-engine.js — Anesthculator v0.72
   Owns: the Action → Response → Reinterpret loop.

   Core rule of this sprint: an intervention never ends the
   reasoning. Every intervention that is marked as given MUST
   produce a response assessment, and the response feeds back
   into the ranking.

   Worked example from the brief:
     AF treated → HR improved but MAP still low
     → AF is demoted to CONTRIBUTOR, not primary
     → weight shifts toward hypovolemia / vasodilation / pump
   ============================================================ */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.AnesthResponse = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  /* ---------- Response states -----------------------------
     demote  : how much the treated diagnosis loses
     shift   : boost applied to the remaining circulatory causes
     role    : role assigned to the treated diagnosis
     ------------------------------------------------------- */

  const RESPONSES = [
    {
      id: 'map_hr_improved',
      label: 'ดีขึ้นทั้ง MAP และ HR',
      detail: 'การรักษาน่าจะตรงกับกลไกหลัก',
      demote: 0,
      confirm: 2,
      shift: {},
      role: 'primary'
    },
    {
      id: 'hr_improved_map_low',
      label: 'HR ดีขึ้น แต่ MAP ยังต่ำ',
      detail: 'กลไกที่รักษาน่าจะเป็นตัวร่วม ไม่ใช่สาเหตุหลัก',
      demote: 4,
      confirm: 0,
      shift: { hypovolemia: 2.5, vasodilation: 2.5, 'pump-failure': 1.5 },
      role: 'contributor'
    },
    {
      id: 'map_improved_hr_same',
      label: 'MAP ดีขึ้น แต่ HR เท่าเดิม',
      detail: 'ประคองได้ผล แต่ตัวกระตุ้นยังอยู่',
      demote: 1,
      confirm: 0,
      shift: { hypovolemia: 1.5, vasodilation: 1 },
      role: 'contributor'
    },
    {
      id: 'no_change',
      label: 'ไม่เปลี่ยนแปลง',
      detail: 'ทบทวน diagnosis, ความเพียงพอของการรักษา และ delivery',
      demote: 3,
      confirm: 0,
      shift: { hypovolemia: 1.5, vasodilation: 1.5, measurement: 2, obstruction: 1 },
      role: 'contributor'
    },
    {
      id: 'worse',
      label: 'แย่ลง / ไม่มั่นคงมากขึ้น',
      detail: 'ขอความช่วยเหลือเพิ่มทันที และทบทวนสาเหตุที่แก้ไขได้',
      demote: 2,
      confirm: 0,
      shift: { obstruction: 3, hypovolemia: 2, anaphylaxis: 2, 'pump-failure': 2 },
      role: 'contributor'
    }
  ];

  const byId = id => RESPONSES.find(r => r.id === id);

  /**
   * Convert the recorded interventions into score deltas.
   * @param {Array} interventions [{ id, title, targetDx, given, response }]
   * @returns {Array} [{ id, deltas }] consumable by clinical-engine
   */
  function deltasFrom(interventions) {
    const out = [];
    (interventions || []).forEach(iv => {
      if (!iv.response) return;
      const r = byId(iv.response);
      if (!r) return;

      const deltas = {};
      if (iv.targetDx) {
        if (r.demote) deltas[iv.targetDx] = -(r.demote);
        if (r.confirm) deltas[iv.targetDx] = (deltas[iv.targetDx] || 0) + r.confirm;
      }
      Object.entries(r.shift).forEach(([dx, v]) => {
        if (dx === iv.targetDx) return;   // never boost what we just demoted
        deltas[dx] = (deltas[dx] || 0) + v;
      });

      out.push({ id: iv.id, deltas });
    });
    return out;
  }

  /** Roles assigned by the responses so far, e.g. { arrhythmia: 'contributor' }. */
  function rolesFrom(interventions) {
    const roles = {};
    (interventions || []).forEach(iv => {
      if (!iv.response || !iv.targetDx) return;
      const r = byId(iv.response);
      if (r && r.role) roles[iv.targetDx] = r.role;
    });
    return roles;
  }

  /** An intervention marked given but not yet assessed blocks progress. */
  function awaitingAssessment(interventions) {
    return (interventions || []).find(iv => iv.given && !iv.response) || null;
  }

  return { RESPONSES, byId, deltasFrom, rolesFrom, awaitingAssessment };
});
