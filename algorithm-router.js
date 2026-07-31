/* ============================================================
   algorithm-router.js — Anesthculator v0.72
   Owns: which contextual algorithm opens for the current
   picture, and what interventions that algorithm offers.

   SAFETY: pathways direct attention and defer to the approved
   local protocol. No drug names, doses or rates are encoded
   here by design — those require clinician review, evidence
   reconciliation and institutional approval first.
   ============================================================ */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.AnesthAlgorithms = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const ALGORITHMS = {
    'perioperative-af': {
      id: 'perioperative-af',
      label: 'Perioperative AF',
      dx: 'arrhythmia',
      // context(answers) tailors the pathway to the branch answers
      build(a) {
        const unstable = a.q_af_stability === 'unstable';
        const fast = a.q_af_rate === 'fast' || a.q_af_rate === 'moderate';
        const trigger = a.q_af_trigger;

        const steps = [
          'ยืนยัน rhythm กับ pulse จริง ไม่ดูจากตัวเลขอย่างเดียว',
          'ประเมินว่า AF เป็นสาเหตุของความดันต่ำ หรือเป็นผลตามมา'
        ];
        if (trigger === 'volume') steps.push('แก้ volume status ก่อน — AF ที่เกิดจาก hypovolemia มักไม่ตอบสนองต่อ rate control');
        if (trigger === 'hypoxia') steps.push('ตรวจ oxygenation และ ventilation ก่อนมุ่งไปที่ rhythm');
        if (trigger === 'light') steps.push('ทบทวน anesthetic depth และ analgesia');
        if (trigger === 'electrolyte') steps.push('ส่งตรวจและแก้ electrolyte ตาม protocol');

        const interventions = [];
        if (unstable) {
          interventions.push({
            id: 'af-cardioversion',
            title: 'Synchronized cardioversion pathway',
            detail: 'ตาม ACLS / perioperative protocol ของสถาบัน พร้อมทีมและ airway ที่ปลอดภัย',
            targetDx: 'arrhythmia'
          });
        } else {
          interventions.push({
            id: 'af-triggers',
            title: 'แก้ reversible trigger ก่อน',
            detail: 'volume, oxygenation, depth/pain, electrolyte — ตามที่ประเมินไว้ข้างต้น',
            targetDx: trigger === 'volume' ? 'hypovolemia' : 'arrhythmia'
          });
          if (fast) {
            interventions.push({
              id: 'af-rate-control',
              title: 'Rate-control pathway',
              detail: 'เลือกยาและขนาดตาม hemodynamics, โรคร่วม และ local protocol',
              targetDx: 'arrhythmia'
            });
          }
        }
        interventions.push({
          id: 'af-support',
          title: 'ประคอง hemodynamics ต่อเนื่อง',
          detail: 'อย่าหยุดรักษาความดันต่ำระหว่างที่กำลังแยก rhythm',
          targetDx: 'vasodilation'
        });

        return { steps, interventions };
      }
    },

    anaphylaxis: {
      id: 'anaphylaxis',
      label: 'Perioperative anaphylaxis',
      dx: 'anaphylaxis',
      build(a) {
        const steps = [
          'หยุดสิ่งที่สงสัยว่าเป็นตัวกระตุ้น และขอความช่วยเหลือทันที',
          'รักษาตาม approved anaphylaxis protocol ของสถาบัน',
          'ประเมิน airway pressure, ผิวหนัง และ perfusion ซ้ำ'
        ];
        if (a.q_skin === 'covered') steps.push('ผิวหนังปกติหรือมองไม่เห็น ไม่ตัด anaphylaxis ออก');
        return {
          steps,
          interventions: [
            { id: 'ana-protocol', title: 'เปิด anaphylaxis protocol', detail: 'ดำเนินการตาม crisis protocol ของสถาบัน', targetDx: 'anaphylaxis' },
            { id: 'ana-support', title: 'ประคอง circulation ระหว่างรักษา', detail: 'volume และ vasoactive support ตาม physiology', targetDx: 'vasodilation' }
          ]
        };
      }
    },

    hemorrhage: {
      id: 'hemorrhage',
      label: 'Hemorrhage / hypovolemia',
      dx: 'hypovolemia',
      build() {
        return {
          steps: [
            'ถามศัลยแพทย์ตรง ๆ ว่าเสียเลือดเท่าไรและควบคุมได้หรือยัง',
            'ตรวจ suction, swab และ concealed loss',
            'ประเมิน fluid responsiveness แทนการให้สารน้ำแบบเหมารวม'
          ],
          interventions: [
            { id: 'hem-source', title: 'Source control', detail: 'ประสานศัลยแพทย์เพื่อหยุดจุดเลือดออก', targetDx: 'hypovolemia' },
            { id: 'hem-volume', title: 'Volume resuscitation', detail: 'ตาม fluid responsiveness และ massive transfusion protocol เมื่อมีข้อบ่งชี้', targetDx: 'hypovolemia' }
          ]
        };
      }
    },

    vasoplegia: {
      id: 'vasoplegia',
      label: 'Vasodilation / low SVR',
      dx: 'vasodilation',
      build() {
        return {
          steps: [
            'ทบทวน anesthetic depth และยาที่เพิ่งให้',
            'พิจารณา neuraxial sympathectomy, vasoplegia หรือ sepsis',
            'มองหา anaphylaxis แม้ยังไม่มีผื่น'
          ],
          interventions: [
            { id: 'vaso-depth', title: 'ปรับ anesthetic depth', detail: 'ลดสิ่งที่ทำให้หลอดเลือดขยายเท่าที่ปลอดภัย', targetDx: 'vasodilation' },
            { id: 'vaso-pressor', title: 'Vasopressor support', detail: 'เลือกตาม physiology และ local protocol', targetDx: 'vasodilation' }
          ]
        };
      }
    },

    obstruction: {
      id: 'obstruction',
      label: 'Obstructive physiology',
      dx: 'obstruction',
      build() {
        return {
          steps: [
            'ดู ETCO₂ trend, SpO₂ และ airway pressure ร่วมกัน',
            'พิจารณา tension pneumothorax, embolism, tamponade',
            'ใช้ FOCUS/echo เมื่อพร้อมและไม่ทำให้การกู้ชีพล่าช้า'
          ],
          interventions: [
            { id: 'obs-decompress', title: 'แก้สาเหตุอุดกั้นที่พบ', detail: 'ตาม crisis protocol ของภาวะนั้น ๆ', targetDx: 'obstruction' },
            { id: 'obs-support', title: 'ประคองระหว่างค้นหาสาเหตุ', detail: 'ปรับ ventilation และ circulation ตาม physiology', targetDx: 'obstruction' }
          ]
        };
      }
    },

    'pump-failure': {
      id: 'pump-failure',
      label: 'Pump failure / ischemia',
      dx: 'pump-failure',
      build() {
        return {
          steps: [
            'ตรวจ ECG 12-lead และ rhythm',
            'ใช้ focused cardiac ultrasound เมื่อทำได้',
            'ประเมิน filling, contractility และ afterload แยกกัน'
          ],
          interventions: [
            { id: 'pump-inotropy', title: 'Support contractility', detail: 'ตาม physiology ที่ประเมินได้ และ local protocol', targetDx: 'pump-failure' },
            { id: 'pump-ischemia', title: 'จัดการ ischemia', detail: 'ปรับ oxygen supply–demand และปรึกษาทีมหัวใจ', targetDx: 'pump-failure' }
          ]
        };
      }
    },

    measurement: {
      id: 'measurement',
      label: 'Measurement / delivery check',
      dx: 'measurement',
      build() {
        return {
          steps: [
            'วัดซ้ำด้วยวิธีอื่น และเทียบกับชีพจรที่คลำได้',
            'ตรวจ transducer level, zero และ cuff size',
            'ตรวจ IV patency และว่ายาเข้าผู้ป่วยจริงหรือไม่'
          ],
          interventions: [
            { id: 'meas-recheck', title: 'ยืนยันค่าที่วัด', detail: 'วัดซ้ำและเทียบกับ perfusion ที่เห็น', targetDx: 'measurement' },
            { id: 'meas-line', title: 'ตรวจ IV / drug delivery', detail: 'ยืนยันว่ายาถึงผู้ป่วยจริง', targetDx: 'measurement' }
          ]
        };
      }
    }
  };

  /* Diagnosis → algorithm. Rhythm subtype refines the choice. */
  const DX_TO_ALGORITHM = {
    arrhythmia: 'perioperative-af',
    anaphylaxis: 'anaphylaxis',
    hypovolemia: 'hemorrhage',
    vasodilation: 'vasoplegia',
    obstruction: 'obstruction',
    'pump-failure': 'pump-failure',
    measurement: 'measurement'
  };

  /**
   * Pick the algorithm for the current picture.
   * @returns {object|null} { id, label, steps, interventions }
   */
  function route(topDx, answers) {
    const a = answers || {};
    if (!topDx) return null;

    let key = DX_TO_ALGORITHM[topDx];

    // Rhythm branch: only open the AF pathway when it is AF.
    if (topDx === 'arrhythmia' && a.q_rhythm_type !== 'af') {
      if (a.q_rhythm_type === undefined || a.q_rhythm_type === 'uncertain') return null;
      key = null;   // other rhythms route to Crisis, not an AF pathway
    }
    if (!key) return null;

    const algo = ALGORITHMS[key];
    if (!algo) return null;

    const built = algo.build(a);
    return { id: algo.id, label: algo.label, dx: algo.dx, steps: built.steps, interventions: built.interventions };
  }

  /** Related Crisis protocol names for the current picture. */
  function crisisLinks(topDx, answers) {
    const a = answers || {};
    const links = [];
    if (topDx === 'anaphylaxis') links.push('Anaphylaxis');
    if (topDx === 'hypovolemia') links.push('Hemorrhage');
    if (a.q_rhythm_type === 'vt') links.push('Perioperative Cardiac Arrest');
    if (a.q_rhythm_type === 'brady') links.push('Bradycardia');
    if (topDx === 'vasodilation') links.push('LAST');
    return links;
  }

  return { ALGORITHMS, route, crisisLinks };
});
