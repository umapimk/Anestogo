/* ============================================================
   mentor-engine.js — Anesthculator v0.72
   Owns: the voice. Turns engine state into what a senior
   anesthesiologist standing beside you would actually say.

   Rules of the voice:
     - exactly ONE current priority, never a checklist
     - direct attention ("มองที่ monitor"), never request data entry
     - after an intervention, always ask for the response
   ============================================================ */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.AnesthMentor = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  /* Immediate actions are stable and always available — treat
     first, reason second. They are not gated behind answers. */
  const IMMEDIATE_ACTIONS = [
    { id: 'act-help',   title: 'ขอความช่วยเหลือ',        detail: 'บอกทีมว่ากำลังเกิดอะไร และมอบหมายหน้าที่' },
    { id: 'act-verify', title: 'ยืนยันค่าความดัน',       detail: 'วัดซ้ำหรือดู waveform เทียบกับชีพจรที่คลำได้' },
    { id: 'act-oxy',    title: 'ดู airway และ oxygenation', detail: 'ประเมินพร้อมกับการประคองระบบไหลเวียน' },
    { id: 'act-access', title: 'ตรวจ IV และการให้ยา',    detail: 'ยืนยันว่าสารน้ำและยาถึงผู้ป่วยจริง' }
  ];

  const DX_PRIORITY = {
    hypovolemia:   { title: 'หยุดการเสียเลือดและเติม volume', text: 'จัดการที่ต้นทางก่อน แล้วประเมินการตอบสนองซ้ำ' },
    vasodilation:  { title: 'ประคองระบบไหลเวียนและลด vasodilation ที่แก้ไขได้', text: 'ทบทวน depth และยาที่เพิ่งให้ ระหว่างที่ยังประคองความดัน' },
    anaphylaxis:   { title: 'รักษา perioperative anaphylaxis ทันที', text: 'หยุดตัวกระตุ้น ขอความช่วยเหลือ และเปิด protocol ของสถาบัน' },
    'pump-failure': { title: 'ประเมินการบีบตัวของหัวใจอย่างเร่งด่วน', text: 'ยืนยัน rhythm และ ischemia แล้วประคองตาม physiology' },
    obstruction:   { title: 'ตัดสาเหตุอุดกั้นออกให้ได้ตอนนี้', text: 'ดู ETCO₂, airway pressure และบริบทการผ่าตัดร่วมกัน' },
    arrhythmia:    { title: 'แยกให้ชัดว่า rhythm เป็นเหตุหรือเป็นผล', text: 'ยืนยันจังหวะกับชีพจรจริง โดยไม่หยุดประคองความดัน' },
    measurement:   { title: 'ยืนยันว่าค่าที่เห็นเป็นของจริง', text: 'วัดซ้ำและตรวจการให้ยา ก่อนจะไล่ตามสาเหตุอื่น' }
  };


  /* ---------- Mentor Bar ----------------------------------
     The conversational line at the top of the screen. This is
     the senior standing beside the user, not a status label.
     It always says WHY we are looking where we are looking.
     ------------------------------------------------------- */

  const DX_CONCERN = {
    hypovolemia:    'ผมกังวลเรื่องเลือดออกมากที่สุด',
    vasodilation:   'ผมคิดว่าหลอดเลือดขยายมากที่สุด',
    anaphylaxis:    'ผมกังวลเรื่อง anaphylaxis',
    'pump-failure': 'ผมกังวลว่าหัวใจบีบตัวไม่ไหว',
    obstruction:    'ผมกังวลว่ามีอะไรอุดกั้นการไหลเวียน',
    arrhythmia:     'ผมกังวลเรื่องจังหวะหัวใจ',
    measurement:    'ผมยังไม่มั่นใจว่าค่าที่เห็นเป็นของจริง'
  };

  const LOOK_HINT = {
    q_field:      'ช่วยดู surgical field ก่อน',
    q_rhythm:     'ดู monitor ต่อ HR เปลี่ยนไหม',
    q_rhythm_type:'ดู ECG trace ว่าเป็นจังหวะอะไร',
    q_skin:       'เปิดผ้าดูผิวหนังผู้ป่วยหน่อย',
    q_airway:     'ดูที่เครื่องช่วยหายใจ',
    q_etco2:      'ดู capnograph',
    q_drug:       'ย้อนดูยาที่เพิ่งให้',
    q_dbp:        'ดูค่า diastolic',
    q_delivery:   'ตรวจ cuff และสาย IV',
    q_ecg:        'ดู ECG ว่ามี ST change ไหม',
    q_af_stability:'ประเมินว่าผู้ป่วยไหวไหมกับ AF นี้',
    q_af_onset:   'AF นี้เพิ่งเกิดหรือมีเดิม',
    q_af_rate:    'ดูอัตราการเต้น ventricular',
    q_af_trigger: 'มองหาว่าอะไรกระตุ้น AF'
  };

  /**
   * One conversational line. Never a status badge.
   * @returns {{ text:string, tone:string }}
   */
  function mentorBar(ctx) {
    const { evaluation, awaiting, question, answeredCount, activeIntervention } = ctx;

    if (awaiting) {
      return { tone: 'assess', text: `หลัง ${awaiting.title} แล้ว ความดันตอบสนองหรือยัง` };
    }
    if (activeIntervention && !activeIntervention.given) {
      return { tone: 'act', text: `ลงมือ ${activeIntervention.title} ได้เลย แล้วบอกผมว่าเปลี่ยนไปยังไง` };
    }
    if (!answeredCount) {
      return { tone: 'start', text: 'ประคองก่อนครับ ขอความช่วยเหลือและยืนยันค่าความดัน แล้วเรามาไล่หาสาเหตุด้วยกัน' };
    }

    const concern = DX_CONCERN[evaluation.top.id] || 'ผมยังไม่ปักใจว่าเป็นอะไร';
    if (question) {
      const hint = LOOK_HINT[question.id] || 'ช่วยดูตรงนี้ให้หน่อย';
      const opener = answeredCount === 1 ? 'ตอนนี้' : 'ดีครับ ตอนนี้';
      return { tone: 'ask', text: `${opener} ${concern} — ${hint}` };
    }
    return { tone: 'ask', text: `${concern} ครับ ถ้าภาพเปลี่ยนเมื่อไหร่ แก้คำตอบได้เลย` };
  }

  /**
   * The one thing to do right now.
   * Order of precedence:
   *   1. an intervention is awaiting response assessment
   *   2. the picture is still ambiguous → keep observing
   *   3. the leading diagnosis drives the priority
   */
  function currentPriority(ctx) {
    const { evaluation, awaiting, answeredCount } = ctx;

    if (awaiting) {
      return {
        kind: 'response',
        title: 'ประเมินการตอบสนองหลัง ' + awaiting.title,
        text: 'ดู MAP, HR, ETCO₂ และ perfusion ตอนนี้ แล้วบอกว่าเปลี่ยนไปอย่างไร'
      };
    }

    if (!answeredCount) {
      return {
        kind: 'stabilize',
        title: 'ประคองก่อน แล้วค่อยหาสาเหตุ',
        text: 'ขอความช่วยเหลือ ยืนยันค่าความดัน และดู airway ไปพร้อมกัน'
      };
    }

    const top = evaluation.top;
    const base = DX_PRIORITY[top.id] || { title: 'ประคองระบบไหลเวียนต่อเนื่อง', text: 'ประเมินซ้ำหลังทุก intervention' };

    if (evaluation.ambiguous) {
      return {
        kind: 'narrow',
        title: base.title,
        text: 'ภาพยังไม่ชัด — ' + base.text + ' และตอบคำถามถัดไปเพื่อแยกให้ได้'
      };
    }

    return { kind: 'treat', title: base.title, text: base.text };
  }

  /**
   * CURRENT PLAN — the concrete next move, derived from the
   * routed algorithm. Never ends at "recommendation given".
   */
  function currentPlan(ctx) {
    const { algorithm, awaiting, activeIntervention } = ctx;

    if (awaiting) {
      return { headline: 'รอผลการตอบสนอง', lines: ['บันทึกการตอบสนองด้านบนก่อน แล้วระบบจะจัดลำดับสาเหตุใหม่'] };
    }
    if (activeIntervention && !activeIntervention.given) {
      return { headline: activeIntervention.title, lines: [activeIntervention.detail, 'เมื่อทำแล้วให้กด mark as given เพื่อประเมินการตอบสนอง'] };
    }
    if (algorithm) {
      return { headline: algorithm.label, lines: algorithm.steps };
    }
    return { headline: 'ยังไม่พอที่จะเลือก pathway', lines: ['ตอบคำถามถัดไปเพื่อให้ระบบเปิด algorithm ที่ตรงกับภาพทางคลินิก'] };
  }

  /** Short mentor line explaining why this question is being asked now. */
  function questionRationale(question, evaluation) {
    if (!question) return 'ชุดคำถามหลักครบแล้ว — แก้คำตอบใดก็ได้เมื่อภาพเปลี่ยน';
    if (evaluation && evaluation.ambiguous) return 'คำถามนี้แยกสาเหตุอันดับต้นได้มากที่สุดตอนนี้';
    return 'ยืนยันภาพที่กำลังนำอยู่';
  }

  return { IMMEDIATE_ACTIONS, DX_PRIORITY, DX_CONCERN, LOOK_HINT, mentorBar, currentPriority, currentPlan, questionRationale };
});
