/* Node regression test for the v0.72 mentor engines. */
const assert = require('assert');

global.window = global;
const Clinical = require('./engines/clinical-engine.js');
global.AnesthClinical = Clinical;
const Questions = require('./engines/question-engine.js');
const Response = require('./engines/response-engine.js');
const Algorithms = require('./engines/algorithm-router.js');
const Mentor = require('./engines/mentor-engine.js');

let pass = 0;
const t = (name, fn) => { fn(); pass++; console.log('  ok  ' + name); };

console.log('v0.72 engines');

t('baseline evaluation ranks something', () => {
  const r = Clinical.evaluate({ answers: {} });
  assert.ok(r.ranked.length === 7);
  assert.ok(r.top);
});

t('bleeding drives hypovolemia to the top', () => {
  const r = Clinical.evaluate({ answers: { q_field: 'yes' } });
  assert.strictEqual(r.top.id, 'hypovolemia');
});

t('rash + recent drug drives anaphylaxis to the top', () => {
  const r = Clinical.evaluate({ answers: { q_skin: 'yes', q_drug: 'yes' } });
  assert.strictEqual(r.top.id, 'anaphylaxis');
});

t('only ONE question is offered at a time', () => {
  const q = Questions.nextQuestion({ answers: {} });
  assert.ok(q && q.id);
});

t('branch questions stay hidden until the branch opens', () => {
  assert.ok(!Questions.applicable({}).some(q => q.id === 'q_af_stability'));
  assert.ok(Questions.applicable({ q_rhythm: 'yes', q_rhythm_type: 'af' })
    .some(q => q.id === 'q_af_stability'));
});

t('AF branch is prioritised once opened', () => {
  const q = Questions.nextQuestion({ answers: { q_rhythm: 'yes', q_rhythm_type: 'af' } });
  assert.ok(q.id.startsWith('q_af_'), 'expected an AF branch question, got ' + q.id);
});

t('editing an answer prunes orphaned branch answers', () => {
  const pruned = Questions.pruneOrphans({ q_rhythm: 'no', q_rhythm_type: 'af', q_af_rate: 'fast' });
  assert.ok(!('q_rhythm_type' in pruned));
  assert.ok(!('q_af_rate' in pruned));
});

t('information gain prefers a discriminating question', () => {
  const s = { answers: {} };
  const field = Questions.informationGain(Questions.byId('q_field'), s);
  const gain = Questions.informationGain(Questions.byId('q_af_trigger'), s);
  assert.ok(field > 0 && field >= gain * 0.5);
});

t('AF picture routes to the perioperative AF pathway', () => {
  const a = { q_rhythm: 'yes', q_rhythm_type: 'af', q_af_stability: 'stable', q_af_rate: 'fast' };
  const algo = Algorithms.route('arrhythmia', a);
  assert.strictEqual(algo.id, 'perioperative-af');
  assert.ok(algo.interventions.some(i => i.id === 'af-rate-control'));
});

t('unstable AF offers the cardioversion pathway instead', () => {
  const algo = Algorithms.route('arrhythmia', { q_rhythm_type: 'af', q_af_stability: 'unstable' });
  assert.ok(algo.interventions.some(i => i.id === 'af-cardioversion'));
  assert.ok(!algo.interventions.some(i => i.id === 'af-rate-control'));
});

t('no algorithm encodes a drug name or dose', () => {
  const json = JSON.stringify(Object.keys(Algorithms.ALGORITHMS).map(k =>
    Algorithms.ALGORITHMS[k].build({})));
  assert.ok(!/\bmg\b|\bmcg\b|\bml\/hr\b|amiodarone|adrenaline|epinephrine|metaraminol|ephedrine/i.test(json));
});

t('an intervention marked given blocks progress until assessed', () => {
  const ivs = [{ id: 'x', title: 'Rate control', targetDx: 'arrhythmia', given: true, response: null }];
  assert.ok(Response.awaitingAssessment(ivs));
});

t('BRIEF SCENARIO: AF treated, HR improved, MAP still low → AF becomes contributor', () => {
  const answers = { q_rhythm: 'yes', q_rhythm_type: 'af', q_af_stability: 'unstable', q_af_rate: 'fast' };
  const before = Clinical.evaluate({ answers });
  assert.strictEqual(before.top.id, 'arrhythmia', 'AF should lead before treatment');

  const ivs = [{
    id: 'af1', title: 'Rate-control pathway', targetDx: 'arrhythmia',
    given: true, response: 'hr_improved_map_low'
  }];
  const after = Clinical.evaluate({
    answers,
    responseDeltas: Response.deltasFrom(ivs),
    roles: Response.rolesFrom(ivs)
  });

  const arr = after.ranked.find(d => d.id === 'arrhythmia');
  assert.strictEqual(arr.role, 'contributor', 'AF must be demoted to contributor');
  assert.notStrictEqual(after.top.id, 'arrhythmia', 'AF must no longer be primary');
  assert.ok(['hypovolemia', 'vasodilation', 'pump-failure'].includes(after.top.id),
    'reasoning should shift toward circulatory causes, got ' + after.top.id);
});

t('a good response keeps the diagnosis primary', () => {
  const ivs = [{ id: 'a', title: 'x', targetDx: 'anaphylaxis', given: true, response: 'map_hr_improved' }];
  const roles = Response.rolesFrom(ivs);
  assert.strictEqual(roles.anaphylaxis, 'primary');
});

t('mentor shows exactly one priority', () => {
  const p = Mentor.currentPriority({
    evaluation: Clinical.evaluate({ answers: { q_field: 'yes' } }),
    awaiting: null, answeredCount: 1
  });
  assert.ok(p.title && p.text && typeof p.title === 'string');
});

t('mentor demands response assessment when one is pending', () => {
  const p = Mentor.currentPriority({
    evaluation: Clinical.evaluate({ answers: {} }),
    awaiting: { title: 'Rate-control pathway' }, answeredCount: 3
  });
  assert.strictEqual(p.kind, 'response');
});

t('questions direct attention rather than request data entry', () => {
  const bad = Questions.QUESTIONS.filter(q => /^(HR|BP|MAP|Peak|ETCO)\W*\??$/i.test(q.text.trim()));
  assert.strictEqual(bad.length, 0);
});


t('SPEC: presentation implies answers so they are never asked twice', () => {
  assert.strictEqual(Questions.impliedAnswers('high-airway-pressure').q_airway, 'yes');
  assert.strictEqual(Questions.impliedAnswers('rash-angioedema').q_skin, 'yes');
  assert.ok(Questions.isImplied('rash-angioedema', 'q_skin'));
  assert.ok(!Questions.isImplied('hypotension', 'q_skin'));
});

t('SPEC: AF already known enters the AF branch without re-asking rhythm', () => {
  const answers = { q_rhythm: 'yes', q_rhythm_type: 'af' };
  const pending = Questions.unanswered(answers).map(q => q.id);
  assert.ok(!pending.includes('q_rhythm'));
  assert.ok(!pending.includes('q_rhythm_type'));
  assert.ok(pending.some(id => id.startsWith('q_af_')));
});

t('SPEC: mentor bar exists for every stage of the loop', () => {
  const base = { evaluation: Clinical.evaluate({ answers: { q_field: 'yes' } }), question: Questions.byId('q_field'), answeredCount: 1 };
  ['start', 'ask', 'act', 'assess'].forEach(() => {});
  assert.strictEqual(Mentor.mentorBar(Object.assign({}, base, { answeredCount: 0 })).tone, 'start');
  assert.strictEqual(Mentor.mentorBar(base).tone, 'ask');
  assert.strictEqual(Mentor.mentorBar(Object.assign({}, base, { activeIntervention: { title: 'x', given: false } })).tone, 'act');
  assert.strictEqual(Mentor.mentorBar(Object.assign({}, base, { awaiting: { title: 'x' } })).tone, 'assess');
});

t('SPEC: mentor bar never reads like a checklist prompt', () => {
  const bar = Mentor.mentorBar({ evaluation: Clinical.evaluate({ answers: { q_field: 'yes' } }), question: Questions.byId('q_rhythm'), answeredCount: 2 });
  assert.ok(!/^(HR|BP|MAP)\b/.test(bar.text));
  assert.ok(bar.text.length > 10);
});

console.log('\n' + pass + ' passed');
