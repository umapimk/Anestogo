/* Smoke test: extracts the v0.72 mentor render block from app.js and
   drives a full case end-to-end with a minimal DOM stub.
   Verifies the layout order and the Action→Response→Reinterpret loop. */
const fs = require('fs');
const assert = require('assert');

global.window = global;
global.AnesthClinical = require('./engines/clinical-engine.js');
global.AnesthQuestions = require('./engines/question-engine.js');
global.AnesthResponse = require('./engines/response-engine.js');
global.AnesthAlgorithms = require('./engines/algorithm-router.js');
global.AnesthMentor = require('./engines/mentor-engine.js');

// minimal DOM stub
const listeners = {};
global.document = {
  addEventListener: (t, fn) => { (listeners[t] = listeners[t] || []).push(fn); },
  getElementById: () => null
};
global.renderHypotension = () => {};   // render is a no-op in this harness

const src = fs.readFileSync('./app.js', 'utf8');
const start = src.indexOf('/* ===== v0.72 Senior Mentor Mode');
const end = src.indexOf('\nconst mechanismData={');
assert.ok(start > -1 && end > start, 'mentor block not found in app.js');
// `let fastCase` is scoped to the eval, so expose accessors from inside it.
eval(src.slice(start, end) + `
  global.__getCase = () => fastCase;
  global.__setCase = c => { fastCase = c; };
`);

let pass = 0;
const t = (n, fn) => { fn(); pass++; console.log('  ok  ' + n); };

console.log('v0.72 mentor UI');

t('renders without an engine error', () => {
  assert.ok(!fastReasoningHTML().includes('reasoningError'));
});

t('sections appear in the order required by the brief', () => {
  const html = fastReasoningHTML();
  const order = ['mBar', 'CURRENT PRIORITY', 'IMMEDIATE ACTIONS', 'NEXT BEST QUESTION',
                 'LEADING CAUSES', 'NEXT ACTION'];
  let last = -1;
  order.forEach(label => {
    const i = html.indexOf(label);
    assert.ok(i > last, label + ' out of order');
    last = i;
  });
});

t('exactly one priority and one question are shown', () => {
  const html = fastReasoningHTML();
  assert.strictEqual((html.match(/CURRENT PRIORITY/g) || []).length, 1);
  assert.strictEqual((html.match(/NEXT BEST QUESTION/g) || []).length, 1);
  assert.strictEqual((html.match(/class="mAsk"/g) || []).length, 1);
});

t('no version badge or foundation badge remains', () => {
  const html = fastReasoningHTML();
  assert.ok(!/v0\.7\d|FOUNDATION/i.test(html), 'version badge still present');
});

t('immediate actions are available before any question is answered', () => {
  assert.ok(fastReasoningHTML().includes('data-fast-action="act-help"'));
});

t('tap toggles an action to done', () => {
  fastSetAction('act-help', 'done');
  assert.ok(fastReasoningHTML().includes('class="mAction done"'));
});

t('swipe-left defers without any dialog', () => {
  fastSetAction('act-verify', 'deferred');
  assert.ok(fastReasoningHTML().includes('mAction deferred'));
});

t('FULL FLOW: rhythm → AF branch → algorithm → intervention → response', () => {
  fastAnswer('q_rhythm', 'yes');
  fastAnswer('q_rhythm_type', 'af');
  fastAnswer('q_af_stability', 'unstable');
  fastAnswer('q_af_rate', 'fast');

  let ctx = fastContext();
  assert.strictEqual(ctx.algorithm.id, 'perioperative-af', 'AF pathway should open');
  assert.ok(fastReasoningHTML().includes('Synchronized cardioversion pathway'));

  const iv = ctx.algorithm.interventions[0];
  fastPickIntervention(iv.id);
  ctx = fastContext();
  assert.ok(ctx.activeIntervention, 'intervention should be active');
  assert.ok(fastReasoningHTML().includes('data-fast-given'));

  fastMarkGiven(ctx.activeIntervention.id);
  ctx = fastContext();
  assert.ok(ctx.awaiting, 'response assessment must be demanded');

  const html = fastReasoningHTML();
  assert.ok(html.includes('RESPONSE ASSESSMENT'));
  assert.ok(!html.includes('NEXT BEST QUESTION'), 'questions pause until response is recorded');

  const before = ctx.evaluation.top.id;
  fastRecordResponse('hr_improved_map_low');
  const after = fastContext();
  assert.notStrictEqual(after.evaluation.top.id, before, 'ranking must change after response');
  assert.ok(fastReasoningHTML().includes('contributor'), 'AF should be labelled contributor');
});

t('reasoning never dead-ends after a treatment recommendation', () => {
  const ctx = fastContext();
  assert.ok(ctx.question || ctx.algorithm, 'there is always a next move');
});

t('timeline records answers, actions, responses and diagnosis updates', () => {
  const types = new Set(__getCase().timeline.map(i => i.type));
  ['action', 'answer', 'plan', 'response', 'diagnosis'].forEach(k =>
    assert.ok(types.has(k), 'missing timeline type: ' + k));
});

t('corrections are logged distinctly from first answers', () => {
  fastAnswer('q_af_rate', 'slow');
  assert.ok(__getCase().timeline.some(i => i.type === 'correction'));
});

t('editing rhythm to "no" prunes the AF branch answers', () => {
  fastAnswer('q_rhythm', 'no');
  assert.ok(!('q_rhythm_type' in __getCase().answers));
  assert.ok(!('q_af_rate' in __getCase().answers));
});

t('answered list stays editable', () => {
  assert.ok(fastReasoningHTML().includes('data-fast-edit='));
});

t('reset clears the case', () => {
  __setCase({ answers: {}, actions: {}, interventions: [], timeline: [] });
  assert.strictEqual(Object.keys(__getCase().answers).length, 0);
  assert.ok(!fastReasoningHTML().includes('ANSWERED SO FAR'));
});


t('SPEC 1: mentor bar speaks in the first person and points where to look', () => {
  __setCase({ presentation: 'hypotension', answers: {}, implied: {}, actions: {}, interventions: [], timeline: [] });
  let html = fastReasoningHTML();
  assert.ok(html.includes('class="mBar'), 'mentor bar missing');
  fastAnswer('q_field', 'yes');
  html = fastReasoningHTML();
  const bar = html.slice(html.indexOf('class="mBar'), html.indexOf('</section>'));
  assert.ok(/ผม/.test(bar), 'mentor bar should speak in first person');
  assert.ok(/ดู|ตรวจ|เปิด|ย้อน/.test(bar), 'mentor bar should direct attention');
});

t('SPEC 2: working hypothesis is named, not "diagnosis"', () => {
  const html = fastReasoningHTML();
  assert.ok(html.includes('Working hypothesis'));
  assert.ok(!/>\s*Diagnosis\s*</i.test(html));
});

t('SPEC 3: selecting High airway pressure never re-asks peak airway pressure', () => {
  __setCase({ presentation: 'hypotension', answers: {}, implied: {}, actions: {}, interventions: [], timeline: [] });
  fastSetPresentation('high-airway-pressure');
  assert.strictEqual(__getCase().answers.q_airway, 'yes');
  for (let i = 0; i < 14; i++) {
    const ctx = fastContext();
    if (!ctx.question) break;
    assert.notStrictEqual(ctx.question.id, 'q_airway', 'peak airway pressure asked twice');
    fastAnswer(ctx.question.id, ctx.question.options[0].value);
  }
});

t('SPEC 3b: selecting Rash never re-asks whether rash exists', () => {
  __setCase({ presentation: 'hypotension', answers: {}, implied: {}, actions: {}, interventions: [], timeline: [] });
  fastSetPresentation('rash-angioedema');
  assert.strictEqual(__getCase().answers.q_skin, 'yes');
  const ctx = fastContext();
  assert.notStrictEqual(ctx.question && ctx.question.id, 'q_skin');
});

t('SPEC 3c: bradycardia presentation enters the rhythm branch immediately', () => {
  __setCase({ presentation: 'hypotension', answers: {}, implied: {}, actions: {}, interventions: [], timeline: [] });
  fastSetPresentation('bradycardia');
  const a = __getCase().answers;
  assert.strictEqual(a.q_rhythm, 'yes');
  assert.strictEqual(a.q_rhythm_type, 'brady');
});

t('SPEC 4: implied answers are labelled as coming from the presentation', () => {
  assert.ok(fastReasoningHTML().includes('จากอาการที่เลือก'));
});

t('SPEC 5: no free-text input anywhere in Fast Mode', () => {
  const html = fastReasoningHTML();
  assert.ok(!/<input|<textarea|type="search"/i.test(html), 'Fast Mode must be keyboard-free');
});

t('SPEC 6: no Save or Next buttons', () => {
  const html = fastReasoningHTML();
  assert.ok(!/>\s*(Save|บันทึก|Next|ถัดไป)\s*</i.test(html));
});

t('SPEC 7: all nine sections present once a case is under way', () => {
  __setCase({ presentation: 'hypotension', answers: {}, implied: {}, actions: {}, interventions: [], timeline: [] });
  fastAnswer('q_rhythm', 'yes');
  fastAnswer('q_rhythm_type', 'af');
  fastAnswer('q_af_stability', 'unstable');
  let ctx = fastContext();
  fastPickIntervention(ctx.algorithm.interventions[0].id);
  fastMarkGiven(fastContext().activeIntervention.id);
  const html = fastReasoningHTML();
  ['mBar', 'CURRENT PRIORITY', 'IMMEDIATE ACTIONS', 'LEADING CAUSES',
   'NEXT ACTION', 'RESPONSE ASSESSMENT', 'CONTINUOUS REASSESSMENT', 'TIMELINE']
    .forEach(k => assert.ok(html.includes(k), 'missing section: ' + k));
});

console.log('\n' + pass + ' passed');
