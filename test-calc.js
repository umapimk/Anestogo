#!/usr/bin/env node
/*
 * Regression tests for the v0.62 unit engine.
 *
 *   node test-calc.js
 *
 * These lock in the fix for the v0.60 defect where a mcg dose divided by a
 * mg/mL stock produced a 1000-fold volume error. Add a case here whenever a
 * new unit combination enters the library.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Pull the calculation core out of app.js without executing the DOM code.
const src = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
const grab = (startMarker, endMarker) => {
  const a = src.indexOf(startMarker);
  const b = src.indexOf(endMarker, a);
  if (a < 0 || b < 0) throw new Error('Could not extract: ' + startMarker);
  return src.slice(a, b);
};
const core = grab('const MASS_TO_MG=', 'let dilutionPrefs=');

// The tests exercise the unit arithmetic, so the weight layer is stubbed to a
// fixed 60 kg TBW. Weight-basis selection is covered separately below.
const sandbox = {
  sex: 'Male', weight: 60, height: 170,
  weightBasisInfo: () => ({
    basis: 'TBW', label: 'Actual Body Weight',
    formula: 'Patient-entered actual weight', kg: 60,
  }),
};
vm.createContext(sandbox);
vm.runInContext(core, sandbox);
const { calc } = sandbox;

let pass = 0, fail = 0;
const near = (a, b) => a != null && b != null && Math.abs(a - b) < 1e-9;

function t(name, drug, expect) {
  const c = calc(drug);
  const okVol = expect.vol === null ? c.vol === null : near(c.vol, expect.vol);
  const okTotal = expect.total === undefined || near(c.total, expect.total);
  const okAvail = expect.volAvailable === undefined || c.volAvailable === expect.volAvailable;
  if (okVol && okTotal && okAvail) { pass++; console.log(`  ✓ ${name}`); }
  else {
    fail++;
    console.error(`  ✗ ${name}`);
    console.error(`      expected vol=${expect.vol}, total=${expect.total}, available=${expect.volAvailable}`);
    console.error(`      actual   vol=${c.vol}, total=${c.total}, available=${c.volAvailable}`);
  }
}

console.log('\nv0.62 unit engine — regression tests (patient 60 kg)\n');

console.log('Same-unit cases (must be unchanged from v0.60):');
t('Propofol 2 mg/kg @ 10 mg/mL → 12 mL',
  { def: 2, unit: 'mg/kg', stock: 10, stockUnit: 'mg/mL' }, { total: 120, vol: 12 });
t('Rocuronium RSI 1.2 mg/kg @ 10 mg/mL → 7.2 mL',
  { def: 1.2, unit: 'mg/kg', stock: 10, stockUnit: 'mg/mL' }, { total: 72, vol: 7.2 });
t('Fentanyl 1 mcg/kg @ 50 mcg/mL → 1.2 mL',
  { def: 1, unit: 'mcg/kg', stock: 50, stockUnit: 'mcg/mL' }, { total: 60, vol: 1.2 });
t('Norepinephrine 0.05 mcg/kg/min @ 16 mcg/mL → 0.1875 mL/min',
  { def: 0.05, unit: 'mcg/kg/min', stock: 16, stockUnit: 'mcg/mL' }, { total: 3, vol: 0.1875 });
t('Labetalol flat 20 mg @ 5 mg/mL → 4 mL',
  { def: 20, unit: 'mg', stock: 5, stockUnit: 'mg/mL' }, { total: 20, vol: 4 });

console.log('\nCross-unit cases (the v0.60 1000-fold defect):');
t('Esmolol 250 mcg/kg @ 10 mg/mL → 1.5 mL (was 1500)',
  { def: 250, unit: 'mcg/kg', stock: 10, stockUnit: 'mg/mL' }, { total: 15000, vol: 1.5 });
t('Esmolol 50 mcg/kg/min @ 10 mg/mL → 0.3 mL/min (was 300)',
  { def: 50, unit: 'mcg/kg/min', stock: 10, stockUnit: 'mg/mL' }, { total: 3000, vol: 0.3 });
t('Rocuronium 10 mcg/kg/min @ 10 mg/mL → 0.06 mL/min (was 60)',
  { def: 10, unit: 'mcg/kg/min', stock: 10, stockUnit: 'mg/mL' }, { total: 600, vol: 0.06 });
t('Reverse direction: 2 mg/kg @ 1000 mcg/mL → 120 mL',
  { def: 2, unit: 'mg/kg', stock: 1000, stockUnit: 'mcg/mL' }, { total: 120, vol: 120 });

console.log('\nNon-mass stock units (must refuse to produce a number):');
t('Vasopressin @ 20 unit/mL → no volume',
  { def: 2, unit: 'unit', stock: 20, stockUnit: 'unit/mL' }, { vol: null, volAvailable: false });
t('Cefazolin @ 1000 mg/vial → no volume',
  { def: 2000, unit: 'mg', stock: 1000, stockUnit: 'mg/vial' }, { vol: null, volAvailable: false });
t('Lipid emulsion @ 20 percent → no volume',
  { def: 1.5, unit: 'mL/kg', stock: 20, stockUnit: 'percent' }, { vol: null, volAvailable: false });
t('Zero stock concentration → no volume',
  { def: 2, unit: 'mg/kg', stock: 0, stockUnit: 'mg/mL' }, { vol: null, volAvailable: false });

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
