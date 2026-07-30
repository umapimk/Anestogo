'use strict';
const assert=require('assert');
const {HYPOTENSION_MODEL,evaluate,createCase,recordAction}=require('./clinical-reasoning.js');

let r=evaluate(HYPOTENSION_MODEL,{clues:['bleeding','ppv-high']});
assert.equal(r.top.id,'hypovolemia');
assert.ok(r.nextQuestion);

r=evaluate(HYPOTENSION_MODEL,{clues:['recent-drug','rash-wheeze','dbp-low']});
assert.equal(r.top.id,'anaphylaxis');

r=evaluate(HYPOTENSION_MODEL,{clues:['poor-signal']});
assert.equal(r.top.id,'measurement');

const c=createCase();
recordAction(c,'Phenotype-directed intervention','improved');
assert.equal(c.timeline.length,1);
console.log('✓ Clinical reasoning engine tests passed');
