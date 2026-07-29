#!/usr/bin/env node
/*
 * Anesthculator drug library validator — run before every release.
 *
 *   node validate.js
 *
 * Exits non-zero if any check fails, so it can be wired into CI or a
 * pre-commit hook. The v0.60 esmolol/rocuronium volume errors would all
 * have been caught by the UNIT MISMATCH check below.
 */
const fs = require('fs');

const src = fs.readFileSync(require('path').join(__dirname, 'app.js'), 'utf8');
const a = src.indexOf('const D=[');
const b = src.indexOf('\n];', a);
if (a < 0 || b < 0) { console.error('Could not locate the drug array in app.js'); process.exit(1); }
const D = eval(src.slice(a + 8, b + 2));

const MASS = { mcg: 0.001, 'µg': 0.001, ug: 0.001, mg: 1, g: 1000, gram: 1000 };
const massFactor = u => {
  const x = String(u || '').trim().toLowerCase().split('/')[0].trim();
  return Object.prototype.hasOwnProperty.call(MASS, x) ? MASS[x] : null;
};
const perMl = u => /\/\s*m\s*l\s*$/i.test(String(u || '').trim());

const errors = [];
const warnings = [];

// ---- 1. duplicate keys silently discarded by the JS parser -------------
const bodyLines = src.slice(a, b).split('\n');
bodyLines.forEach(line => {
  const id = (line.match(/id:"([^"]+)"/) || [])[1];
  if (!id) return;
  const masked = line.replace(/dosingRecords:\[.*?\}\]/g, m => 'X'.repeat(m.length));
  ['ref', 'category', 'phase', 'unit', 'stock', 'def'].forEach(key => {
    const n = (masked.match(new RegExp('(?<![A-Za-z_$])' + key + ':', 'g')) || []).length;
    if (n > 1) errors.push(`${id}: "${key}" declared ${n} times — JS keeps only the last value`);
  });
});

// ---- 2. dose unit vs stock unit ---------------------------------------
const checkRecord = (id, label, unit, stockUnit, stock, def) => {
  if (def == null || !unit) return;
  const df = massFactor(unit), sf = massFactor(stockUnit);
  if (df == null || sf == null) {
    warnings.push(`${id}${label}: dose "${unit}" vs stock "${stockUnit}" is not a mass pair — the app will show no volume`);
    return;
  }
  if (!perMl(stockUnit)) {
    warnings.push(`${id}${label}: stock "${stockUnit}" is not per mL — the app will show no volume`);
    return;
  }
  if (!(stock > 0)) errors.push(`${id}${label}: stock concentration is ${stock}`);
  if (df !== sf) {
    // Not an error any more (v0.62 converts), but worth surfacing so the
    // clinical reviewer can eyeball the converted numbers.
    warnings.push(`${id}${label}: dose in ${unit}, stock in ${stockUnit} — conversion factor ${df / sf} applied`);
  }
};

D.forEach(d => {
  if (!d.doseLocked) checkRecord(d.id, '', d.unit, d.stockUnit, d.stock, d.def);
  (d.dosingRecords || []).forEach((r, i) =>
    checkRecord(d.id, ` [record ${i}: ${r.phase || '?'}]`, r.unit || d.unit, r.stockUnit || d.stockUnit, r.stock ?? d.stock, r.def)
  );
});

// ---- 3. dose range sanity ---------------------------------------------
D.forEach(d => {
  if (d.doseLocked || d.def == null) return;
  if (d.min != null && d.max != null && d.min > d.max) errors.push(`${d.id}: min ${d.min} > max ${d.max}`);
  if (d.min != null && d.def < d.min) errors.push(`${d.id}: default ${d.def} below min ${d.min}`);
  if (d.max != null && d.def > d.max) errors.push(`${d.id}: default ${d.def} above max ${d.max}`);
});

// ---- 4. required safety fields ----------------------------------------
D.forEach(d => {
  if (!d.name) errors.push(`${d.id}: missing name`);
  if (!d.ref) errors.push(`${d.id}: missing reference — every record needs a traceable source`);
  if (!d.doseLocked && d.def == null) errors.push(`${d.id}: unlocked record with no default dose`);
});

// ---- 5. duplicate ids --------------------------------------------------
const seen = new Set();
D.forEach(d => { if (seen.has(d.id)) errors.push(`duplicate id: ${d.id}`); seen.add(d.id); });

// ---- 6. category / class coherence ------------------------------------
const CLASS_HINTS = [
  [/benzodiazepine/i, /Premedication|Anxiolytic|Sedation/i],
  [/NMBA|neuromuscular/i, /Neuromuscular/i],
  [/opioid/i, /Opioid/i],
  [/local anesthetic/i, /Local Anesthetic/i],
  [/vasopressor|inotrope/i, /Vasoactive|Inotropic/i],
];
// An antagonist/antidote is named after the class it reverses, so it belongs
// under Reversal Agents rather than under that class.
const isReversal = d => /antagonist|antidote|reversal/i.test(d.drugClass || '') || /Reversal|Antidote/i.test(d.category || '');
D.forEach(d => {
  if (!d.drugClass || !d.category || isReversal(d)) return;
  CLASS_HINTS.forEach(([cls, cat]) => {
    if (cls.test(d.drugClass) && !cat.test(d.category)) {
      errors.push(`${d.id} (${d.name}): drugClass "${d.drugClass}" does not match category "${d.category}"`);
    }
  });
});

// ---- report ------------------------------------------------------------
console.log(`Anesthculator library validation — ${D.length} records\n`);
if (warnings.length) {
  console.log(`${warnings.length} notice(s):`);
  warnings.forEach(w => console.log('  ·', w));
  console.log('');
}
if (errors.length) {
  console.error(`${errors.length} ERROR(S):`);
  errors.forEach(e => console.error('  ✗', e));
  process.exit(1);
}
console.log('✓ All structural checks passed.');
console.log('NOTE: this validates structure and units only. It cannot verify that');
console.log('a dose is clinically correct — that still requires source review.');
