
const $=x=>document.getElementById(x);
function appNotify(message){const t=document.getElementById("appToast");if(!t){console.warn(message);return}t.textContent=String(message);t.classList.add("show");clearTimeout(appNotify._t);appNotify._t=setTimeout(()=>t.classList.remove("show"),3500)}
window.alert=appNotify;
const SAFETY_DB="AnesthculatorSafety",SAFETY_DB_VERSION=1,SAFETY_STORE="records";
let safetyDBPromise=null;
function openSafetyDB(){if(!("indexedDB" in window))return Promise.reject(new Error("IndexedDB unavailable"));if(safetyDBPromise)return safetyDBPromise;safetyDBPromise=new Promise((resolve,reject)=>{const r=indexedDB.open(SAFETY_DB,SAFETY_DB_VERSION);r.onupgradeneeded=()=>{const db=r.result;if(!db.objectStoreNames.contains(SAFETY_STORE))db.createObjectStore(SAFETY_STORE)};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});return safetyDBPromise}
async function safetyDBPut(key,value){try{const db=await openSafetyDB();await new Promise((res,rej)=>{const tx=db.transaction(SAFETY_STORE,"readwrite");tx.objectStore(SAFETY_STORE).put(value,key);tx.oncomplete=res;tx.onerror=()=>rej(tx.error)})}catch(e){console.warn("IndexedDB mirror unavailable",e)}}
async function safetyDBDelete(key){try{const db=await openSafetyDB();const tx=db.transaction(SAFETY_STORE,"readwrite");tx.objectStore(SAFETY_STORE).delete(key)}catch(e){}}
async function mirrorCriticalData(){const keys=["anesthLocalDrugs","anesthVerifiedDrugs","anesthVerifiedDoseRecords","anesthClassificationOverrides","anesthMultiClassOverrides","anesthCustomCategories","anesthArchivedLocalDrugs"];const data={};for(const k of keys){const v=localStorage.getItem(k);if(v!==null){try{data[k]=JSON.parse(v)}catch{data[k]=v}}}data.mirroredAt=new Date().toISOString();await safetyDBPut("clinicalLocalData",data)}
const _setItem=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){_setItem.call(this,k,v);if(/^anesth(LocalDrugs|Verified|Classification|MultiClass|CustomCategories|Archived)/.test(k))queueMicrotask(mirrorCriticalData)};

/* v0.62: drug records can arrive from the shared cloud library or from a
   locally added drug, so any free-text field interpolated into innerHTML
   is escaped. Previously only single quotes were handled, which meant a
   name containing & or < silently broke the card. */
const esc=v=>String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
const D=[
{id:"prop",name:"Propofol",phase:"Induction",context:"Induction bolus",sub:"",min:2,max:2.5,def:2,unit:"mg/kg",stock:10,stockUnit:"mg/mL",preferredTarget:10,preferredFinal:20,ci:"Known hypersensitivity to propofol/formulation components.",caution:"Requirements may be lower in elderly/debilitated patients.", checked:1,verification:"SOURCE_VERIFIED",verificationNote:"DailyMed: adult ASA I–II induction 2–2.5 mg/kg; elderly/debilitated/ASA III–IV 1–1.5 mg/kg. Thai indication-level cross-check pending",ref:"DailyMed Propofol Injectable Emulsion prescribing information • Thai/RCAT cross-check pending",category:"Intravenous Induction Agents",categories:["Intravenous Induction Agents"],drugClass:"Alkylphenol Derivative"},
{id:"thio",name:"Thiopental",phase:"Induction",context:"Induction bolus",sub:"",min:3,max:5,def:4,unit:"mg/kg",stock:25,stockUnit:"mg/mL",preferredTarget:25,preferredFinal:20,ci:"Source verification pending.",caution:"Starter value: verify before clinical use.",ref:"Thai institutional + Miller/Barash reconciliation pending",checked:0,category:"Intravenous Induction Agents",categories:["Intravenous Induction Agents"],drugClass:"Barbiturate (Thiobarbiturate)"},
{id:"eto",name:"Etomidate",phase:"Induction",context:"Induction bolus",sub:"",min:.2,max:.3,def:.3,unit:"mg/kg",stock:2,stockUnit:"mg/mL",preferredTarget:2,preferredFinal:10,ci:"Hypersensitivity to etomidate.",caution:"Avoid prolonged infusion because of adrenal suppression.", checked:1,verification:"SOURCE_VERIFIED",verificationNote:"DailyMed: usual induction dose 0.3 mg/kg IV over 30–60 sec; inadequate data below age 10 in this label",ref:"DailyMed Etomidate Injection prescribing information • Thai/RCAT cross-check pending",category:"Intravenous Induction Agents",categories:["Intravenous Induction Agents"],drugClass:"Carboxylated Imidazole"},
{id:"keta",name:"Ketamine",phase:"Induction",context:"Induction bolus",sub:"",min:1,max:2,def:2,unit:"mg/kg",stock:50,stockUnit:"mg/mL",preferredTarget:50,preferredFinal:10,ci:"When significant BP elevation would be a serious hazard; hypersensitivity.",caution:"Monitor cardiovascular response and airway.",ref:"DailyMed; Thai cross-check pending",checked:1,category:"Intravenous Induction Agents",categories:["Intravenous Induction Agents"],drugClass:"Phencyclidine Derivative (Dissociative)"},
{id:"fent",name:"Fentanyl",phase:"Post-op",context:"Opioid analgesic",sub:"",min:1,max:2,def:1,unit:"mcg/kg",stock:50,stockUnit:"mcg/mL",preferredTarget:50,preferredFinal:10,ci:"Exact indication-specific verification pending.",caution:"Respiratory depression/chest-wall rigidity may occur.",ref:"Anesthesia-specific Thai verification pending",checked:0,phases:["Induction","Opioid","Maintenance","Post-op"],dosingRecords:[{phase:"Induction",context:"Induction opioid",min:1,max:2,def:1,unit:"mcg/kg",stock:50,stockUnit:"mcg/mL",ref:"Built-in starter • verify local anesthesia protocol",category:"Opioid Analgesics",categories:["Opioid Analgesics"],drugClass:"Phenylpiperidine Synthetic Opioid"},{phase:"Opioid",context:"Intraoperative analgesia",min:1,max:2,def:1,unit:"mcg/kg",stock:50,stockUnit:"mcg/mL",ref:"Built-in starter • verify local anesthesia protocol"},{phase:"Maintenance",context:"Supplemental analgesia",min:1,max:2,def:1,unit:"mcg/kg",stock:50,stockUnit:"mcg/mL",ref:"Built-in starter • verify local anesthesia protocol"},{phase:"Post-op",context:"Postoperative opioid option",min:0.5,max:1,def:0.5,unit:"mcg/kg",stock:50,stockUnit:"mcg/mL",ref:"Built-in starter • verify local anesthesia protocol"}]},
{id:"roc-routine",name:"Rocuronium",phase:"NMB",context:"Routine intubation",sub:"Intubation / Initial",min:.6,max:.6,def:.6,unit:"mg/kg",stock:10,stockUnit:"mg/mL",preferredTarget:10,preferredFinal:10,ci:"Hypersensitivity to rocuronium or bromide.",caution:"Use neuromuscular monitoring.", checked:1,verification:"SOURCE_VERIFIED",verificationNote:"DailyMed: initial tracheal intubation dose 0.6 mg/kg",ref:"DailyMed Rocuronium Bromide Injection prescribing information • Thai/RCAT cross-check pending",category:"Neuromuscular Blocking Agents",categories:["Neuromuscular Blocking Agents"],drugClass:"Non-depolarizing Steroidal NMBA"},
{id:"roc-rsi",name:"Rocuronium",phase:"NMB",context:"RSI",sub:"Intubation / Initial",min:.6,max:1.2,def:1.2,unit:"mg/kg",stock:10,stockUnit:"mg/mL",preferredTarget:10,preferredFinal:10,ci:"Hypersensitivity to rocuronium or bromide.",caution:"RSI dose/duration differs from routine intubation.", checked:1,verification:"SOURCE_VERIFIED",verificationNote:"DailyMed: RSI 0.6–1.2 mg/kg",ref:"DailyMed Rocuronium Bromide Injection prescribing information • Thai/RCAT cross-check pending",category:"Neuromuscular Blocking Agents",categories:["Neuromuscular Blocking Agents"],drugClass:"Non-depolarizing Steroidal NMBA"},
{id:"sux",name:"Succinylcholine",phase:"NMB",context:"Intubation / RSI",sub:"Intubation / Initial",min:1,max:1.5,def:1,unit:"mg/kg",stock:20,stockUnit:"mg/mL",preferredTarget:20,preferredFinal:10,ci:"High-alert contraindications require exact source review.",caution:"Screen MH susceptibility and hyperkalemia risk; pediatric restrictions matter.",ref:"Full Thai/product verification required",checked:0,category:"Neuromuscular Blocking Agents",categories:["Neuromuscular Blocking Agents"],drugClass:"Depolarizing NMBA"},
{id:"cis-i",name:"Cisatracurium",phase:"NMB",context:"Intubation",sub:"Intubation / Initial",min:.15,max:.2,def:.15,unit:"mg/kg",stock:2,stockUnit:"mg/mL",preferredTarget:2,preferredFinal:10,ci:"Source verification pending.",caution:"Verify exact label/local protocol.",ref:"Thai/product verification pending",checked:0,category:"Neuromuscular Blocking Agents",categories:["Neuromuscular Blocking Agents"],drugClass:"Non-depolarizing Benzylisoquinolinium NMBA"},
{id:"atr-i",name:"Atracurium",phase:"NMB",context:"Intubation",sub:"Intubation / Initial",min:.4,max:.5,def:.5,unit:"mg/kg",stock:10,stockUnit:"mg/mL",preferredTarget:10,preferredFinal:10,ci:"Source verification pending.",caution:"Consider histamine-related effects.",ref:"Thai/product verification pending",checked:0,category:"Neuromuscular Blocking Agents",categories:["Neuromuscular Blocking Agents"],drugClass:"Non-depolarizing Benzylisoquinolinium NMBA"},
{id:"roc-m",name:"Rocuronium",phase:"NMB",context:"Maintenance bolus",sub:"Maintenance / Redose",min:.1,max:.2,def:.1,unit:"mg/kg",stock:10,stockUnit:"mg/mL",preferredTarget:10,preferredFinal:10,ci:"Hypersensitivity to rocuronium or bromide.",caution:"Redose based on TOF/neuromuscular monitoring.", checked:0,verification:"SOURCE_VERIFIED",verificationNote:"DailyMed: maintenance 0.1, 0.15 or 0.2 mg/kg guided by recovery/TOF",ref:"DailyMed Rocuronium Bromide Injection prescribing information • Thai/RCAT cross-check pending",category:"Neuromuscular Blocking Agents",categories:["Neuromuscular Blocking Agents"],drugClass:"Non-depolarizing Steroidal NMBA"},
{id:"cis-m",name:"Cisatracurium",phase:"NMB",context:"Maintenance bolus",sub:"Maintenance / Redose",min:.02,max:.03,def:.03,unit:"mg/kg",stock:2,stockUnit:"mg/mL",preferredTarget:2,preferredFinal:10,ci:"Source verification pending.",caution:"Guide with TOF.",ref:"Thai/product verification pending",checked:0,category:"Neuromuscular Blocking Agents",categories:["Neuromuscular Blocking Agents"],drugClass:"Non-depolarizing Benzylisoquinolinium NMBA"},
{id:"atr-m",name:"Atracurium",phase:"NMB",context:"Maintenance bolus",sub:"Maintenance / Redose",min:.08,max:.1,def:.1,unit:"mg/kg",stock:10,stockUnit:"mg/mL",preferredTarget:10,preferredFinal:10,ci:"Source verification pending.",caution:"Guide with TOF.",ref:"Thai/product verification pending",checked:0,category:"Neuromuscular Blocking Agents",categories:["Neuromuscular Blocking Agents"],drugClass:"Non-depolarizing Benzylisoquinolinium NMBA"},
{id:"roc-inf",name:"Rocuronium",phase:"NMB",context:"Continuous infusion",sub:"Continuous infusion",min:10,max:12,def:10,unit:"mcg/kg/min",stock:10,stockUnit:"mg/mL",preferredTarget:1,preferredFinal:50,ci:"Hypersensitivity to rocuronium or bromide.",caution:"Start after early evidence of spontaneous recovery from an intubating dose and titrate to neuromuscular monitoring.",ref:"DailyMed Rocuronium Bromide Injection: initial continuous infusion 10–12 mcg/kg/min • Thai/RCAT cross-check pending",checked:0,verification:"SOURCE_VERIFIED",verificationNote:"DailyMed continuous infusion initial rate 10–12 mcg/kg/min after early spontaneous recovery",category:"Neuromuscular Blocking Agents",categories:["Neuromuscular Blocking Agents"],drugClass:"Non-depolarizing Steroidal NMBA"},
{id:"sug",name:"Sugammadex",phase:"Reversal",context:"Depth-of-block dependent",sub:"",min:2,max:4,def:2,unit:"mg/kg",stock:100,stockUnit:"mg/mL",preferredTarget:100,preferredFinal:5,ci:"Verify hypersensitivity and renal restrictions.",caution:"Dose depends on depth of block and monitoring.",ref:"Product-label structure; Thai verification pending",checked:1,category:"Reversal Agents & Antidotes",categories:["Reversal Agents & Antidotes"],drugClass:"Modified Gamma-Cyclodextrin"},
{id:"neo",name:"Neostigmine",phase:"Reversal",context:"Reversal option",sub:"",min:.03,max:.07,def:.05,unit:"mg/kg",stock:1,stockUnit:"mg/mL",preferredTarget:1,preferredFinal:10,ci:"Hypersensitivity; peritonitis; mechanical GI/urinary obstruction.",caution:"Give appropriate antimuscarinic; max requires verification.", checked:1,verification:"SOURCE_VERIFIED",verificationNote:"DailyMed: reversal 0.03–0.07 mg/kg IV; max 0.07 mg/kg or 5 mg, whichever is less; anticholinergic prior/concomitant",ref:"DailyMed Neostigmine Methylsulfate Injection prescribing information • Thai/RCAT cross-check pending",category:"Reversal Agents & Antidotes",categories:["Reversal Agents & Antidotes"],drugClass:"Acetylcholinesterase Inhibitor"},
{id:"ond",name:"Ondansetron",phase:"PONV",context:"PONV prophylaxis",sub:"",doseLocked:true,stock:2,stockUnit:"mg/mL",preferredTarget:2,preferredFinal:4,ci:"Hypersensitivity; concomitant apomorphine.",caution:"DOSE LOCKED: age/weight branching is not yet implemented. Verify indication, age and weight against the approved protocol.",checked:0,verification:"CLINICAL_LOGIC_CONFLICT",verificationNote:"Dose display locked because the existing generic weight-based rule conflicts with the source note: adults/>12 y 4 mg; pediatric 1 month–12 y ≤40 kg 0.1 mg/kg; >40 kg 4 mg. Split into population-specific dose records before re-verification.",ref:"DailyMed Ondansetron Injection PONV table • Thai/local PONV cross-check pending",category:"Antiemetics (PONV)",categories:["Antiemetics (PONV)"],drugClass:"5-HT3 Receptor Antagonist"},
{id:"dex",name:"Dexamethasone",phase:"PONV",context:"PONV prophylaxis",sub:"",min:.1,max:.15,def:.1,unit:"mg/kg",stock:4,stockUnit:"mg/mL",preferredTarget:4,preferredFinal:4,ci:"PONV-specific source reconciliation pending.",caution:"Consider hyperglycemia and institutional PONV protocol.",ref:"Thai verification pending",checked:0,category:"Antiemetics (PONV)",categories:["Antiemetics (PONV)"],drugClass:"Corticosteroid"},
{id:"para",name:"Paracetamol IV",phase:"Post-op",context:"Non-opioid analgesia",sub:"",min:10,max:15,def:15,unit:"mg/kg",stock:10,stockUnit:"mg/mL",preferredTarget:10,preferredFinal:100,ci:"Age/weight/product-specific restrictions require verification.",caution:"Count all acetaminophen routes; consider hepatic risk.",ref:"Local product verification pending",checked:0,category:"Non-Opioid Analgesics & Co-analgesics",categories:["Non-Opioid Analgesics & Co-analgesics"],drugClass:"Central Analgesic / Antipyretic"},
{id:"morph",name:"Morphine",phase:"Post-op",context:"Opioid option",sub:"",min:.05,max:.1,def:.05,unit:"mg/kg",stock:10,stockUnit:"mg/mL",preferredTarget:10,preferredFinal:10,ci:"Respiratory depression and other opioid contraindications require review.",caution:"Starter anesthesia value; verify local protocol.",ref:"Thai anesthesia dose verification pending",checked:0,category:"Opioid Analgesics",categories:["Opioid Analgesics"],drugClass:"Natural Opium Alkaloid"},
{id:"peth",name:"Pethidine (Meperidine)",phase:"Post-op",context:"Opioid option",sub:"",min:.5,max:1,def:.5,unit:"mg/kg",stock:50,stockUnit:"mg/mL",preferredTarget:50,preferredFinal:10,ci:"Exact product contraindication verification pending.",caution:"Normeperidine accumulation and serotonergic interactions matter.",ref:"Local verification required",checked:0,category:"Opioid Analgesics",categories:["Opioid Analgesics"],drugClass:"Phenylpiperidine Synthetic Opioid"},
{id:"esmolol-bolus",name:"Esmolol",phase:"Hemodynamics",context:"Acute BP/HR control — bolus",sub:"Antihypertensive / rate control",min:250,max:500,def:250,unit:"mcg/kg",stock:10,stockUnit:"mg/mL",preferredTarget:10,preferredFinal:10,ci:"Severe bradycardia/heart block/cardiogenic shock; bronchospasm risk.",caution:"Ultra-short acting beta-1 blocker. Titrate to BP/HR and clinical context.",ref:"Perioperative hypertension review; local/product verification required",checked:0,category:"Antihypertensives & Antiarrhythmics",categories:["Antihypertensives & Antiarrhythmics"],drugClass:"Ultra-short Cardioselective Beta-Blocker"},
{id:"esmolol-inf",name:"Esmolol",phase:"Hemodynamics",context:"Continuous infusion",sub:"Antihypertensive / rate control",min:25,max:100,def:50,unit:"mcg/kg/min",stock:10,stockUnit:"mg/mL",preferredTarget:10,preferredFinal:50,ci:"Severe bradycardia/heart block/cardiogenic shock; bronchospasm risk.",caution:"Titrate to effect.",ref:"Perioperative BP reviews; local/product verification required",checked:0,category:"Antihypertensives & Antiarrhythmics",categories:["Antihypertensives & Antiarrhythmics"],drugClass:"Ultra-short Cardioselective Beta-Blocker"},
{id:"labetalol",name:"Labetalol",phase:"Hemodynamics",context:"IV bolus",sub:"Antihypertensive",min:10,max:20,def:20,unit:"mg",stock:5,stockUnit:"mg/mL",preferredTarget:5,preferredFinal:20,ci:"Asthma/bronchospasm, severe bradycardia, >1st degree heart block, cardiogenic shock.",caution:"Longer duration than esmolol. Repeat/titrate carefully.",ref:"Perioperative hypertension review; product/local verification required",checked:0,category:"Antihypertensives & Antiarrhythmics",categories:["Antihypertensives & Antiarrhythmics"],drugClass:"Combined Alpha-1 & Non-selective Beta Blocker"},
{id:"nicardipine",name:"Nicardipine",phase:"Hemodynamics",context:"IV infusion",sub:"Antihypertensive",min:5,max:15,def:5,unit:"mg/hr",stock:1,stockUnit:"mg/mL",preferredTarget:0.1,preferredFinal:100,ci:"Advanced aortic stenosis/certain shock states require caution; formulation-specific contraindications apply.",caution:"Start commonly at 5 mg/h and titrate by institutional protocol.",ref:"Perioperative hypertension review; local/product verification required",checked:0,category:"Antihypertensives & Antiarrhythmics",categories:["Antihypertensives & Antiarrhythmics"],drugClass:"Dihydropyridine Calcium Channel Blocker"},
{id:"ntg",name:"Nitroglycerin",phase:"Hemodynamics",context:"IV infusion",sub:"Antihypertensive / anti-ischemic",min:5,max:200,def:5,unit:"mcg/min",stock:1000,stockUnit:"mcg/mL",preferredTarget:200,preferredFinal:50,ci:"PDE-5 inhibitor interaction, severe hypotension, raised ICP and other product-specific contraindications.",caution:"Useful when ischemia/pulmonary congestion accompanies hypertension; titrate rapidly.",ref:"Perioperative hypertension review; local/product verification required",checked:0,category:"Antihypertensives & Antiarrhythmics",categories:["Antihypertensives & Antiarrhythmics"],drugClass:"Venodilator Nitrate"},
{id:"nitroprusside",name:"Sodium Nitroprusside",phase:"Hemodynamics",context:"IV infusion",sub:"Antihypertensive",min:.25,max:10,def:.5,unit:"mcg/kg/min",stock:200,stockUnit:"mcg/mL",preferredTarget:200,preferredFinal:50,ci:"Compensatory hypertension and product-specific contraindications; cyanide/thiocyanate toxicity risk.",caution:"Very rapid onset/offset. Higher doses should be brief; protect solution from light per product instructions.",ref:"Perioperative hypertension review; local/product verification required",checked:0},
{id:"hydralazine",name:"Hydralazine",phase:"Hemodynamics",context:"IV bolus",sub:"Antihypertensive",min:2.5,max:10,def:5,unit:"mg",stock:20,stockUnit:"mg/mL",preferredTarget:4,preferredFinal:10,ci:"Product-specific contraindications; caution in ischemic heart disease/tachycardia.",caution:"Onset/peak can be delayed; avoid premature repeat dosing.",ref:"StatPearls perioperative hypertension; local/product verification required",checked:0},
{id:"phenyl",name:"Phenylephrine",phase:"Hemodynamics",context:"Vasopressor bolus",sub:"Vasopressor",min:50,max:100,def:50,unit:"mcg",stock:100,stockUnit:"mcg/mL",preferredTarget:100,preferredFinal:10,ci:"Severe hypertension; caution with bradycardia/low-output states.",caution:"Common perioperative vasopressor starter entry; verify institutional concentration/dose.",ref:"LOCAL ANESTHESIA PROTOCOL VERIFICATION REQUIRED",checked:0,category:"Vasoactive & Inotropic Drugs",categories:["Vasoactive & Inotropic Drugs"],drugClass:"Pure Alpha-1 Vasopressor"},
{id:"ephed",name:"Ephedrine",phase:"Hemodynamics",context:"Vasopressor bolus",sub:"Vasopressor",min:5,max:10,def:5,unit:"mg",stock:5,stockUnit:"mg/mL",preferredTarget:5,preferredFinal:10,ci:"Tachyarrhythmia/severe hypertension and product-specific contraindications.",caution:"Common perioperative bolus entry; verify local practice.",ref:"LOCAL ANESTHESIA PROTOCOL VERIFICATION REQUIRED",checked:0,category:"Vasoactive & Inotropic Drugs",categories:["Vasoactive & Inotropic Drugs"],drugClass:"Mixed Alpha/Beta Sympathomimetic"},
{id:"norepi",name:"Norepinephrine",phase:"Hemodynamics",context:"IV infusion",sub:"Vasopressor",min:.02,max:.2,def:.05,unit:"mcg/kg/min",stock:16,stockUnit:"mcg/mL",preferredTarget:16,preferredFinal:50,ci:"Correct severe hypovolemia when feasible; ischemia/extravasation risks.",caution:"Concentration varies widely by institution; editable stock/working concentration is essential.",ref:"LOCAL ANESTHESIA/ICU PROTOCOL VERIFICATION REQUIRED",checked:0}
,
{id:"midaz",name:"Midazolam",phase:"Sedation",context:"Premedication / procedural sedation",sub:"",doseLocked:true,stock:1,stockUnit:"mg/mL",ci:"Respiratory depression; hypersensitivity; formulation/route-specific contraindications apply.",caution:"Dose varies substantially by age, route and indication. Included but locked pending Thai + label reconciliation.",ref:"Dose locked — RCAT/institutional + product-label verification pending",checked:0,category:"Premedication & Anxiolytics",categories:["Premedication & Anxiolytics"],drugClass:"Short-acting Benzodiazepine"},
{id:"dexmed",name:"Dexmedetomidine",phase:"Sedation",context:"Procedural sedation / infusion",sub:"",doseLocked:true,stock:100,stockUnit:"mcg/mL",preferredTarget:4,preferredFinal:50,ci:"Hypersensitivity; clinically significant bradycardia/hypotension require caution.",caution:"Current U.S. label includes adult procedural sedation and pediatric non-invasive procedural sedation; dosing varies by age/indication.",ref:"DailyMed dexmedetomidine label updated May 2026; exact age/indication dosing locked pending Thai reconciliation",checked:1,category:"Premedication & Anxiolytics",categories:["Premedication & Anxiolytics"],drugClass:"Alpha-2 Adrenergic Agonist"},
{id:"remi",name:"Remifentanil",phase:"Maintenance",context:"Analgesic infusion / TIVA adjunct",sub:"",doseLocked:true,stock:1000,stockUnit:"mcg/mL",preferredTarget:20,preferredFinal:50,ci:"Opioid contraindications/formulation-specific restrictions; requires controlled infusion.",caution:"Potent ultra-short opioid; dose varies by induction/maintenance/spontaneous ventilation.",ref:"Dose locked — product label + Thai anesthesia reconciliation pending",checked:0,category:"Opioid Analgesics",categories:["Opioid Analgesics"],drugClass:"Ester-linked Synthetic Opioid"},
{id:"tramadol",name:"Tramadol",phase:"Post-op",category:"Analgesics",context:"Post-op analgesia",sub:"",doseLocked:true,stock:50,stockUnit:"mg/mL",ci:"Seizure risk, serotonergic interactions, opioid contraindications; pediatric restrictions apply.",caution:"Dose and age restrictions vary by jurisdiction/product.",ref:"Dose locked — Thai product/institutional verification pending",checked:0},
{id:"ketorolac",name:"Ketorolac",phase:"Post-op",context:"NSAID analgesia",sub:"",doseLocked:true,stock:30,stockUnit:"mg/mL",ci:"Renal impairment, bleeding risk, active peptic ulcer/GI bleeding, NSAID hypersensitivity and peri-CABG restrictions.",caution:"Age/renal/weight adjustments are important.",ref:"Dose locked — product/local protocol verification pending",checked:0,category:"Non-Opioid Analgesics & Co-analgesics",categories:["Non-Opioid Analgesics & Co-analgesics"],drugClass:"Non-selective NSAID"},
{id:"parecoxib",name:"Parecoxib",phase:"Post-op",context:"COX-2 analgesia",sub:"",doseLocked:true,stock:20,stockUnit:"mg/mL",ci:"Sulfonamide/NSAID hypersensitivity and product-specific cardiovascular/GI restrictions.",caution:"Common in some perioperative settings; local formulary dependent.",ref:"ASRA regional-anesthesia safety framework • Thai product/local protocol verification pending",checked:0,category:"Non-Opioid Analgesics & Co-analgesics",categories:["Non-Opioid Analgesics & Co-analgesics"],drugClass:"Selective COX-2 Inhibitor (Injectable Prodrug)"},
{id:"ibuprofen-iv",name:"Ibuprofen IV",phase:"Post-op",category:"Analgesics / NSAIDs",context:"IV NSAID",sub:"",doseLocked:true,stock:4,stockUnit:"mg/mL",ci:"NSAID hypersensitivity, renal/GI bleeding risk, CABG-related restrictions.",caution:"Age and indication dependent.",ref:"Dose locked — product/local verification pending",checked:0},

{id:"glyco",name:"Glycopyrrolate",phase:"Reversal",context:"Antimuscarinic with reversal / secretion control",sub:"",doseLocked:true,stock:.2,stockUnit:"mg/mL",ci:"Product-specific contraindications include conditions worsened by anticholinergic effects.",caution:"Pairing with neostigmine depends on protocol and age.",ref:"Dose locked — product/Thai anesthesia verification pending",checked:0,category:"Anticholinergics & Antisecretory",categories:["Anticholinergics & Antisecretory"],drugClass:"Quaternary Ammonium Anticholinergic"},
{id:"atropine",name:"Atropine",phase:"Emergency",context:"Bradycardia / antimuscarinic",sub:"",doseLocked:true,stock:.6,stockUnit:"mg/mL",ci:"Use depends on rhythm/indication; tachyarrhythmia and glaucoma-related cautions may apply.",caution:"Adult/pediatric bradycardia doses are provided inside Crisis Mode where AHA source is explicit.",ref:"AHA 2025 for bradycardia; routine anesthesia indications locked pending Thai protocol",checked:1,category:"Anticholinergics & Antisecretory",categories:["Anticholinergics & Antisecretory"],drugClass:"Tertiary Amine Anticholinergic"},

{id:"metoclo",name:"Metoclopramide",phase:"PONV",context:"Antiemetic / prokinetic",sub:"",doseLocked:true,stock:5,stockUnit:"mg/mL",ci:"GI obstruction/perforation, pheochromocytoma, seizure disorders/tardive dyskinesia and product-specific contraindications.",caution:"Extrapyramidal reactions possible.",ref:"Dose locked — local/product PONV verification pending",checked:0,category:"Antiemetics (PONV)",categories:["Antiemetics (PONV)"],drugClass:"Dopamine D2 Receptor Antagonist / Prokinetic"},
{id:"droperidol",name:"Droperidol",phase:"PONV",context:"PONV prophylaxis/rescue",sub:"",doseLocked:true,stock:2.5,stockUnit:"mg/mL",ci:"QT prolongation-related contraindications/warnings.",caution:"ECG/QT risk and dose depend on local practice.",ref:"Dose locked — product/local PONV protocol verification pending",checked:0,category:"Antiemetics (PONV)",categories:["Antiemetics (PONV)"],drugClass:"Butyrophenone Antipsychotic / Antiemetic"},
{id:"haloperidol",name:"Haloperidol",phase:"PONV",category:"Antiemetics",context:"Antiemetic / agitation context",sub:"",doseLocked:true,stock:5,stockUnit:"mg/mL",ci:"QT prolongation, Parkinsonism/Lewy-body sensitivity and other product-specific contraindications.",caution:"Not a routine default PONV drug in all institutions.",ref:"Dose locked — local verification pending",checked:0},
{id:"dimen",name:"Dimenhydrinate",phase:"PONV",category:"Antiemetics",context:"PONV / motion-related nausea",sub:"",doseLocked:true,stock:50,stockUnit:"mg/mL",ci:"Anticholinergic/sedating adverse effects; age and formulation restrictions.",caution:"Local use varies.",ref:"Dose locked — product/local verification pending",checked:0},

{id:"lidocaine-la",name:"Lidocaine (Xylocaine)",phase:"Local",context:"Local / regional anesthesia",sub:"",doseLocked:true,stock:20,stockUnit:"mg/mL",ci:"Amide local-anesthetic hypersensitivity; dose depends on site, epinephrine use and patient factors.",caution:"Maximum safe dose depends on formulation, use of epinephrine, site and comorbidity. LAST risk applies.", checked:0,verification:"SOURCE_VERIFIED",verificationNote:"DailyMed adult maximum: without epinephrine 4.5 mg/kg, generally max 300 mg; with epinephrine 7 mg/kg, generally max 500 mg. Technique/site-specific dose tables still apply; pediatric maximum is age/weight dependent",ref:"DailyMed Lidocaine HCl Injection maximum dosage • ASRA LAST safety framework • Thai/local cross-check pending",category:"Local Anesthetics",categories:["Local Anesthetics"],drugClass:"Amide Local Anesthetic / Class IB Antiarrhythmic"},
{id:"bupiv",name:"Bupivacaine",phase:"Local",context:"Regional / infiltration",sub:"",doseLocked:true,stock:5,stockUnit:"mg/mL",ci:"Amide local-anesthetic hypersensitivity; obstetric paracervical block restrictions and formulation-specific warnings.",caution:"Cardiotoxicity/LAST risk; max dose highly context dependent.", checked:0,verification:"SOURCE_VERIFIED",verificationNote:"DailyMed adult guide: local infiltration up to 175 mg without epinephrine; peripheral block 25–175 mg without epinephrine; historical maximum single-dose experience up to 225 mg with epinephrine; total daily dose not to exceed 400 mg. Individualize by site/patient",ref:"DailyMed Bupivacaine HCl Injection dosage table • ASRA LAST safety framework • Thai/local cross-check pending",category:"Local Anesthetics",categories:["Local Anesthetics"],drugClass:"Amide Local Anesthetic (Long-acting)"},
{id:"ropi",name:"Ropivacaine",phase:"Local",context:"Regional / infusion",sub:"",doseLocked:true,stock:2,stockUnit:"mg/mL",ci:"Amide local-anesthetic hypersensitivity; route-specific contraindications.",caution:"Regional block and infusion doses differ.", checked:0,verification:"SOURCE_VERIFIED",verificationNote:"DailyMed adult tables are technique-specific: major nerve block 75–300 mg depending concentration/site; field block/infiltration up to 200 mg; postoperative epidural infusion 12–28 mg/h. No single universal dose should replace technique-specific records",ref:"DailyMed Ropivacaine HCl Injection dosage table • ASRA LAST safety framework • Thai/local cross-check pending",category:"Local Anesthetics",categories:["Local Anesthetics"],drugClass:"Amide Local Anesthetic (S-enantiomer)"},
{id:"levo",name:"Levobupivacaine",phase:"Local",context:"Regional / infiltration",sub:"",doseLocked:true,stock:5,stockUnit:"mg/mL",ci:"Amide local-anesthetic hypersensitivity; route-specific contraindications.",caution:"Max-dose and block-specific dosing require source verification.",ref:"ASRA regional-anesthesia safety framework • Thai product/local protocol verification pending",checked:0,category:"Local Anesthetics",categories:["Local Anesthetics"],drugClass:"Amide Local Anesthetic (S-enantiomer)"},

{id:"epi-inf",name:"Epinephrine",phase:"Hemodynamics",context:"Vasopressor / inotrope infusion",sub:"Vasopressor / inotrope",doseLocked:true,stock:1000,stockUnit:"mcg/mL",preferredTarget:20,preferredFinal:50,ci:"Tachyarrhythmia/ischemia risk; correct hypovolemia when appropriate.",caution:"Current U.S. label for septic-shock hypotension permits 0.05–2 mcg/kg/min, but perioperative dosing should remain local-protocol driven.",ref:"DailyMed epinephrine label updated 2026; perioperative default locked pending Thai reconciliation",checked:1,category:"Vasoactive & Inotropic Drugs",categories:["Vasoactive & Inotropic Drugs"],drugClass:"Potent Alpha/Beta Agonist / Inotrope"},
{id:"vasopressin",name:"Vasopressin",phase:"Hemodynamics",context:"Vasopressor infusion / rescue",sub:"Vasopressor",doseLocked:true,stock:20,stockUnit:"unit/mL",ci:"Ischemia and hyponatremia/water-balance effects; indication specific.",caution:"Not interchangeable with routine epinephrine algorithms; LAST specifically advises avoiding vasopressin.",ref:"Dose locked — indication/local protocol verification pending",checked:0,category:"Vasoactive & Inotropic Drugs",categories:["Vasoactive & Inotropic Drugs"],drugClass:"Non-adrenergic Vasopressor"},
{id:"dopamine",name:"Dopamine",phase:"Hemodynamics",category:"Vasoactive / Inotropes",context:"Inotrope / vasopressor infusion",sub:"Inotrope",doseLocked:true,stock:40,stockUnit:"mg/mL",ci:"Tachyarrhythmia/ischemia risk; product-specific contraindications.",caution:"Use has become more selective; local ICU/anesthesia practice varies.",ref:"Dose locked — product/local protocol verification pending",checked:0},
{id:"dobutamine",name:"Dobutamine",phase:"Hemodynamics",context:"Inotrope infusion",sub:"Inotrope",doseLocked:true,stock:12.5,stockUnit:"mg/mL",ci:"Tachyarrhythmia and dynamic outflow obstruction considerations.",caution:"Titrate to cardiac output/hemodynamic goals.",ref:"Dose locked — product/local protocol verification pending",checked:0,category:"Vasoactive & Inotropic Drugs",categories:["Vasoactive & Inotropic Drugs"],drugClass:"Inotropic Agent"},
{id:"milrinone",name:"Milrinone",phase:"Hemodynamics",context:"Inodilator infusion",sub:"Inotrope",doseLocked:true,stock:1,stockUnit:"mg/mL",ci:"Severe hypotension/arrhythmia risk; renal clearance important.",caution:"Loading dose may be omitted in unstable patients; institution dependent.",ref:"Dose locked — product/local protocol verification pending",checked:0,category:"Vasoactive & Inotropic Drugs",categories:["Vasoactive & Inotropic Drugs"],drugClass:"Inodilator (PDE-3 Inhibitor)"},

{id:"amio",name:"Amiodarone",phase:"Emergency",context:"Ventricular arrhythmia / arrest",sub:"",doseLocked:true,stock:50,stockUnit:"mg/mL",ci:"Product-specific bradycardia/QT/hemodynamic cautions.",caution:"Adult/pediatric arrest dosing appears in Crisis Mode when AHA algorithm is selected.",ref:"AHA 2025 in Crisis Mode; non-arrest dosing locked pending source reconciliation",checked:1,category:"Antihypertensives & Antiarrhythmics",categories:["Antihypertensives & Antiarrhythmics"],drugClass:"Class III Antiarrhythmic"},
{id:"lido-arr",name:"Lidocaine",phase:"Emergency",category:"Antiarrhythmics",context:"Ventricular arrhythmia / arrest alternative",sub:"",doseLocked:true,stock:20,stockUnit:"mg/mL",ci:"Severe conduction disease without pacing and product-specific contraindications.",caution:"AHA arrest dose is handled in Crisis Mode; non-arrest use differs.",ref:"AHA 2025 in Crisis Mode; other dosing locked",checked:1},
{id:"adenosine",name:"Adenosine",phase:"Emergency",category:"Antiarrhythmics",context:"Regular narrow-complex SVT",sub:"",doseLocked:true,stock:3,stockUnit:"mg/mL",ci:"High-grade AV block/sick sinus without pacemaker; bronchospasm caution.",caution:"Very short half-life; rapid IV push. Adult/pediatric algorithms differ.",ref:"Dose locked here — AHA tachycardia algorithm integration pending",checked:0},
{id:"magnesium",name:"Magnesium sulfate",phase:"Emergency",category:"Emergency / Electrolytes",context:"Torsades / electrolyte / obstetric contexts",sub:"",doseLocked:true,stock:500,stockUnit:"mg/mL",ci:"Severe renal impairment and hypermagnesemia-related concerns.",caution:"Indication-specific dosing differs widely.",ref:"Dose locked — AHA/obstetric/local protocols pending",checked:0},

{id:"salbutamol",name:"Salbutamol / Albuterol",phase:"Emergency",context:"Bronchospasm",sub:"",doseLocked:true,stock:1,stockUnit:"mg/mL",ci:"Tachyarrhythmia/hypokalemia risk; formulation-specific cautions.",caution:"Inhaled dose/device and pediatric/adult pathways differ.",ref:"Dose locked — respiratory/anesthesia local protocol verification pending",checked:0,category:"Respiratory & Emergency Adjuncts",categories:["Respiratory & Emergency Adjuncts"],drugClass:"Short-acting Beta-2 Agonist (SABA)"},
{id:"ipratropium",name:"Ipratropium",phase:"Emergency",category:"Bronchodilators",context:"Bronchospasm adjunct",sub:"",doseLocked:true,stock:.25,stockUnit:"mg/mL",ci:"Anticholinergic hypersensitivity/cautions.",caution:"Usually adjunctive to beta-agonist.",ref:"Dose locked — local protocol verification pending",checked:0},

{id:"calcium-glu",name:"Calcium gluconate",phase:"Emergency",context:"Hyperkalemia / hypocalcemia",sub:"",doseLocked:true,stock:100,stockUnit:"mg/mL",ci:"Hypercalcemia; extravasation risk lower than calcium chloride but still important.",caution:"Elemental calcium differs from calcium chloride; indications and dose vary.",ref:"Dose locked — AHA/Thai electrolyte protocol reconciliation pending",checked:0,category:"Respiratory & Emergency Adjuncts",categories:["Respiratory & Emergency Adjuncts"],drugClass:"Electrolyte / Myocardial Stabilizer"},
{id:"calcium-chloride",name:"Calcium chloride",phase:"Emergency",context:"Hyperkalemia / severe hypocalcemia",sub:"",doseLocked:true,stock:100,stockUnit:"mg/mL",ci:"Hypercalcemia; severe extravasation injury risk.",caution:"Contains more elemental calcium than gluconate; central access often preferred.",ref:"Dose locked — AHA/Thai electrolyte protocol reconciliation pending",checked:0,category:"Respiratory & Emergency Adjuncts",categories:["Respiratory & Emergency Adjuncts"],drugClass:"Electrolyte / Myocardial Stabilizer"},
{id:"bicarb",name:"Sodium bicarbonate",phase:"Emergency",category:"Emergency / Electrolytes",context:"Selected acidosis / hyperkalemia contexts",sub:"",doseLocked:true,stock:84,stockUnit:"mg/mL",ci:"Alkalosis/hypernatremia and context-specific contraindications.",caution:"Not routine for all cardiac arrests. MH/RCAT and hyperkalemia contexts differ.",ref:"Dose locked — context-specific AHA/RCAT/local protocol",checked:0},
{id:"dextrose",name:"Dextrose",phase:"Emergency",category:"Emergency / Metabolic",context:"Hypoglycemia",sub:"",doseLocked:true,stock:500,stockUnit:"mg/mL",ci:"Hyperglycemia/extravasation risk with concentrated solutions.",caution:"Concentration and dose differ markedly by neonate/child/adult.",ref:"Dose locked — Thai pediatric/adult emergency protocol reconciliation pending",checked:0},
{id:"insulin-reg",name:"Regular insulin",phase:"Emergency",category:"Emergency / Metabolic",context:"Hyperkalemia with glucose",sub:"",doseLocked:true,stock:100,stockUnit:"unit/mL",ci:"Hypoglycemia/hypokalemia risk.",caution:"AHA notes outcome evidence in hyperkalemic arrest is not well established; monitor glucose closely.",ref:"Dose locked — AHA 2025 Special Circumstances + Thai protocol pending",checked:0},

{id:"oxytocin",name:"Oxytocin",phase:"Obstetric",context:"Uterotonic",sub:"",doseLocked:true,stock:10,stockUnit:"unit/mL",ci:"Hemodynamic effects; product/context-specific cautions.",caution:"Bolus/infusion practice varies substantially; avoid a universal default.",ref:"Dose locked — obstetric anesthesia/local protocol verification pending",checked:0,category:"Obstetric Anesthesia Specific",categories:["Obstetric Anesthesia Specific"],drugClass:"Uterotonic Nonapeptide Hormone"},
{id:"methylergo",name:"Methylergometrine / Methylergonovine",phase:"Obstetric",context:"Uterotonic",sub:"",doseLocked:true,stock:.2,stockUnit:"mg/mL",ci:"Hypertension/preeclampsia and vascular disease are major concerns.",caution:"Route and dose are obstetric-protocol dependent.",ref:"Dose locked — obstetric local protocol verification pending",checked:0,category:"Obstetric Anesthesia Specific",categories:["Obstetric Anesthesia Specific"],drugClass:"Ergot Alkaloid Uterotonic"},
{id:"carboprost",name:"Carboprost",phase:"Obstetric",context:"Uterotonic",sub:"",doseLocked:true,stock:.25,stockUnit:"mg/mL",ci:"Asthma/bronchospasm risk is important.",caution:"Use in postpartum hemorrhage protocols; local obstetric verification required.",ref:"Dose locked — obstetric local protocol verification pending",checked:0,category:"Obstetric Anesthesia Specific",categories:["Obstetric Anesthesia Specific"],drugClass:"Prostaglandin F2-alpha Analog"},
{id:"txa",name:"Tranexamic acid",phase:"Emergency",context:"Bleeding / antifibrinolytic",sub:"",doseLocked:true,stock:100,stockUnit:"mg/mL",ci:"Thrombotic/seizure/renal considerations; indication-specific restrictions.",caution:"Trauma, cardiac surgery, obstetric and other perioperative regimens differ.",ref:"Dose locked — procedure-specific Thai protocol verification pending",checked:0}
,
{id:"mivacurium",name:"Mivacurium",phase:"NMB",context:"Neuromuscular blockade",sub:"Maintenance",doseLocked:true,stock:2,stockUnit:"mg/mL",ci:"Hypersensitivity; prolonged block with pseudocholinesterase deficiency or interacting drugs.",caution:"Stock sheet shows Mivacron/Nimbex-area NMB stock; exact product concentration and dosing must be verified locally.",ref:"Added from supplied OR stock sheet • dose locked pending RCAT/product verification",checked:0,category:"Neuromuscular Blocking Agents",categories:["Neuromuscular Blocking Agents"],drugClass:"Short-acting Benzylisoquinolinium NMBA"},
{id:"nefopam",name:"Nefopam (Acupan)",phase:"Post-op",category:"Analgesics",context:"Non-opioid analgesia",sub:"",doseLocked:true,stock:10,stockUnit:"mg/mL",ci:"Product-specific contraindications; seizure, anticholinergic and serotonergic cautions.",caution:"Sheet: ACUPAN INJ 20 mg/2 mL. IV/IM capable depending on local product instructions.",ref:"Supplied OR stock sheet • Thai product/local protocol verification pending",checked:0},
{id:"hyoscine-butyl",name:"Hyoscine butylbromide (Buscopan)",phase:"Other",category:"Antispasmodics",context:"Antispasmodic",sub:"",doseLocked:true,stock:20,stockUnit:"mg/mL",ci:"Anticholinergic/product-specific contraindications including selected glaucoma, tachyarrhythmia, obstruction or megacolon contexts.",caution:"Sheet: BUSCOPAN 20 mg/1 mL. Verify route and local perioperative indication.",ref:"Supplied OR stock sheet • Thai product/local protocol verification pending",checked:0},
{id:"chlorpheniramine",name:"Chlorpheniramine (CPM)",phase:"Emergency",category:"Antihistamines",context:"Allergic reaction adjunct",sub:"",doseLocked:true,stock:10,stockUnit:"mg/mL",ci:"Hypersensitivity and product-specific anticholinergic/sedation cautions.",caution:"Sheet: CPM inj 10 mg/1 mL. Antihistamine is adjunctive and must not delay epinephrine in anaphylaxis.",ref:"Supplied OR stock sheet • Thai product/local protocol verification pending",checked:0},
{id:"carbetocin",name:"Carbetocin (Duratocin)",phase:"Obstetric",category:"Obstetric anesthesia",context:"Uterotonic",sub:"",doseLocked:true,stock:.1,stockUnit:"mg/mL",ci:"Product-specific obstetric contraindications; hemodynamic effects possible.",caution:"Sheet: DURATOCIN 100 mcg/1 mL. Obstetric indication/dose requires local protocol verification.",ref:"Supplied OR stock sheet • obstetric protocol/product verification pending",checked:0},
{id:"dexketoprofen",name:"Dexketoprofen (Ketesse)",phase:"Post-op",category:"Analgesics / NSAIDs",context:"NSAID analgesia",sub:"",doseLocked:true,stock:25,stockUnit:"mg/mL",ci:"NSAID hypersensitivity, renal/GI bleeding risk and other product-specific contraindications.",caution:"Sheet: KETESSE 50 mg/2 mL. Verify Thai product route/dose and renal/bleeding precautions.",ref:"Supplied OR stock sheet • Thai product/local protocol verification pending",checked:0},
{id:"furosemide",name:"Furosemide (Lasix)",phase:"Other",category:"Diuretics",context:"Diuresis / selected fluid-overload contexts",sub:"",doseLocked:true,stock:10,stockUnit:"mg/mL",ci:"Severe electrolyte depletion/anuria and product-specific contraindications.",caution:"Sheet: LASIX 20 mg/2 mL. Dose is indication-, renal-function- and age-dependent.",ref:"Supplied OR stock sheet • Thai product/local protocol verification pending",checked:0},
{id:"naloxone",name:"Naloxone (Narcan)",phase:"Reversal",context:"Opioid reversal",sub:"",doseLocked:true,stock:.4,stockUnit:"mg/mL",ci:"No absolute contraindication in emergency opioid toxicity apart from hypersensitivity; acute withdrawal and pain reversal are important cautions.",caution:"Sheet: NARCAN (Naloxone) 0.4 mg/mL. Titrated perioperative reversal differs from resuscitation/toxicity dosing.",ref:"Supplied OR stock sheet • AHA/product/Thai anesthesia reconciliation pending",checked:0,category:"Reversal Agents & Antidotes",categories:["Reversal Agents & Antidotes"],drugClass:"Opioid Antagonist"},
{id:"nalbuphine-sebacate",name:"Nalbuphine sebacate ER (Naldebain)",phase:"Post-op",category:"Opioids",context:"Extended-release postoperative analgesia — IM only",sub:"",doseLocked:true,stock:75,stockUnit:"mg/mL",ci:"Opioid-related contraindications and product-specific restrictions.",caution:"Sheet: Naldebain ER 75 mg/mL 2 mL. This formulation is IM, not IV; keep distinct from nalbuphine HCl.",ref:"Supplied OR stock sheet • Thai product label verification required",checked:0},
{id:"triamcinolone",name:"Triamcinolone acetonide (Kenacort)",phase:"Other",category:"Corticosteroids",context:"IM / procedure-specific steroid use",sub:"",doseLocked:true,stock:40,stockUnit:"mg/mL",ci:"Systemic corticosteroid/product-specific contraindications and infection cautions.",caution:"Sheet: KENACORT 40 mg/1 mL. Route and indication are formulation specific.",ref:"Supplied OR stock sheet • Thai product/local protocol verification pending",checked:0},
{id:"methylpred-depot",name:"Methylprednisolone acetate (Depo-Medrol)",phase:"Other",category:"Corticosteroids",context:"IM / procedure-specific steroid use",sub:"",doseLocked:true,stock:40,stockUnit:"mg/mL",ci:"Systemic fungal infection and formulation/route-specific contraindications.",caution:"Sheet: Depo-Medrol 40 mg/mL. Depot suspension is NOT interchangeable with IV methylprednisolone sodium succinate.",ref:"Supplied OR stock sheet • formulation-specific route verification required",checked:0},
{id:"gentamicin",name:"Gentamicin",phase:"Other",category:"Antibiotics",context:"Perioperative antibiotic — selected indications",sub:"",doseLocked:true,stock:80,stockUnit:"mg/mL",ci:"Aminoglycoside hypersensitivity; nephrotoxicity/ototoxicity and neuromuscular-block potentiation cautions.",caution:"Sheet appears to list gentamicin injection. Dose depends on indication, weight and renal function.",ref:"Supplied OR stock sheet • antimicrobial stewardship/local protocol verification pending",checked:0},
{id:"cefazolin",name:"Cefazolin",phase:"Other",category:"Antibiotics",context:"Surgical antimicrobial prophylaxis",sub:"",doseLocked:true,stock:1000,stockUnit:"mg/vial",ci:"Cephalosporin hypersensitivity; beta-lactam allergy assessment required.",caution:"Sheet: Zefa 1 g inj (cefazolin). Prophylaxis dose/redosing depends on weight, procedure and local policy.",ref:"Supplied OR stock sheet • Thai surgical prophylaxis protocol verification pending",checked:0},
{id:"ceftriaxone",name:"Ceftriaxone",phase:"Other",category:"Antibiotics",context:"Antibiotic — selected perioperative indications",sub:"",doseLocked:true,stock:1000,stockUnit:"mg/vial",ci:"Cephalosporin hypersensitivity; neonatal calcium-related restrictions and product-specific contraindications.",caution:"Sheet appears to list ceftriaxone injection. Not a universal surgical prophylaxis default.",ref:"Supplied OR stock sheet • antimicrobial stewardship/local protocol verification pending",checked:0},
{id:"fosfomycin-iv",name:"Fosfomycin IV",phase:"Other",category:"Antibiotics",context:"Antibiotic — selected indications",sub:"",doseLocked:true,stock:2000,stockUnit:"mg/vial",ci:"Product-specific contraindications; sodium load/electrolyte considerations may apply.",caution:"Sheet: FOSMICIN 2 g inj. Use is indication- and local-antibiogram dependent.",ref:"Supplied OR stock sheet • antimicrobial stewardship/local protocol verification pending",checked:0}
,
{id:"lorazepam",name:"Lorazepam",phase:"Other",category:"Sedation / Premedication",context:"Premedication / prolonged anxiolysis / selected seizure contexts",sub:"Benzodiazepines",doseLocked:true,stock:2,stockUnit:"mg/mL",ci:"Benzodiazepine/product-specific contraindications; respiratory depression risk.",caution:"IV/IM-capable in the user-uploaded database. Dose varies by indication, age and formulation.",ref:"Added from user-uploaded medication database • dose locked pending product label + Thai/local verification",checked:0},
{id:"diazepam",name:"Diazepam",phase:"Other",context:"Premedication / seizure / muscle spasm contexts",sub:"Benzodiazepines",doseLocked:true,stock:5,stockUnit:"mg/mL",ci:"Benzodiazepine/product-specific contraindications; respiratory depression and prolonged sedation.",caution:"IV-capable in the user-uploaded database. Active metabolites cause prolonged effect.",ref:"Added from user-uploaded medication database • dose locked pending product label + Thai/local verification",checked:0,category:"Premedication & Anxiolytics",categories:["Premedication & Anxiolytics"],drugClass:"Long-acting Benzodiazepine"},
{id:"methohexital",name:"Methohexital",phase:"Induction",context:"Induction / ECT anesthesia",sub:"Intravenous induction agents",doseLocked:true,stock:10,stockUnit:"mg/mL",ci:"Barbiturate/product-specific contraindications.",caution:"IV-capable; particularly used in ECT in some settings. Concentration is formulation/preparation dependent.",ref:"Added from user-uploaded medication database • dose locked pending product label + Thai/local verification",checked:0,category:"Intravenous Induction Agents",categories:["Intravenous Induction Agents"],drugClass:"Oxybarbiturate"},
{id:"vecuronium",name:"Vecuronium",phase:"NMB",context:"Intubation / maintenance neuromuscular blockade",sub:"Non-depolarizing NMBA",doseLocked:true,stock:10,stockUnit:"mg/vial",ci:"Hypersensitivity; prolonged blockade with organ dysfunction/interacting medications.",caution:"IV bolus/infusion. Dose and reconstitution require product/local verification.",ref:"Added from user-uploaded medication database • dose locked pending product label + RCAT/local verification",checked:0,category:"Neuromuscular Blocking Agents",categories:["Neuromuscular Blocking Agents"],drugClass:"Non-depolarizing Steroidal NMBA"},
{id:"pancuronium",name:"Pancuronium",phase:"NMB",context:"Long-duration neuromuscular blockade",sub:"Non-depolarizing NMBA",doseLocked:true,stock:2,stockUnit:"mg/mL",ci:"Hypersensitivity; renal dysfunction and tachyarrhythmia-related caution.",caution:"Long-acting NMBA with vagolytic/tachycardic effects.",ref:"Added from user-uploaded medication database • dose locked pending product label + RCAT/local verification",checked:0,category:"Neuromuscular Blocking Agents",categories:["Neuromuscular Blocking Agents"],drugClass:"Long-acting Steroidal NMBA"},
{id:"flumazenil",name:"Flumazenil",phase:"Reversal",context:"Benzodiazepine reversal",sub:"Antidotes",doseLocked:true,stock:.1,stockUnit:"mg/mL",ci:"Seizure risk in chronic benzodiazepine use, mixed overdose or pro-convulsant co-ingestion; product-specific contraindications.",caution:"Shorter duration than many benzodiazepines; resedation is possible.",ref:"Added from user-uploaded medication database • dose locked pending product label + Thai/local verification",checked:0,category:"Reversal Agents & Antidotes",categories:["Reversal Agents & Antidotes"],drugClass:"Benzodiazepine Antagonist"},
{id:"dantrolene-lib",name:"Dantrolene",phase:"Emergency",context:"Malignant hyperthermia treatment",sub:"MH antidote",doseLocked:true,stock:20,stockUnit:"mg/vial",ci:"Product/formulation-specific contraindications; in MH emergency, treatment should not be delayed for routine cautions.",caution:"MH dosing is calculated in Crisis Mode using RCAT 2569 primary guidance. Library entry remains locked to avoid duplicate conflicting dose logic.",ref:"RCAT MH Guideline 2569 primary • MHAUS cross-check • user-uploaded database",checked:1,verification:"SOURCE_VERIFIED",verificationNote:"MH dose source verified in Crisis Mode using RCAT 2569 primary; library card remains dose locked to avoid duplicate/conflicting dose logic",category:"Reversal Agents & Antidotes",categories:["Reversal Agents & Antidotes"],drugClass:"Skeletal Muscle Relaxant / Emergency Antidote"},
{id:"lipid20",name:"Lipid Emulsion 20%",phase:"Emergency",context:"LAST rescue",sub:"LAST rescue",doseLocked:true,stock:20,stockUnit:"percent",ci:"Use in LAST according to crisis protocol; formulation/product considerations apply.",caution:"LAST dosing is calculated in Crisis Mode. Library entry remains locked to avoid duplicate dose logic.",ref:"ASRA LAST Checklist 2020 v1.1 • user-uploaded database",checked:1,verification:"SOURCE_VERIFIED",verificationNote:"LAST rescue dose source verified in Crisis Mode using ASRA LAST Checklist; library card remains dose locked to avoid duplicate dose logic",category:"Reversal Agents & Antidotes",categories:["Reversal Agents & Antidotes"],drugClass:"Lipid Sink / Resuscitation Rescue"},
{id:"sufentanil",name:"Sufentanil",phase:"Opioid",context:"High-potency intraoperative opioid / neuraxial adjunct",sub:"Opioids",doseLocked:true,stock:5,stockUnit:"mcg/mL",ci:"Opioid-related respiratory depression and product/route-specific contraindications.",caution:"IV and neuraxial routes exist; dosing differs substantially by route and indication.",ref:"Added from user-uploaded medication database • dose locked pending product label + Thai/local verification",checked:0,category:"Opioid Analgesics",categories:["Opioid Analgesics"],drugClass:"Thienyl Synthetic Opioid"},
{id:"hydromorphone",name:"Hydromorphone",phase:"Post-op",context:"Postoperative / PCA opioid analgesia",sub:"Opioids",doseLocked:true,stock:2,stockUnit:"mg/mL",ci:"Opioid contraindications; respiratory depression and renal/metabolite considerations.",caution:"IV-capable; potency and dosing must not be inferred from morphine.",ref:"Added from user-uploaded medication database • dose locked pending product label + Thai/local verification",checked:0,category:"Opioid Analgesics",categories:["Opioid Analgesics"],drugClass:"Semisynthetic Morphinan Opioid"},
{id:"mannitol",name:"Mannitol",phase:"Other",context:"Intracranial pressure / brain relaxation",sub:"Osmotic therapy",doseLocked:true,stock:200,stockUnit:"mg/mL",ci:"Anuria, severe pulmonary edema/dehydration and product-specific contraindications.",caution:"20% IV solution commonly used; monitor osmolality, electrolytes, renal function and volume status.",ref:"Added from user-uploaded medication database • dose locked pending neuroanesthesia/local verification",checked:0,category:"Neuroanesthesia & ICP Control",categories:["Neuroanesthesia & ICP Control"],drugClass:"Osmotic Diuretic"},
{id:"hypertonic-saline",name:"Hypertonic Saline",phase:"Other",context:"Intracranial hypertension / selected resuscitation contexts",sub:"Hyperosmolar therapy",doseLocked:true,stock:3,stockUnit:"percent",ci:"Hypernatremia and sodium/osmolality-related contraindications/cautions.",caution:"3% and 23.4% are different products with different access/dose conventions; never treat them as interchangeable.",ref:"Added from user-uploaded medication database • dose locked pending neurocritical care/local verification",checked:0,category:"Neuroanesthesia & ICP Control",categories:["Neuroanesthesia & ICP Control"],drugClass:"Osmotic Hypertonic Crystalloid"},
{id:"protamine",name:"Protamine Sulfate",phase:"Emergency",context:"Unfractionated heparin reversal",sub:"Antidote / coagulation",doseLocked:true,stock:10,stockUnit:"mg/mL",ci:"Severe hypersensitivity risk; pulmonary vasoconstriction/hypotension with rapid administration.",caution:"Dose depends on recent heparin exposure and time since administration. Slow IV administration.",ref:"Added from user-uploaded medication database • dose locked pending cardiac/vascular local protocol verification",checked:0,category:"Hemostatic Agents & Blood Management",categories:["Hemostatic Agents & Blood Management"],drugClass:"Heparin Antagonist"},
{id:"pcc",name:"Prothrombin Complex Concentrate (4-factor PCC)",phase:"Emergency",context:"Urgent vitamin K antagonist reversal / selected major bleeding",sub:"Coagulation factor concentrate",doseLocked:true,stock:500,stockUnit:"units/vial",ci:"Thromboembolic risk; product-specific contraindications including HIT/heparin content for some products.",caution:"Dose depends on indication, INR, weight and product. Must follow institutional blood-management protocol.",ref:"Added from user-uploaded medication database • dose locked pending product/local blood-management verification",checked:0,category:"Hemostatic Agents & Blood Management",categories:["Hemostatic Agents & Blood Management"],drugClass:"4-Factor Coagulation Concentrate"},

{id:"tetracaine",name:"Tetracaine",phase:"Local",context:"Spinal / topical regional anesthesia",sub:"Ester local anesthetic",doseLocked:true,stock:10,stockUnit:"mg/mL",ci:"Ester local-anesthetic hypersensitivity and formulation/route-specific contraindications.",caution:"Intrathecal/topical use differs by product. LAST and neuraxial safety principles apply.",ref:"User-uploaded database • ASRA regional-anesthesia safety references • dose locked pending product + Thai/local verification",checked:0,category:"Local Anesthetics",categories:["Local Anesthetics"],drugClass:"Ester Local Anesthetic"},
{id:"chloroprocaine",name:"Chloroprocaine",phase:"Local",context:"Epidural / selected short-duration spinal anesthesia",sub:"Ester local anesthetic",doseLocked:true,stock:30,stockUnit:"mg/mL",ci:"Ester local-anesthetic hypersensitivity and route/formulation-specific contraindications.",caution:"Very short acting; neuraxial formulation requirements matter. LAST and neuraxial safety principles apply.",ref:"User-uploaded database • ASRA regional-anesthesia safety references • dose locked pending product + Thai/local verification",checked:0,category:"Local Anesthetics",categories:["Local Anesthetics"],drugClass:"Ultra-short Ester Local Anesthetic"},
{id:"mepivacaine",name:"Mepivacaine",phase:"Local",category:"Local anesthetics",context:"Peripheral nerve block / infiltration / regional anesthesia",sub:"Amide local anesthetic",doseLocked:true,stock:20,stockUnit:"mg/mL",ci:"Amide local-anesthetic hypersensitivity and route/product-specific contraindications.",caution:"Added to broaden the Local Anesthetic library. Maximum dose is context dependent and intentionally locked.",ref:"ASRA regional-anesthesia safety framework • product + Thai/local dose verification required",checked:0},
{id:"prilocaine",name:"Prilocaine",phase:"Local",category:"Local anesthetics",context:"Regional / infiltration — product dependent",sub:"Amide local anesthetic",doseLocked:true,stock:10,stockUnit:"mg/mL",ci:"Amide local-anesthetic hypersensitivity; methemoglobinemia risk is clinically important.",caution:"Product availability and route vary. Maximum dose is intentionally locked.",ref:"ASRA regional-anesthesia safety framework • product + Thai/local dose verification required",checked:0}

];

let sex="Female", years=30, months=0, ageMode="years", weight=60, height=165, activeStep="age", dilutionDrug=null;
function fmt(n){if(n==null||!isFinite(n))return"—";return n>=100?n.toFixed(0):n>=10?n.toFixed(1):n.toFixed(2).replace(/0+$/,"").replace(/\.$/,"")}
function agegroup(){let t=years*12+months;return t<1?"Neonate":t<12?"Infant":years<13?"Child":years<18?"Adolescent":years<65?"Adult":"Elderly"}
function setStep(s){activeStep=s;document.querySelectorAll(".wstep").forEach(x=>x.classList.remove("show"));$("step-"+s).classList.add("show");document.querySelectorAll(".progress button").forEach(b=>b.classList.toggle("active",b.dataset.step===s))}
document.querySelectorAll(".progress button").forEach(b=>b.onclick=()=>setStep(b.dataset.step));

$("female").onclick=()=>{sex="Female";$("female").classList.add("selected");$("male").classList.remove("selected");sync()};
$("male").onclick=()=>{sex="Male";$("male").classList.add("selected");$("female").classList.remove("selected");sync()};
document.querySelector(".nextSex").onclick=()=>setStep("age");
$("ageYearsBtn").onclick=()=>{ageMode="years";$("ageYearsBtn").classList.add("selected");$("ageMonthsBtn").classList.remove("selected");sync()};
$("ageMonthsBtn").onclick=()=>{ageMode="months";$("ageMonthsBtn").classList.add("selected");$("ageYearsBtn").classList.remove("selected");sync()};
$("ageNext").onclick=()=>setStep("weight");
$("weightNext").onclick=()=>setStep("height");
$("heightNext").onclick=()=>{sync();document.querySelector('[data-tab="plan"]').click()};

function makePad(el,target){
 ["1","2","3","4","5","6","7","8","9",".","0","⌫"].forEach(k=>{
  let b=document.createElement("button");b.type="button";b.textContent=k;b.onclick=()=>pad(target,k);el.appendChild(b);
 });
}
document.querySelectorAll(".keypad").forEach(el=>makePad(el,el.dataset.target));
function pad(target,k){
 let cur=target==="age"?(ageMode==="years"?String(years):String(months)):target==="weight"?String(weight):String(height);
 if(k==="⌫")cur=cur.slice(0,-1)||"0"; else if(k==="."&&!cur.includes("."))cur+="."; else if(k!==".")cur=(cur==="0"?k:cur+k);
 let n=parseFloat(cur); if(!isFinite(n))n=0;
 if(target==="age"){if(ageMode==="years")years=Math.min(120,Math.floor(n));else months=Math.min(11,Math.floor(n))}
 if(target==="weight")weight=Math.min(500,n);
 if(target==="height")height=Math.min(250,n);
 sync();
}
function sync(){
 $("sexMini").textContent=(sex==="Female"?"👩 ":"👨 ")+sex;
 $("ageMini").textContent=`${years} yr ${months?months+" mo":""}`;
 $("weightMini").textContent=`${fmt(weight)} kg`; $("heightMini").textContent=`${fmt(height)} cm`;
 $("ageValue").textContent=ageMode==="years"?years:months; $("ageUnit").textContent=ageMode==="years"?"years":"months";
 $("weightValue").textContent=fmt(weight); $("heightValue").textContent=fmt(height);
 let ag=agegroup(),bmi=weight&&height?weight/(height/100)**2:0,bsa=weight&&height?Math.sqrt(weight*height/3600):0;
 $("ag").textContent=ag;$("bmi").textContent=bmi?bmi.toFixed(1):"—";$("bsa").textContent=bsa?bsa.toFixed(2)+" m²":"—";
 $("chip").textContent=`${ag} • ${fmt(weight)} kg`;$("cchip").textContent=`${ag} • ${fmt(weight)} kg`;
 let dw=derivedWeights();
 ["p","plan"].forEach(prefix=>{let a=$(prefix+"TBW"),i=$(prefix+"IBW"),l=$(prefix+"LBW"),ad=$(prefix+"AdjBW");if(a)a.textContent=fmt(dw.TBW)+" kg";if(i)i.textContent=fmt(dw.IBW)+" kg";if(l)l.textContent=fmt(dw.LBW)+" kg";if(ad)ad.textContent=fmt(dw.AdjBW)+" kg";});
 render(); crisis();
}
// In-app navigation history. This changes views without reloading the page, so patient inputs and local edits stay intact.
const appNavHistory=[];
let appApplyingHistory=false;
function activeTabId(){return document.querySelector(".tab.on")?.id||"patient"}
function currentAppView(){
  const detailOpen=document.getElementById("drugDetail")?.classList.contains("open");
  return {tab:activeTabId(),detail:detailOpen?selectedDrugId:null};
}
function sameAppView(a,b){return !!a&&!!b&&a.tab===b.tab&&a.detail===b.detail}
function updateAppBackBtn(){
  const b=$("appBackBtn"); if(!b)return;
  b.disabled=appNavHistory.length===0;
  b.classList.toggle("isDisabled",appNavHistory.length===0);
}
function rememberAppView(){
  if(appApplyingHistory)return;
  const now=currentAppView(), last=appNavHistory[appNavHistory.length-1];
  if(!sameAppView(now,last))appNavHistory.push(now);
  if(appNavHistory.length>30)appNavHistory.shift();
  updateAppBackBtn();
}
function showAppTab(tabId,remember=true){
  if(!$(tabId))return;
  const now=currentAppView();
  if(remember && now.tab!==tabId)rememberAppView();
  document.querySelectorAll(".tab").forEach(t=>t.classList.remove("on"));
  document.querySelectorAll("nav button").forEach(t=>t.classList.remove("on"));
  $(tabId).classList.add("on");
  document.querySelector(`nav button[data-tab="${tabId}"]`)?.classList.add("on");
  if(tabId!=="library")document.getElementById("drugDetail")?.classList.remove("open");
  updateAppBackBtn();
}
function applyAppView(v){
  if(!v)return;
  appApplyingHistory=true;
  showAppTab(v.tab||"patient",false);
  document.getElementById("drugDetail")?.classList.remove("open");
  if(v.tab==="library"&&v.detail)openGenericDrugDetail(encodeURIComponent(v.detail),false);
  appApplyingHistory=false;
  updateAppBackBtn();
}
function goAppBack(){
  const openDlg=[...document.querySelectorAll("dialog[open]")].pop();
  if(openDlg){openDlg.close();return;}
  if(!appNavHistory.length)return;
  const prev=appNavHistory.pop();
  applyAppView(prev);
}
window.goAppBack=goAppBack;
document.querySelectorAll("nav button").forEach(b=>b.onclick=()=>showAppTab(b.dataset.tab,true));
if($("appBackBtn"))$("appBackBtn").onclick=goAppBack;
updateAppBackBtn();


function recordsForPhase(d,phase){
 d=classifiedDrug(d);
 let recs=d.dosingRecords||[];
 if(recs.length)return recs.filter(r=>r.phase===phase);
 if((d.phases||[d.phase]).includes(phase))return [{phase,context:d.context,min:d.min,max:d.max,def:d.def,unit:d.unit,stock:d.stock,stockUnit:d.stockUnit,ref:d.ref}];
 return [];
}
function drugForRecord(d,r){
 return {...effectiveDrug(d),
   phase:r.phase||d.phase,
   context:r.context||d.context,
   min:r.min??d.min,max:r.max??d.max,def:r.def??d.def,unit:r.unit||d.unit,
   stock:r.stock??d.stock,stockUnit:r.stockUnit||d.stockUnit,
   ref:r.ref||d.ref,
   dosingWeight:r.dosingWeight||r.dosing_weight||d.dosingWeight||d.dosing_weight||"TBW",
   dosingWeightFormula:r.dosingWeightFormula||r.dosing_weight_formula||d.dosingWeightFormula||d.dosing_weight_formula||"",
   recordPhase:r.phase||d.phase
 };
}
function derivedWeights(){
 const h=height/100, bmi=(weight>0&&h>0)?weight/(h*h):null;
 // IBW: Lemmens et al. 2005 (22 × height²); LBW: Janmahasatian et al. 2005.
 const ibw=h>0?22*h*h:null;
 let lbw=null;
 if(bmi&&weight>0){
   lbw=sex==="Male"?(9270*weight)/(6680+216*bmi):(9270*weight)/(8780+244*bmi);
 }
 // v0.62: AdjBW is only meaningful when TBW > IBW. When TBW <= IBW the
 // conventional practice is to dose on actual body weight, not a value
 // below the patient's real weight.
 let adjbw=null, adjbwFallback=false;
 if(ibw!=null){
   if(weight>ibw){adjbw=ibw+0.4*(weight-ibw)}
   else{adjbw=weight;adjbwFallback=true}
 }
 return {TBW:weight,IBW:ibw,LBW:lbw,AdjBW:adjbw,bmi,adjbwFallback};
}
function normalizeWeightBasis(v){
 const x=String(v||"TBW").trim().toUpperCase();
 if(["ACTUAL","ABW","ACTUAL BODY WEIGHT"].includes(x))return "TBW";
 if(x==="ADJBW"||x==="ADJUSTED"||x==="ADJUSTED BODY WEIGHT")return "AdjBW";
 return ["TBW","IBW","LBW"].includes(x)?x:"TBW";
}
function weightBasisInfo(d){
 const basis=normalizeWeightBasis(d.dosingWeight||d.dosing_weight||d.weightBasis||"TBW"), w=derivedWeights(), kg=w[basis];
 const labels={TBW:"Actual Body Weight",IBW:"IBW (Lemmens BMI-22)",LBW:"Lean Body Weight",AdjBW:"Adjusted Body Weight"};
 const formulas={TBW:"Patient-entered actual weight",IBW:"Lemmens (2005): 22 × height²",LBW:"Janmahasatian (2005)",AdjBW:"IBW + 0.4 × (TBW − IBW)"};
 let formula=formulas[basis];
 if(basis==="AdjBW"&&w.adjbwFallback)formula="TBW ≤ IBW — actual body weight used";
 return {basis,label:labels[basis],formula,kg};
}

/* ============================================================
   v0.62 UNIT ENGINE
   Previously calc() divided the dose by the stock concentration
   without checking that the dose unit and the stock unit matched.
   A mcg/kg dose against a mg/mL stock produced a 1000-fold volume
   error (e.g. esmolol 250 mcg/kg with 10 mg/mL stock reported
   1500 mL instead of 1.5 mL).
   Every mass unit is now normalised to mg before the division, and
   any stock unit that is not a mass-per-mL (unit/mL, mg/vial,
   percent) reports no volume at all instead of a meaningless number.
   ============================================================ */
const MASS_TO_MG={mcg:0.001,"µg":0.001,ug:0.001,mg:1,g:1000,gram:1000};
function massFactor(u){
 const x=String(u||"").trim().toLowerCase().split("/")[0].trim();
 return Object.prototype.hasOwnProperty.call(MASS_TO_MG,x)?MASS_TO_MG[x]:null;
}
function stockIsPerMl(u){return /\/\s*m\s*l\s*$/i.test(String(u||"").trim())}
function doseUnitLabel(u){
 const x=String(u||"").trim().split("/")[0].trim();
 return x||"mg";
}
function calc(d){
 const wb=weightBasisInfo(d);
 const du=d.unit||"", su=d.stockUnit||"";
 const perKg=du.includes("/kg");
 const total=perKg?d.def*wb.kg:d.def;
 const rate=du.includes("/hr")||du.includes("/min");
 const unit=doseUnitLabel(du);

 const df=massFactor(du), sf=massFactor(su);
 const stockOk=isFinite(d.stock)&&d.stock>0;
 const perMl=stockIsPerMl(su);
 const convertible=df!=null&&sf!=null;
 const volAvailable=convertible&&perMl&&stockOk&&isFinite(total);

 // dose expressed in the same mass unit as the stock concentration
 const totalInStockUnit=convertible&&isFinite(total)?total*(df/sf):null;
 const vol=volAvailable?totalInStockUnit/d.stock:null;

 let volNote="";
 if(!volAvailable){
   if(!convertible)volNote=`Stock unit "${su||"—"}" is not a mass concentration — volume must be worked out from the product label.`;
   else if(!perMl)volNote=`Stock is expressed per ${String(su).split("/")[1]||"unit"}, not per mL — reconstitute first, then enter the resulting mg/mL.`;
   else if(!stockOk)volNote="Stock concentration is missing or zero.";
 }

 return{
   total,rate,unit,vol,
   totalInStockUnit,
   volAvailable,
   volNote,
   unitConverted:convertible&&df!==sf,
   stockUnit:su,
   weightBasis:wb
 };
}

let dilutionPrefs=JSON.parse(localStorage.getItem("anesthDilutionPrefs")||"{}");
let stockPrefs=JSON.parse(localStorage.getItem("anesthStockPrefs")||"{}");
D.forEach(d=>{if(stockPrefs[d.id]){d.stock=+stockPrefs[d.id].stock||d.stock;d.stockUnit=stockPrefs[d.id].stockUnit||d.stockUnit}});
window.setStock=(id,v)=>{let d=findDrug(id),n=parseFloat(v);if(!d||!isFinite(n)||n<=0)return;d.stock=n;stockPrefs[id]={stock:d.stock,stockUnit:d.stockUnit};localStorage.setItem("anesthStockPrefs",JSON.stringify(stockPrefs));render()};
window.setStockUnit=(id,u)=>{let d=findDrug(id);if(!d)return;d.stockUnit=u;stockPrefs[id]={stock:d.stock,stockUnit:u};localStorage.setItem("anesthStockPrefs",JSON.stringify(stockPrefs));render()};
function workingLine(d,c){
 let p=dilutionPrefs[d.id];if(!p||!p.target)return ``;
 // v0.62: the prepared concentration is expressed in the stock unit, so the
 // dose must be converted into that same unit before dividing.
 let base=c.totalInStockUnit;
 let per=c.rate?(d.unit.includes("/hr")?"/hr":"/min"):"";
 let drawLine=(base==null||!isFinite(base))
   ? `<b class="verify">DRAW / ADMINISTER — not computable (${esc(c.volNote||"unit mismatch")})</b>`
   : `<b>DRAW / ADMINISTER ${fmt(base/p.target)} mL${per}</b>`;
 return `<div class="working">Prepared: <b>${fmt(p.target)} ${esc(d.stockUnit)}</b> (${fmt(p.drugVol)} mL drug + ${fmt(p.dilVol)} mL ${esc(p.diluent)}, final ${fmt(p.final)} mL)<br>${drawLine}</div>`;
}

let hiddenDrugs=JSON.parse(localStorage.getItem("anesthHiddenDrugs")||"[]");

let archivedLocalDrugs=JSON.parse(localStorage.getItem("anesthArchivedLocalDrugs")||"[]");
let libraryLifecycleView=localStorage.getItem("anesthLibraryLifecycleView")||"active";
function saveArchivedLocalDrugs(){localStorage.setItem("anesthArchivedLocalDrugs",JSON.stringify(archivedLocalDrugs))}
function isDrugArchived(d){return !!(d && (d.active===false || d.cloudActive===false || archivedLocalDrugs.includes(d.id)))}


let stockOverrides=JSON.parse(localStorage.getItem("anesthStockOverrides")||"{}");
function saveStockOverrides(){localStorage.setItem("anesthStockOverrides",JSON.stringify(stockOverrides))}
function applyStockOverride(d){
  let o=stockOverrides[d.id];
  if(!o)return d;
  return {...d,stock:+o.stock,stockUnit:o.stockUnit||d.stockUnit,stockOverridden:true};
}
window.setStockOverride=(id,stock,unit)=>{
  let n=parseFloat(stock);
  if(!Number.isFinite(n)||n<=0){alert("Stock concentration must be greater than 0.");return false}
  stockOverrides[id]={stock:n,stockUnit:(unit||"").trim()};
  saveStockOverrides();
  return true;
};
window.resetStockOverride=(id)=>{
  delete stockOverrides[id];
  saveStockOverrides();
  render();
  renderLibraryCompact();
  if(selectedDrugId){
    let g=genericGroups().get(selectedDrugId);
    if(g?.some(x=>x.id===id))openGenericDrugDetail(encodeURIComponent(selectedDrugId));
  }
};


let hiddenPlanPhaseDrugs=JSON.parse(localStorage.getItem("anesthHiddenPlanPhaseDrugs")||"{}");
function phaseHiddenIds(phase){return hiddenPlanPhaseDrugs[phase]||[]}
function savePhaseHidden(){localStorage.setItem("anesthHiddenPlanPhaseDrugs",JSON.stringify(hiddenPlanPhaseDrugs))}
window.hideDrugInPhase=(id,phase)=>{
 let a=phaseHiddenIds(phase);
 if(!a.includes(id))a.push(id);
 hiddenPlanPhaseDrugs[phase]=a;
 savePhaseHidden();
 render();
};
window.unhideDrugInPhase=(id,phase)=>{
 hiddenPlanPhaseDrugs[phase]=phaseHiddenIds(phase).filter(x=>x!==id);
 savePhaseHidden();
 render();
};


let localDrugs=JSON.parse(localStorage.getItem("anesthLocalDrugs")||"[]");
let cloudDrugs=[];


let classificationOverrides=JSON.parse(localStorage.getItem("anesthClassificationOverrides")||"{}");
let multiClassOverrides=JSON.parse(localStorage.getItem("anesthMultiClassOverrides")||"{}");

let customCategories=JSON.parse(localStorage.getItem("anesthCustomCategories")||"[]");

const CANONICAL_CATEGORIES=["Premedication & Anxiolytics", "Intravenous Induction Agents", "Inhalational Anesthetics", "Neuromuscular Blocking Agents", "Reversal Agents & Antidotes", "Opioid Analgesics", "Non-Opioid Analgesics & Co-analgesics", "Local Anesthetics", "Vasoactive & Inotropic Drugs", "Antihypertensives & Antiarrhythmics", "Antiemetics (PONV)", "Anticholinergics & Antisecretory", "Obstetric Anesthesia Specific", "Neuroanesthesia & ICP Control", "Hemostatic Agents & Blood Management", "Respiratory & Emergency Adjuncts"];
const CATEGORY_ALIASES={"Opioids": "Opioid Analgesics", "Analgesics / Opioids": "Opioid Analgesics", "Opioid / Analgesia": "Opioid Analgesics", "Opioid analgesics": "Opioid Analgesics", "Analgesics": "Non-Opioid Analgesics & Co-analgesics", "Analgesics / NSAIDs": "Non-Opioid Analgesics & Co-analgesics", "Non-opioid analgesia": "Non-Opioid Analgesics & Co-analgesics", "Anesthesia / Sedation": "Intravenous Induction Agents", "Sedation / Premedication": "Premedication & Anxiolytics", "Premedication": "Premedication & Anxiolytics", "Induction": "Intravenous Induction Agents", "Neuromuscular blockers": "Neuromuscular Blocking Agents", "NMB": "Neuromuscular Blocking Agents", "Reversal": "Reversal Agents & Antidotes", "Reversal / Antidotes": "Reversal Agents & Antidotes", "Hemodynamics": "Vasoactive & Inotropic Drugs", "Vasoactive / Inotropes": "Vasoactive & Inotropic Drugs", "Vasopressor": "Vasoactive & Inotropic Drugs", "Inotrope": "Vasoactive & Inotropic Drugs", "Antihypertensive": "Antihypertensives & Antiarrhythmics", "Antihypertensive / rate control": "Antihypertensives & Antiarrhythmics", "Antiarrhythmics": "Antihypertensives & Antiarrhythmics", "Antiemetics": "Antiemetics (PONV)", "PONV": "Antiemetics (PONV)", "Anticholinergics": "Anticholinergics & Antisecretory", "Local anesthetics": "Local Anesthetics", "Obstetric anesthesia": "Obstetric Anesthesia Specific", "Hemostasis": "Hemostatic Agents & Blood Management", "Emergency / Electrolytes": "Respiratory & Emergency Adjuncts", "Emergency / Metabolic": "Respiratory & Emergency Adjuncts", "Bronchodilators": "Respiratory & Emergency Adjuncts", "Neuroanesthesia / ICP control": "Neuroanesthesia & ICP Control"};

function canonicalizeCategory(c){
  if(!c)return "Other";
  return CATEGORY_ALIASES[c]||c;
}
function migrateCategoryState(){
  // Normalize legacy single-category overrides
  Object.keys(classificationOverrides||{}).forEach(id=>{
    let o=classificationOverrides[id];
    if(o?.category)o.category=canonicalizeCategory(o.category);
  });

  // Normalize v0.19+ multi-category overrides and deduplicate aliases
  Object.keys(multiClassOverrides||{}).forEach(id=>{
    let o=multiClassOverrides[id];
    if(Array.isArray(o?.categories)){
      o.categories=[...new Set(o.categories.map(canonicalizeCategory))];
    }
  });

  // Remove old duplicate custom-category names that map into canonical categories.
  customCategories=[...new Set((customCategories||[]).map(canonicalizeCategory))]
    .filter(c=>!CANONICAL_CATEGORIES.includes(c));

  localStorage.setItem("anesthClassificationOverrides",JSON.stringify(classificationOverrides||{}));
  localStorage.setItem("anesthMultiClassOverrides",JSON.stringify(multiClassOverrides||{}));
  localStorage.setItem("anesthCustomCategories",JSON.stringify(customCategories));
}
migrateCategoryState();

function saveClassifications(){localStorage.setItem("anesthClassificationOverrides",JSON.stringify(classificationOverrides));localStorage.setItem("anesthCustomCategories",JSON.stringify(customCategories))}
function classifiedDrug(d){
 let legacy=classificationOverrides[d.id]||null;
 let o=multiClassOverrides[d.id]||null;
 let categories=o?.categories?.length?o.categories:(legacy?.category?[legacy.category]:(d.categories?.length?d.categories:[d.category||drugCategoryBase(d)]));
 let phases=o?.phases?.length?o.phases:(legacy?.phase?[legacy.phase]:(d.phases?.length?d.phases:[d.phase||"Other"]));
 let records=o?.records?.length?o.records:(d.dosingRecords?.length?d.dosingRecords:null);
 return {...d,
   categories,
   phases,
   category:categories[0]||d.category,
   phase:phases[0]||d.phase,
   sub:o?.sub??legacy?.sub??d.sub,
   dosingRecords:records,
   classificationOverride:!!(o||legacy)
 };
}

function saveLocalDrugs(){localStorage.setItem("anesthLocalDrugs",JSON.stringify(localDrugs))}
function allDrugs(){return [...D,...localDrugs,...cloudDrugs].map(classifiedDrug)}
window.getEvidenceMatcherDrugs=()=>{
 const seen=new Map();
 for(const d of allDrugs()){
   const name=String(d.name||d.generic_name||d.display_name||'').trim();
   if(!name)continue;
   const key=name.toLowerCase().replace(/[^a-z0-9ก-๙]+/g,'');
   const cloudId=d.cloudId||(/^cloud-/.test(String(d.id||''))?String(d.id).slice(6):null);
   const row={
     id:cloudId||null,
     app_id:d.id||null,
     generic_name:name,
     display_name:name,
     source:cloudId?'cloud':(isLocalDrug(d.id)?'local':'built_in'),
     phase:d.phase||null,
     indication:d.context||null,
     route:d.route||null
   };
   if(!seen.has(key) || row.source==='cloud')seen.set(key,row);
 }
 return [...seen.values()];
};

window.getEvidenceMatcherDoseRecords=()=>{
 const rows=[];
 for(const d0 of allDrugs()){
   const d=classifiedDrug(d0);
   const name=String(d.name||d.generic_name||d.display_name||'').trim();
   if(!name)continue;
   const records=Array.isArray(d.dosingRecords)&&d.dosingRecords.length
     ? d.dosingRecords
     : [{
         phase:d.phase||'Other',context:d.context||'',min:d.min,max:d.max,def:d.def,
         unit:d.unit,stock:d.stock,stockUnit:d.stockUnit,route:d.route||'',
         population:d.population||'adult',dosingWeight:d.dosingWeight||'TBW',
         dosingWeightFormula:d.dosingWeightFormula||null,cloudDoseId:d.cloudDoseId||null
       }];
   for(const r of records){
     rows.push({
       source:r.cloudDoseId?'cloud':(isLocalDrug(d.id)?'local':'built_in'),
       app_drug_id:d.id||null,
       cloud_drug_id:d.cloudId||null,
       cloud_dose_id:r.cloudDoseId||null,
       generic_name:name,
       phase:r.phase||d.phase||'Other',
       indication:r.context||d.context||'',
       route:r.route||d.route||'',
       population:r.population||'adult',
       dose_min:r.min??null,
       dose_default:r.def??null,
       dose_max:r.max??null,
       dose_unit:r.unit||null,
       stock_concentration:r.stock??null,
       stock_unit:r.stockUnit||null,
       dosing_weight:r.dosingWeight||'TBW',
       dosing_weight_formula:r.dosingWeightFormula||null
     });
   }
 }
 return rows;
};

window.setCloudLibrary=(arr)=>{cloudDrugs=Array.isArray(arr)?arr:[]; try{renderCatFilters();render();renderLibraryCompact();}catch(e){console.warn(e)}};
function findDrug(id){return allDrugs().find(d=>d.id===id)}
function isLocalDrug(id){return localDrugs.some(d=>d.id===id)}


let verifiedDrugs=JSON.parse(localStorage.getItem("anesthVerifiedDrugs")||"{}");

let verifiedDoseRecords=JSON.parse(localStorage.getItem("anesthVerifiedDoseRecords")||"{}");

function verificationRecordKey(id,phase="",context=""){
  return [id,phase||"",context||""].join("||");
}
function saveVerifiedDoseRecords(){
  localStorage.setItem("anesthVerifiedDoseRecords",JSON.stringify(verifiedDoseRecords));
}
function localVerificationFor(d){
  let key=verificationRecordKey(d.id,d.recordPhase||d.phase||"",d.context||"");
  return {key,value:verifiedDoseRecords[key]||null};
}
function applyRecordVerification(d){
  let {value:v}=localVerificationFor(d);
  if(!v)return d;
  return {...d,
    doseLocked:false,
    min:+v.min,max:+v.max,def:+v.def,unit:v.unit,
    stock:+v.stock,stockUnit:v.stockUnit,
    preferredTarget:v.target!==""&&v.target!=null?+v.target:d.preferredTarget,
    preferredFinal:v.finalVol!==""&&v.finalVol!=null?+v.finalVol:d.preferredFinal,
    ref:"LOCAL VERIFIED • "+v.reference+" • "+v.version+" • "+v.location+" • "+v.verifiedAt,
    dosingWeight:v.dosingWeight||d.dosingWeight||"TBW",
    checked:1,localVerified:true,localVerification:v
  };
}

function saveVerified(){localStorage.setItem("anesthVerifiedDrugs",JSON.stringify(verifiedDrugs))}
function effectiveDrug(d){
 let v=verifiedDrugs[d.id];
 let out=d;
 if(v)out={...d,doseLocked:false,min:+v.min,max:+v.max,def:+v.def,unit:v.unit,stock:+v.stock,stockUnit:v.stockUnit,
   ref:"LOCAL VERIFIED (legacy) • "+v.reference+" • "+v.version+" • "+v.location+" • "+v.date,checked:1,localVerified:true};
 out=applyRecordVerification(out);
 return applyStockOverride(out);
}

window.openVerify=(id,phase="",context="")=>{
 let raw=findDrug(id);if(!raw)return;
 let d={...raw,recordPhase:phase||raw.phase,context:context||raw.context};
 d=effectiveDrug(d);
 let key=verificationRecordKey(id,d.recordPhase||d.phase||"",d.context||"");
 let old=verifiedDoseRecords[key]||{};
 let box=document.createElement("dialog");
 box.innerHTML=`<form class="verifyForm" onsubmit="return false">
 <div class="head"><h2>Local Verify — ${d.name}</h2><button type="button" onclick="this.closest('dialog').close()">✕</button></div>
 <div class="note"><b>${d.recordPhase||d.phase||"Dose record"}</b> • ${d.context||"No context"}<br>
 This verifies only this dose record (phase + indication) on this device. It does not verify the other dose records for the same drug and does not modify the built-in source record.</div>

 <label>Population</label>
 <select id="lvPop"><option ${old.population==="Adult + Pediatric"?"selected":""}>Adult + Pediatric</option><option ${old.population==="Adult"?"selected":""}>Adult</option><option ${old.population==="Pediatric"?"selected":""}>Pediatric</option></select>
 <label>Route</label>
 <select id="lvRoute"><option ${old.route==="IV"?"selected":""}>IV</option><option ${old.route==="IM"?"selected":""}>IM</option><option ${old.route==="IV/IM"?"selected":""}>IV/IM</option><option ${old.route==="Other"?"selected":""}>Other</option></select>
 <label>Dosing weight basis</label>
 <select id="lvWeightBasis"><option value="TBW" ${(old.dosingWeight||d.dosingWeight||"TBW")==="TBW"?"selected":""}>TBW — Actual Body Weight</option><option value="IBW" ${(old.dosingWeight||d.dosingWeight)==="IBW"?"selected":""}>IBW — Lemmens BMI-22</option><option value="LBW" ${(old.dosingWeight||d.dosingWeight)==="LBW"?"selected":""}>LBW — Lean Body Weight</option><option value="AdjBW" ${(old.dosingWeight||d.dosingWeight)==="AdjBW"?"selected":""}>AdjBW — Adjusted Body Weight</option></select>
 <div class="note">Weight basis is verified per dose record. Existing records default to TBW until a different basis is explicitly verified.</div>

 <div class="localFormGrid">
  <label>Dose min<input id="lvMin" type="number" step="any" value="${old.min??d.min??""}"></label>
  <label>Dose default<input id="lvDef" type="number" step="any" value="${old.def??d.def??""}"></label>
  <label>Dose max<input id="lvMax" type="number" step="any" value="${old.max??d.max??""}"></label>
  <label>Dose unit<input id="lvUnit" value="${old.unit||d.unit||""}" placeholder="mg/kg, mcg/kg/min..."></label>
  <label>Stock concentration<input id="lvStock" type="number" step="any" value="${old.stock??d.stock??""}"></label>
  <label>Stock unit<input id="lvStockUnit" value="${old.stockUnit||d.stockUnit||""}"></label>
  <label>Suggested target conc. (optional)<input id="lvTarget" type="number" step="any" value="${old.target??""}"></label>
  <label>Suggested final volume mL (optional)<input id="lvFinal" type="number" step="any" value="${old.finalVol??""}"></label>
 </div>

 <label>Reference / institutional protocol</label><textarea id="lvRef" rows="3">${old.reference||""}</textarea>
 <label>Edition / version / date</label><input id="lvVersion" value="${old.version||""}">
 <label>Page / table / section</label><input id="lvLocation" value="${old.location||""}">
 <label>Verification note (optional)</label><textarea id="lvNote" rows="2">${old.note||""}</textarea>

 <div class="drugActions">
  <button type="button" onclick="saveLocalVerification('${id}',${JSON.stringify(d.recordPhase||d.phase||"")},${JSON.stringify(d.context||"")},this)">✓ Save Local Verify</button>
  ${old.reference?`<button type="button" onclick="removeLocalVerification('${id}',${JSON.stringify(d.recordPhase||d.phase||"")},${JSON.stringify(d.context||"")},this)">🔒 Remove Local Verify</button>`:""}
 </div>
 </form>`;
 document.body.appendChild(box);
 box.addEventListener("close",()=>box.remove());
 box.showModal();
};

window.saveLocalVerification=(id,phase,context,btn)=>{
 let dlg=btn.closest("dialog"),g=x=>dlg.querySelector("#"+x);
 let v={
  population:g("lvPop").value,route:g("lvRoute").value,dosingWeight:g("lvWeightBasis").value,
  min:g("lvMin").value,def:g("lvDef").value,max:g("lvMax").value,
  unit:g("lvUnit").value.trim(),stock:g("lvStock").value,stockUnit:g("lvStockUnit").value.trim(),
  target:g("lvTarget").value,finalVol:g("lvFinal").value,
  reference:g("lvRef").value.trim(),version:g("lvVersion").value.trim(),
  location:g("lvLocation").value.trim(),note:g("lvNote").value.trim(),
  verifiedAt:new Date().toLocaleString()
 };
 if(v.min===""||v.def===""||v.max===""||!v.unit||v.stock===""||!v.stockUnit||!v.reference||!v.version||!v.location){
   alert("Complete dose, stock, reference, version/date, and page/table/section before Local Verify.");
   return;
 }
 if(+v.stock<=0){alert("Stock concentration must be greater than 0.");return}
 let key=verificationRecordKey(id,phase,context);
 verifiedDoseRecords[key]=v;
 saveVerifiedDoseRecords();
 dlg.close();
 render();renderLibraryCompact();
 let d=findDrug(id);if(d)openGenericDrugDetail(encodeURIComponent(genericKey(d.name)));
};

window.removeLocalVerification=(id,phase,context,btn)=>{
 let key=verificationRecordKey(id,phase,context);
 delete verifiedDoseRecords[key];
 saveVerifiedDoseRecords();
 btn.closest("dialog").close();
 render();renderLibraryCompact();
 let d=findDrug(id);if(d)openGenericDrugDetail(encodeURIComponent(genericKey(d.name)));
};

function drugCategoryBase(d){
 if(d.category)return d.category;
 if(d.phase==="Induction"||d.phase==="Sedation"||d.phase==="Maintenance")return "Anesthesia / Sedation";
 if(d.phase==="NMB")return "Neuromuscular blockers";
 if(d.phase==="Reversal")return "Reversal";
 if(d.phase==="PONV")return "Antiemetics";
 if(d.phase==="Post-op")return "Analgesics";
 if(d.phase==="Hemodynamics")return "Hemodynamics";
 return d.phase||"Other";
}
function drugCategories(d){
 let cats=d.categories?.length?d.categories:[drugCategoryBase(d)];
 return [...new Set(cats.map(canonicalizeCategory))];
}
function drugCategory(d){return drugCategories(d)[0]||"Other"}
function card(d){
 d=effectiveDrug(d);
 let integrityCats=integrityCategories(d);
 if(primaryCategoryForDrug(d))d={...d,categories:integrityCats,category:integrityCats[0]};
 if(d.doseLocked){
   return `<div class="drug lockedCard drugCardTheme" data-phase="${d.phase||'Other'}" data-cat="${drugCategories(d).join(" | ")}"><div class="categoryLabel">${drugCategory(d)}</div><h4>${d.name}</h4><div class="meta">${d.context||""}</div>
   <div class="stockLine">Stock / common formulation field <b>${d.stock} ${d.stockUnit}</b>${d.stockOverridden?'<span class="overrideBadge">CUSTOM</span>':""} <button class="miniStockBtn" onclick="openStockEditor('${d.id}')">✏️ Edit</button><br><span class="verify">(verify local product)</span></div>
   <div class="lockedDose">🔒 DOSE LOCKED — source-level verification required before calculator activation</div>
   <div class="tags">${d.verification==="SOURCE_VERIFIED"?'<span class="sourceVerifiedBadge">SOURCE VERIFIED</span>':'<span class="verify">VERIFY</span>'}<span class="thaiPendingBadge">THAI CROSS-CHECK PENDING</span></div>
   ${d.verificationNote?`<div class="verificationBox">${d.verificationNote}</div>`:""}
   <div class="drugActions"><button class="unlockBtn" onclick='openVerify("${d.id}",${JSON.stringify(d.recordPhase||d.phase||"")},${JSON.stringify(d.context||"")})'>🔓 Local Verify & Unlock</button>${d.recordPhase?`<button class="hideBtn" onclick="hideDrugInPhase('${d.id}','${d.recordPhase}')">🙈 Hide in ${d.recordPhase}</button>`:`<button class="hideBtn" onclick="hideDrug('${d.id}')">🙈 Hide</button>`}</div>
   <details><summary>Contraindication • caution • reference</summary><div class="ci"><b>Contraindications:</b> ${d.ci}</div><div class="caution"><b>Cautions:</b> ${d.caution}</div><div class="ref">${d.ref}</div></details></div>`;
 }
 let c=calc(d), per=c.rate?(d.unit.includes("/hr")?"/hr":"/min"):"";
 return `<div class="drug drugCardTheme" data-phase="${d.phase||'Other'}" data-cat="${drugCategories(d).join(" | ")}"><div class="categoryLabel">${drugCategory(d)}</div><h4>${d.name}</h4><div class="meta">${d.context} • ${d.def} ${d.unit}</div>
 <div class="stockEdit"><label>Stock concentration</label><input type="number" step="any" min="0.000001" value="${d.stock}" onchange="setStock('${d.id}',this.value)"><select onchange="setStockUnit('${d.id}',this.value)">${["mg/mL","mcg/mL"].includes(d.stockUnit)?"":`<option selected>${esc(d.stockUnit)}</option>`}<option ${d.stockUnit==="mg/mL"?"selected":""}>mg/mL</option><option ${d.stockUnit==="mcg/mL"?"selected":""}>mcg/mL</option></select></div>
 <div class="drawLabel">${c.rate?"PUMP RATE":"CALCULATED DOSE → DRAW"}</div>
 <div class="dose">${fmt(c.total)} ${esc(c.unit)}${per} → ${c.volAvailable?`<b>${fmt(c.vol)} mL${per}</b>`:`<b class="noVolume">— mL</b>`}</div>
 ${c.unitConverted?`<div class="unitConvNote">Unit conversion applied: dose in ${esc(c.unit)}, stock in ${esc(d.stockUnit)}.</div>`:""}
 ${c.volAvailable?"":`<div class="badAlert">⚠ ${esc(c.volNote)}</div>`}
 ${workingLine(d,c)}
 <div class="tags">${d.localVerified?'<span class="verifiedBadge">LOCAL VERIFIED</span>':(d.verification==="SOURCE_VERIFIED"?'<span class="sourceVerifiedBadge">SOURCE VERIFIED</span>':`<span class="${d.checked?"":"verify"}">${d.checked?"SOURCE CHECKED":"VERIFY"}</span>`)}<span class="thaiPendingBadge">THAI CROSS-CHECK PENDING</span></div>
 ${d.verificationNote?`<div class="verificationBox">${d.verificationNote}</div>`:""}
 <div class="drugActions"><button class="diluteBtn" onclick="openDilution('${d.id}')">🧪 Dilution</button>${d.localVerified?`<button class="unlockBtn" onclick='openVerify("${d.id}",${JSON.stringify(d.recordPhase||d.phase||"")},${JSON.stringify(d.context||"")})'>✓ Local Verified</button>`:""}${d.recordPhase?`<button class="hideBtn" onclick="hideDrugInPhase('${d.id}','${d.recordPhase}')">🙈 Hide in ${d.recordPhase}</button>`:`<button class="hideBtn" onclick="hideDrug('${d.id}')">🙈 Hide</button>`}</div>
 <details><summary>Contraindication • caution • reference</summary><div class="ci"><b>Contraindications:</b> ${d.ci}</div><div class="caution"><b>Cautions:</b> ${d.caution}</div><div class="ref">${d.ref}</div></details></div>`;
}
function phaseHiddenPanel(phase){
 let ids=phaseHiddenIds(phase);
 let a=allDrugs().filter(d=>!isDrugArchived(d)&&(d.phases||[d.phase]).includes(phase)&&ids.includes(d.id));
 return a.length?`<div class="hiddenInline">${a.map(d=>`<div class="hiddenInlineItem"><span>${d.name}</span><button onclick="unhideDrugInPhase('${d.id}','${phase}')">Show in ${phase}</button></div>`).join("")}</div>`:"";
}
window.togglePhaseHidden=phase=>{
 let el=document.getElementById("ph-"+phase.replace(/\W/g,""));
 if(el)el.innerHTML=el.innerHTML?"":phaseHiddenPanel(phase);
};

function render(){
 let groups=[
 ["Premed","🌙 Premedication",1],["Induction","✨ Induction",1],["Opioid","💉 Opioid / Analgesia",1],
 ["NMB","💪 Neuromuscular Block",1],["Maintenance","🌊 Maintenance",1],["Reversal","↩️ Reversal",1],
 ["PONV","🫧 Antiemesis",0],["Post-op","☀️ Post-op Analgesia",0],["Hemodynamics","🫀 Hemodynamics / BP control",0],
 ["Emergency","🚨 Emergency / rescue drugs",0],["Local","📍 Local anesthetics",0],["Obstetric","🤰 Obstetric",0],["Other","➕ Other / adjuncts",0]
 ];
 let html="";
 groups.forEach(([phase,title,open])=>{
   let all=allDrugs().filter(d=>!isDrugArchived(d)&&(d.phases||[d.phase]).includes(phase));
   let phaseHidden=phaseHiddenIds(phase);
   let visible=all.filter(d=>!phaseHidden.includes(d.id));
   let hidden=all.length-visible.length;
   if(!all.length)return;
   let cards=[];
   visible.forEach(d=>{
     let recs=recordsForPhase(d,phase);
     if(!recs.length)recs=[{phase,context:d.context,min:d.min,max:d.max,def:d.def,unit:d.unit,stock:d.stock,stockUnit:d.stockUnit,ref:d.ref}];
     recs.forEach(r=>cards.push(card(drugForRecord(d,r))));
   });
   html+=`<details class="planGroup" data-phase="${phase}" ${open?"open":""}><summary><span>${title}</span><span>${visible.length} drugs${hidden?` • ${hidden} hidden in this phase`:""} ▾</span></summary>
   <div class="planGroupBody"><div class="phaseTools">${hidden?`<button onclick="togglePhaseHidden('${phase}')">👁 Show hidden (${hidden})</button>`:""}</div>
   <div id="ph-${phase.replace(/\W/g,"")}"></div>${cards.join("")}</div></details>`;
 });
 $("plans").innerHTML=html;
 renderLibraryCompact();
}

let selectedCategory="All";
let selectedDrugId=null;
function categories(){
 let used=new Set(allDrugs().flatMap(drugCategories));
 let canonical=CANONICAL_CATEGORIES.filter(c=>used.has(c));
 let custom=[...used].filter(c=>!CANONICAL_CATEGORIES.includes(c)).sort();
 return ["All",...canonical,...custom];
}
function renderCatFilters(){$("catFilters").innerHTML=categories().map(c=>`<button class="${c===selectedCategory?"sel":""}" onclick="setCategory('${c.replace(/'/g,"&#39;")}')">${c}</button>`).join("")}
window.setCategory=c=>{
 selectedCategory=c;
 if($("search"))$("search").value="";
 renderCatFilters();
 renderLibraryCompact();
};


function categoryKey(d){
 let c=(integrityCategories(d)[0]||"").toLowerCase();
 if(c.includes("neuromuscular"))return "Neuromuscular";
 if(c.includes("opioid"))return "Opioid";
 if(c.includes("induction"))return "Induction";
 if(c.includes("antiemetic"))return "Antiemetic";
 if(c.includes("local anesthetic"))return "Local";
 if(c.includes("vasoactive")||c.includes("antihypertensive"))return "Hemodynamic";
 return "Other";
}
function drugIcon(d){
 let c=drugCategory(d).toLowerCase();
 if(c.includes("hemo")||c.includes("vaso")||c.includes("inotrope"))return "❤️";
 if(c.includes("neuromuscular"))return "💪";
 if(c.includes("local anesth"))return "💉";
 if(c.includes("antibiotic"))return "🛡️";
 if(c.includes("antiem"))return "🫧";
 if(c.includes("analges"))return "☀️";
 if(c.includes("emergency")||c.includes("electrolyte"))return "⚡";
 if(c.includes("obstetric"))return "🌸";
 if(c.includes("sedation")||c.includes("anesthesia"))return "✨";
 return "💊";
}

function localDrugTemplate(d={}){
 return {
  id:d.id||("local-"+crypto.randomUUID()),
  name:d.name||"",
  category:d.category||"Other / adjuncts",
  phase:d.phase||"Other",
  context:d.context||"",
  sub:d.sub||"",
  route:d.route||"IV",
  doseLocked:d.doseLocked!==undefined?d.doseLocked:false,
  min:d.min??0,
  max:d.max??0,
  def:d.def??0,
  unit:d.unit||"mg/kg",
  stock:d.stock??1,
  stockUnit:d.stockUnit||"mg/mL",
  preferredTarget:d.preferredTarget??"",
  preferredFinal:d.preferredFinal??"",
  ci:d.ci||"",
  caution:d.caution||"",
  ref:d.ref||"LOCAL DRUG • user-entered",
  checked:false,
  localCustom:true
 };
}
window.openLocalDrugEditor=(id=null)=>{
 let d=id?localDrugs.find(x=>x.id===id):localDrugTemplate();
 if(id && !d)return;
 let box=document.createElement("dialog");
 box.innerHTML=`<form class="verifyForm" onsubmit="return false">
 <div class="head"><h2>${id?"Edit Local Drug":"Add Drug"}</h2><button type="button" onclick="this.closest('dialog').close()">✕</button></div>
 <div class="note">This drug is stored only on this device/browser. After saving, use Edit Classification to assign multiple Categories, multiple Phases and phase-specific dosing records.</div>
 <div class="localFormGrid">
 <label>Generic name<input id="ldName" value="${d.name||""}" required></label>
 <label>Primary Category<select id="ldCategory">
 ${CANONICAL_CATEGORIES.map(x=>`<option value="${x}" ${canonicalizeCategory(d.category)===x?"selected":""}>${x}</option>`).join("")}
 </select></label>
 <label>Phase<select id="ldPhase">
 ${["Induction","NMB","Reversal","PONV","Post-op","Hemodynamics","Emergency","Local","Obstetric","Other"].map(x=>`<option ${d.phase===x?"selected":""}>${x}</option>`).join("")}
 </select></label>
 <label>Route<select id="ldRoute"><option ${d.route==="IV"?"selected":""}>IV</option><option ${d.route==="IM"?"selected":""}>IM</option><option ${d.route==="IV/IM"?"selected":""}>IV/IM</option></select></label>
 <label class="full">Indication / context<input id="ldContext" value="${d.context||""}"></label>
 <label>Drug class / Sub category<input id="ldSub" value="${d.sub||""}"></label>
 <label>Dose unit<input id="ldUnit" value="${d.unit||"mg/kg"}" placeholder="mg/kg, mcg/kg/min, mg"></label>
 <label>Dose min<input id="ldMin" type="number" step="any" value="${d.min??0}"></label>
 <label>Dose default<input id="ldDef" type="number" step="any" value="${d.def??0}"></label>
 <label>Dose max<input id="ldMax" type="number" step="any" value="${d.max??0}"></label>
 <label>Stock concentration<input id="ldStock" type="number" step="any" value="${d.stock??1}"></label>
 <label>Stock unit<input id="ldStockUnit" value="${d.stockUnit||"mg/mL"}"></label>
 <label>Preferred target concentration<input id="ldTarget" type="number" step="any" value="${d.preferredTarget??""}"></label>
 <label>Preferred final volume (mL)<input id="ldFinal" type="number" step="any" value="${d.preferredFinal??""}"></label>
 <label class="full">Contraindications<textarea id="ldCI" rows="3">${d.ci||""}</textarea></label>
 <label class="full">Cautions / notes<textarea id="ldCaution" rows="3">${d.caution||""}</textarea></label>
 <label class="full">Reference / local protocol<textarea id="ldRef" rows="3">${d.ref||""}</textarea></label>
 <label class="full"><input id="ldLocked" type="checkbox" ${d.doseLocked?"checked":""}> Keep dose locked</label>
 </div>
 <div class="drugActions"><button type="button" onclick="saveLocalDrug('${d.id}',this)">💾 Save Drug</button></div>
 </form>`;
 document.body.appendChild(box);box.addEventListener("close",()=>box.remove());box.showModal();
};
window.saveLocalDrug=(id,btn)=>{
 let dlg=btn.closest("dialog"),g=x=>dlg.querySelector("#"+x);
 let name=g("ldName").value.trim();
 if(!name){alert("Generic name is required.");return}
 let o=localDrugTemplate({
  id,
  name,
  category:canonicalizeCategory(g("ldCategory").value)||CANONICAL_CATEGORIES[0],
  phase:g("ldPhase").value,
  route:g("ldRoute").value,
  context:g("ldContext").value.trim(),
  sub:g("ldSub").value.trim(),
  unit:g("ldUnit").value.trim()||"mg/kg",
  min:+g("ldMin").value||0,
  def:+g("ldDef").value||0,
  max:+g("ldMax").value||0,
  stock:+g("ldStock").value||1,
  stockUnit:g("ldStockUnit").value.trim()||"mg/mL",
  preferredTarget:g("ldTarget").value===""?"":+g("ldTarget").value,
  preferredFinal:g("ldFinal").value===""?"":+g("ldFinal").value,
  ci:g("ldCI").value.trim(),
  caution:g("ldCaution").value.trim(),
  ref:g("ldRef").value.trim()||"LOCAL DRUG • user-entered",
  doseLocked:g("ldLocked").checked
 });
 let i=localDrugs.findIndex(x=>x.id===id);
 let previous=i>=0?localDrugs[i]:null;
 if(i>=0)localDrugs[i]=o;else localDrugs.push(o);

 // Edit Drug is authoritative for the primary category/phase of LOCAL drugs.
 // Remove stale legacy classification data that could otherwise override the newly selected category.
 if(classificationOverrides[id]){
   classificationOverrides[id]={...classificationOverrides[id],category:o.category,phase:o.phase,sub:o.sub};
 }
 if(multiClassOverrides[id]){
   let oldCats=Array.isArray(multiClassOverrides[id].categories)?multiClassOverrides[id].categories:[];
   let oldPhases=Array.isArray(multiClassOverrides[id].phases)?multiClassOverrides[id].phases:[];
   multiClassOverrides[id]={
     ...multiClassOverrides[id],
     categories:[o.category,...oldCats.filter(c=>canonicalizeCategory(c)!==o.category)],
     phases:[o.phase,...oldPhases.filter(p=>p!==o.phase)],
     sub:o.sub
   };
 }
 localStorage.setItem("anesthClassificationOverrides",JSON.stringify(classificationOverrides||{}));
 localStorage.setItem("anesthMultiClassOverrides",JSON.stringify(multiClassOverrides||{}));

 saveLocalDrugs();
 dlg.close();

 // Refresh everything immediately without requiring leaving/re-entering the page.
 renderCatFilters();
 render();
 renderLibraryCompact();

 // Keep the user on the edited drug, even if the generic name changed.
 const oldKey=previous?genericKey(previous.name):null;
 const newKey=genericKey(o.name);
 selectedDrugId=newKey;
 setTimeout(()=>openGenericDrugDetail(encodeURIComponent(newKey),false),0);
};
window.deleteLocalDrug=id=>{
 if(!isLocalDrug(id))return;
 let target=localDrugs.find(x=>x.id===id);
 if(!target)return;
 if(!confirm(`Delete ${target.name}?\n\nThis removes this LOCAL drug from this device.`))return;

 const key=genericKey(target.name);
 localDrugs=localDrugs.filter(x=>x.id!==id);
 saveLocalDrugs();

 hiddenDrugs=hiddenDrugs.filter(x=>x!==id);
 delete classificationOverrides[id];
 delete multiClassOverrides[id];
 delete stockOverrides[id];
 Object.keys(verifiedDoseRecords||{}).forEach(k=>{if(k.startsWith(id+"||"))delete verifiedDoseRecords[k]});

 localStorage.setItem("anesthHiddenDrugs",JSON.stringify(hiddenDrugs));
 localStorage.setItem("anesthClassificationOverrides",JSON.stringify(classificationOverrides||{}));
 localStorage.setItem("anesthMultiClassOverrides",JSON.stringify(multiClassOverrides||{}));
 saveStockOverrides();
 saveVerifiedDoseRecords();

 selectedDrugId=null;
 const detail=$("drugDetail");
 detail.className="drugDetail emptyDetail";
 detail.innerHTML='<div class="emptyDetailIcon">💊</div><b>Select a drug to view details</b><span>Dose • Stock & Dilution • Contraindication • Reference</span>';

 renderCatFilters();
 render();
 renderLibraryCompact();
};


const PLAN_PHASES=["Premed","Induction","Opioid","NMB","Maintenance","Reversal","PONV","Post-op","Hemodynamics","Emergency","Local","Obstetric","Other"];

window.openClassificationEditor=id=>{
 let d=findDrug(id);if(!d)return;
 let current=multiClassOverrides[id]||{};
 let cats=categories().filter(x=>x!=="All");
 let selectedCats=current.categories?.length?current.categories:drugCategories(d);
 let selectedPhases=current.phases?.length?current.phases:(d.phases?.length?d.phases:[d.phase||"Other"]);
 let records=current.records?.length?current.records:(d.dosingRecords?.length?d.dosingRecords:[]);
 let box=document.createElement("dialog");
 box.innerHTML=`<form onsubmit="return false">
 <div class="head"><h2>Edit Classification — ${d.name}</h2><button type="button" onclick="this.closest('dialog').close()">✕</button></div>
 <div class="note">Reference category ของ v0.24 ใช้ Primary Category จากไฟล์ที่ผู้ใช้ให้เป็นหลัก. คุณยังสามารถเพิ่มหลาย Category/Phase เป็น Local Override ได้ โดยไม่แก้ Reference ต้นฉบับ.</div>

 <label>Categories</label>
 <div class="checkGrid" id="clCats">${cats.map(c=>`<label class="checkItem"><input type="checkbox" value="${c.replace(/"/g,'&quot;')}" ${selectedCats.includes(c)?"checked":""}> ${c}</label>`).join("")}</div>
 <div class="localFormGrid"><label class="full">Add another category<input id="clNewCategory" placeholder="e.g. Analgesics / Opioids"></label></div>

 <label>Plan phases</label>
 <div class="checkGrid" id="clPhases">${PLAN_PHASES.map(p=>`<label class="checkItem"><input type="checkbox" value="${p}" ${selectedPhases.includes(p)?"checked":""}> ${p}</label>`).join("")}</div>

 <label>Subgroup / display section</label>
 <input id="clSub" value="${current.sub??d.sub??""}" placeholder="e.g. Opioids / Analgesics">

 <div class="detailSection">
   <h4>Phase-specific dosing records</h4>
   <div id="phaseRecords">${renderPhaseRecordsEditor(records)}</div>
   <button type="button" onclick="addPhaseRecordEditor(this)">＋ Add dosing record</button>
 </div>

 <div class="drugActions"><button type="button" onclick="saveClassification('${id}',this)">💾 Save Classification</button>${(multiClassOverrides[id]||classificationOverrides[id])?`<button type="button" onclick="resetClassification('${id}',this)">↩ Reset to Reference</button>`:""}</div>
 </form>`;
 document.body.appendChild(box);box.addEventListener("close",()=>box.remove());box.showModal();
};

function renderPhaseRecordsEditor(records){
 return (records||[]).map((r,i)=>`<div class="phaseRecord" data-rec="${i}">
 <div class="phaseRecordHead"><b>Dosing record ${i+1}</b><button type="button" onclick="this.closest('.phaseRecord').remove()">✕</button></div>
 <div class="localFormGrid">
 <label>Phase<select class="prPhase">${PLAN_PHASES.map(p=>`<option ${p===r.phase?"selected":""}>${p}</option>`).join("")}</select></label>
 <label>Indication / context<input class="prContext" value="${r.context||""}"></label>
 <label>Dose min<input class="prMin" type="number" step="any" value="${r.min??""}"></label>
 <label>Dose default<input class="prDef" type="number" step="any" value="${r.def??""}"></label>
 <label>Dose max<input class="prMax" type="number" step="any" value="${r.max??""}"></label>
 <label>Dose unit<input class="prUnit" value="${r.unit||""}" placeholder="mcg/kg"></label>
 <label>Stock concentration<input class="prStock" type="number" step="any" value="${r.stock??""}"></label>
 <label>Stock unit<input class="prStockUnit" value="${r.stockUnit||""}" placeholder="mcg/mL"></label>
 <label class="full">Reference<input class="prRef" value="${r.ref||""}"></label>
 </div></div>`).join("");
}
window.addPhaseRecordEditor=btn=>{
 let host=btn.parentElement.querySelector("#phaseRecords");
 host.insertAdjacentHTML("beforeend",renderPhaseRecordsEditor([{phase:"Induction",context:"",min:"",def:"",max:"",unit:"",stock:"",stockUnit:"",ref:""}]));
};

window.saveClassification=(id,btn)=>{
 let dlg=btn.closest("dialog");
 let selectedCats=[...dlg.querySelectorAll("#clCats input:checked")].map(x=>x.value);
 let newCat=dlg.querySelector("#clNewCategory").value.trim();
 selectedCats=selectedCats.map(canonicalizeCategory);
 newCat=canonicalizeCategory(newCat);
 if(newCat&&newCat!=="Other"&&!selectedCats.includes(newCat))selectedCats.push(newCat);
 selectedCats=[...new Set(selectedCats)];
 let selectedPhases=[...dlg.querySelectorAll("#clPhases input:checked")].map(x=>x.value);
 if(!selectedCats.length){alert("Select at least one category.");return}
 if(!selectedPhases.length){alert("Select at least one phase.");return}

 let records=[...dlg.querySelectorAll(".phaseRecord")].map(rec=>({
   phase:rec.querySelector(".prPhase").value,
   context:rec.querySelector(".prContext").value.trim(),
   min:rec.querySelector(".prMin").value===""?null:+rec.querySelector(".prMin").value,
   def:rec.querySelector(".prDef").value===""?null:+rec.querySelector(".prDef").value,
   max:rec.querySelector(".prMax").value===""?null:+rec.querySelector(".prMax").value,
   unit:rec.querySelector(".prUnit").value.trim(),
   stock:rec.querySelector(".prStock").value===""?null:+rec.querySelector(".prStock").value,
   stockUnit:rec.querySelector(".prStockUnit").value.trim(),
   ref:rec.querySelector(".prRef").value.trim()
 })).filter(r=>r.phase);

 multiClassOverrides[id]={categories:selectedCats,phases:selectedPhases,sub:dlg.querySelector("#clSub").value.trim(),records};
 selectedCats.forEach(c=>{if(!customCategories.includes(c))customCategories.push(c)});
 localStorage.setItem("anesthMultiClassOverrides",JSON.stringify(multiClassOverrides));
 saveClassifications();
 dlg.close();
 renderCatFilters();
 render();
 renderLibraryCompact();
 let dd=findDrug(id);
 if(dd){
   selectedDrugId=genericKey(dd.name);
   setTimeout(()=>openGenericDrugDetail(encodeURIComponent(selectedDrugId),false),0);
 }
};

window.resetClassification=(id,btn)=>{
 delete multiClassOverrides[id];
 delete classificationOverrides[id];
 localStorage.setItem("anesthMultiClassOverrides",JSON.stringify(multiClassOverrides));
 saveClassifications();btn.closest("dialog").close();renderCatFilters();render();renderLibraryCompact();if(selectedDrugId===id)openDrugDetail(id);
};

$("manageCatsBtn").onclick=()=>{
 let box=document.createElement("dialog");
 let used=[...new Set(allDrugs().flatMap(drugCategories))].sort();
 box.innerHTML=`<form onsubmit="return false"><div class="head"><h2>Manage Categories</h2><button type="button" onclick="this.closest('dialog').close()">✕</button></div>
 <div class="note">สร้างชื่อ Category ใหม่ แล้วเลือกหลาย Category ต่อ 1 ยาได้จาก Edit Classification.</div>
 <div class="localFormGrid"><label class="full">New category<input id="newCat" placeholder="e.g. Analgesics / Opioids"></label></div>
 <div class="drugActions"><button type="button" onclick="addCategory(this)">＋ Add Category</button></div>
 <div>${used.map(c=>`<div class="catManageItem"><span>${c}</span><span>${customCategories.includes(c)?'<span class="localBadge">CUSTOM</span>':""}</span></div>`).join("")}</div></form>`;
 document.body.appendChild(box);box.addEventListener("close",()=>box.remove());box.showModal();
};
window.addCategory=btn=>{
 let dlg=btn.closest("dialog"),v=dlg.querySelector("#newCat").value.trim();if(!v)return;
 if(!customCategories.includes(v))customCategories.push(v);saveClassifications();dlg.close();renderCatFilters();
};


const GENERIC_PRIMARY_CATEGORY={"Midazolam": "Premedication & Anxiolytics", "Lorazepam": "Premedication & Anxiolytics", "Diazepam": "Premedication & Anxiolytics", "Dexmedetomidine": "Premedication & Anxiolytics", "Propofol": "Intravenous Induction Agents", "Etomidate": "Intravenous Induction Agents", "Ketamine": "Intravenous Induction Agents", "Thiopental": "Intravenous Induction Agents", "Thiopental Sodium": "Intravenous Induction Agents", "Methohexital": "Intravenous Induction Agents", "Succinylcholine": "Neuromuscular Blocking Agents", "Succinylcholine (Suxamethonium)": "Neuromuscular Blocking Agents", "Rocuronium": "Neuromuscular Blocking Agents", "Vecuronium": "Neuromuscular Blocking Agents", "Cisatracurium": "Neuromuscular Blocking Agents", "Atracurium": "Neuromuscular Blocking Agents", "Pancuronium": "Neuromuscular Blocking Agents", "Sugammadex": "Reversal Agents & Antidotes", "Neostigmine": "Reversal Agents & Antidotes", "Flumazenil": "Reversal Agents & Antidotes", "Naloxone": "Reversal Agents & Antidotes", "Naloxone (Narcan)": "Reversal Agents & Antidotes", "Dantrolene": "Reversal Agents & Antidotes", "Dantrolene Sodium": "Reversal Agents & Antidotes", "Lipid Emulsion 20%": "Reversal Agents & Antidotes", "Lipid Emulsion 20% (Intralipid)": "Reversal Agents & Antidotes", "Fentanyl": "Opioid Analgesics", "Remifentanil": "Opioid Analgesics", "Sufentanil": "Opioid Analgesics", "Morphine": "Opioid Analgesics", "Pethidine (Meperidine)": "Opioid Analgesics", "Meperidine (Pethidine)": "Opioid Analgesics", "Hydromorphone": "Opioid Analgesics", "Lidocaine": "Local Anesthetics", "Lidocaine (Xylocaine)": "Local Anesthetics", "Lidocaine (Lignocaine)": "Local Anesthetics", "Bupivacaine": "Local Anesthetics", "Levobupivacaine": "Local Anesthetics", "Ropivacaine": "Local Anesthetics", "Tetracaine": "Local Anesthetics", "Chloroprocaine": "Local Anesthetics", "Ephedrine": "Vasoactive & Inotropic Drugs", "Phenylephrine": "Vasoactive & Inotropic Drugs", "Norepinephrine": "Vasoactive & Inotropic Drugs", "Norepinephrine (Noradrenaline)": "Vasoactive & Inotropic Drugs", "Epinephrine": "Vasoactive & Inotropic Drugs", "Epinephrine (Adrenaline)": "Vasoactive & Inotropic Drugs", "Vasopressin": "Vasoactive & Inotropic Drugs", "Dobutamine": "Vasoactive & Inotropic Drugs", "Milrinone": "Vasoactive & Inotropic Drugs", "Nicardipine": "Antihypertensives & Antiarrhythmics", "Nitroglycerin": "Antihypertensives & Antiarrhythmics", "Nitroglycerin (Glyceryl Trinitrate)": "Antihypertensives & Antiarrhythmics", "Esmolol": "Antihypertensives & Antiarrhythmics", "Labetalol": "Antihypertensives & Antiarrhythmics", "Amiodarone": "Antihypertensives & Antiarrhythmics", "Ondansetron": "Antiemetics (PONV)", "Dexamethasone": "Antiemetics (PONV)", "Metoclopramide": "Antiemetics (PONV)", "Droperidol": "Antiemetics (PONV)", "Atropine": "Anticholinergics & Antisecretory", "Glycopyrrolate": "Anticholinergics & Antisecretory", "Oxytocin": "Obstetric Anesthesia Specific", "Methylergometrine / Methylergonovine": "Obstetric Anesthesia Specific", "Methylergometrine (Methergine)": "Obstetric Anesthesia Specific", "Carboprost": "Obstetric Anesthesia Specific", "Carboprost (Hemabate / 15-methyl PGF2a)": "Obstetric Anesthesia Specific", "Mannitol": "Neuroanesthesia & ICP Control", "Hypertonic Saline": "Neuroanesthesia & ICP Control", "Hypertonic Saline (3%, 23.4%)": "Neuroanesthesia & ICP Control", "Paracetamol IV": "Non-Opioid Analgesics & Co-analgesics", "Paracetamol (Acetaminophen) IV": "Non-Opioid Analgesics & Co-analgesics", "Parecoxib": "Non-Opioid Analgesics & Co-analgesics", "Ketorolac": "Non-Opioid Analgesics & Co-analgesics", "Tranexamic acid": "Hemostatic Agents & Blood Management", "Tranexamic Acid (TXA)": "Hemostatic Agents & Blood Management", "Protamine Sulfate": "Hemostatic Agents & Blood Management", "Prothrombin Complex Concentrate (4-factor PCC)": "Hemostatic Agents & Blood Management", "Prothrombin Complex Concentrate (PCC)": "Hemostatic Agents & Blood Management", "Salbutamol / Albuterol": "Respiratory & Emergency Adjuncts", "Salbutamol (Albuterol)": "Respiratory & Emergency Adjuncts", "Calcium chloride": "Respiratory & Emergency Adjuncts", "Calcium gluconate": "Respiratory & Emergency Adjuncts"};
const ANALGESIC_CONFLICTS={
  "Opioid Analgesics":new Set(["Non-Opioid Analgesics & Co-analgesics"]),
  "Non-Opioid Analgesics & Co-analgesics":new Set(["Opioid Analgesics"])
};

function migrateCategoryIntegrity(){
  let all=[...D,...localDrugs];
  all.forEach(d=>{
    let primary=GENERIC_PRIMARY_CATEGORY[d.name];
    if(!primary)return;
    let blocked=ANALGESIC_CONFLICTS[primary]||new Set();

    let m=multiClassOverrides[d.id];
    if(m?.categories){
      m.categories=[...new Set([primary,...m.categories.filter(c=>c!==primary&&!blocked.has(c))])];
    }

    let l=classificationOverrides[d.id];
    if(l?.category && blocked.has(l.category)){
      l.category=primary;
    }
  });
  localStorage.setItem("anesthMultiClassOverrides",JSON.stringify(multiClassOverrides||{}));
  localStorage.setItem("anesthClassificationOverrides",JSON.stringify(classificationOverrides||{}));
}
migrateCategoryIntegrity();

function primaryCategoryForDrug(d){
  return GENERIC_PRIMARY_CATEGORY[d.name]||null;
}
function integrityCategories(d){
  let primary=primaryCategoryForDrug(d);
  let existing=drugCategories(d);
  if(!primary)return existing;
  let blocked=ANALGESIC_CONFLICTS[primary]||new Set();
  let extras=existing.filter(c=>c!==primary&&!blocked.has(c));
  return [primary,...new Set(extras)];
}

function genericKey(name){return (name||"").trim().toLowerCase()}

window.hideGenericInLibrary=encodedKey=>{
 let key=decodeURIComponent(encodedKey), group=genericGroups().get(key)||[];
 group.forEach(d=>{if(!hiddenDrugs.includes(d.id))hiddenDrugs.push(d.id)});
 localStorage.setItem("anesthHiddenDrugs",JSON.stringify(hiddenDrugs));
 renderLibraryCompact();
 if(selectedDrugId===key)openGenericDrugDetail(encodedKey);
};
window.unhideGenericInLibrary=encodedKey=>{
 let key=decodeURIComponent(encodedKey), ids=new Set((genericGroups().get(key)||[]).map(d=>d.id));
 hiddenDrugs=hiddenDrugs.filter(id=>!ids.has(id));
 localStorage.setItem("anesthHiddenDrugs",JSON.stringify(hiddenDrugs));
 renderLibraryCompact();
 if(selectedDrugId===key)openGenericDrugDetail(encodedKey);
};

function genericGroups(){
 let map=new Map();
 allDrugs().forEach(d=>{
   let k=genericKey(d.name);
   if(!map.has(k))map.set(k,[]);
   map.get(k).push(d);
 });
 return map;
}
function representativeDrug(group){
 let first=group[0];
 let primary=primaryCategoryForDrug(first);
 let rawCats=[...new Set(group.flatMap(integrityCategories))];
 let cats=primary?[primary,...rawCats.filter(c=>c!==primary)]:rawCats;
 let phases=[...new Set(group.flatMap(d=>d.phases||[d.phase]))];
 let cls=[...new Set(group.map(d=>d.drugClass||d.sub).filter(Boolean))];
 return {...first,categories:cats,category:cats[0]||first.category,phases,drugClass:cls.join(" / ")||first.drugClass||first.sub,categoryIntegrityFixed:!!primary};
}
function aggregateDoseRecords(group){
 let out=[];
 group.forEach(raw=>{
   let d=effectiveDrug(raw);
   if(Array.isArray(d.dosingRecords)&&d.dosingRecords.length){
     d.dosingRecords.forEach(r=>out.push({...r,stock:d.stock,stockUnit:d.stockUnit,sourceDrugId:d.id}));
   } else {
     let phases=d.phases||[d.phase||"Other"];
     phases.forEach(p=>out.push({
       phase:p,context:d.context||"",min:d.min,max:d.max,def:d.def,unit:d.unit,
       stock:d.stock,stockUnit:d.stockUnit,ref:d.ref,sourceDrugId:d.id,doseLocked:d.doseLocked
     }));
   }
 });
 // dedupe exact-ish records
 let seen=new Set();
 return out.filter(r=>{
   let k=[r.phase,r.context,r.min,r.max,r.def,r.unit,r.stock,r.stockUnit].join("|");
   if(seen.has(k))return false;seen.add(k);return true;
 });
}
function renderLibraryCompact(){
 let q=($("search").value||"").toLowerCase();
 let groups=[...genericGroups().entries()].map(([key,group])=>({key,group,rep:representativeDrug(group)}))
   .filter(x=>{
     let matches=(x.rep.name+" "+drugCategories(x.rep).join(" ")+" "+(x.rep.drugClass||"")+" "+x.group.map(g=>g.context||"").join(" ")).toLowerCase().includes(q);
     let scopeAll=$("searchScope")?.value==="all";
     let lifeMatch=scopeAll ? true : (libraryLifecycleView==="archived" ? x.group.some(isDrugArchived) : x.group.some(g=>!isDrugArchived(g)));
     return matches && lifeMatch && (q.length>0 || selectedCategory==="All" || drugCategories(x.rep).includes(selectedCategory));
   })
   .sort((a,b)=>a.rep.name.localeCompare(b.rep.name,undefined,{sensitivity:"base"}));

 let alpha={};
 groups.forEach(x=>{let k=(x.rep.name[0]||"#").toUpperCase();(alpha[k]||(alpha[k]=[])).push(x)});
 let letters=Object.keys(alpha).sort();

 $("libList").innerHTML=letters.length?letters.map(letter=>`<div id="alpha-${letter}"><div class="alphaTitle">${letter}</div>${alpha[letter].map(x=>{
   let d=x.rep, hidden=x.group.some(g=>hiddenDrugs.includes(g.id)), archived=x.group.every(isDrugArchived);
   return `<button class="libDrugRow ${selectedDrugId===x.key?"active":""} ${hidden?"isHidden":""}" onclick="openGenericDrugDetail('${encodeURIComponent(x.key)}')">
   <span class="libIcon cat-${categoryKey(d)}">${drugIcon(d)}</span>
   <span class="libText"><span class="libName">${d.name}${x.group.some(g=>isLocalDrug(g.id))?'<span class="localBadge">LOCAL</span>':""}${hidden?'<span class="hiddenBadge">HIDDEN</span>':""}${archived?'<span class="archiveBadge">ARCHIVED</span>':""}</span>
   <span class="libCat">${integrityCategories(d)[0]||"Other"}${d.drugClass?` • ${d.drugClass}`:""}</span></span>
   <span class="libChevron">›</span></button>`;
 }).join("")}</div>`).join(""):'<div class="empty">No matching drugs</div>';
}
window.openDrugDetail=id=>{
 let d=findDrug(id);if(!d)return;
 openGenericDrugDetail(encodeURIComponent(genericKey(d.name)));
};

window.openStockEditor=(id)=>{
  let d=effectiveDrug(findDrug(id)); if(!d)return;
  let raw=findDrug(id);
  let box=document.createElement("dialog");
  box.innerHTML=`<form onsubmit="return false">
    <div class="head"><h2>Stock concentration — ${d.name}</h2><button type="button" onclick="this.closest('dialog').close()">✕</button></div>
    <div class="note">This changes the stock concentration used for mL and dilution calculations on this device only.</div>
    <label>Stock concentration</label>
    <input id="stockEditValue" type="number" step="any" min="0.000001" value="${d.stock}">
    <label>Stock unit</label>
    <input id="stockEditUnit" value="${d.stockUnit||""}">
    <div class="drugActions">
      <button type="button" onclick="saveStockEditor('${id}',this)">💾 Save stock</button>
      ${stockOverrides[id]?`<button type="button" onclick="resetStockOverride('${id}');this.closest('dialog').close()">↩ Reset default</button>`:""}
    </div>
    <div class="verificationBox"><b>Default reference stock:</b> ${raw.stock} ${raw.stockUnit||""}</div>
  </form>`;
  document.body.appendChild(box);box.addEventListener("close",()=>box.remove());box.showModal();
};
window.saveStockEditor=(id,btn)=>{
  let dlg=btn.closest("dialog"),v=dlg.querySelector("#stockEditValue").value,u=dlg.querySelector("#stockEditUnit").value;
  if(!setStockOverride(id,v,u))return;
  dlg.close();
  render();renderLibraryCompact();
  let d=findDrug(id);
  if(d)openGenericDrugDetail(encodeURIComponent(genericKey(d.name)));
};

window.openGenericDrugDetail=(encodedKey,remember=true)=>{
 let key=decodeURIComponent(encodedKey),group=genericGroups().get(key);if(!group?.length)return;
 const detailAlreadyOpen=document.getElementById("drugDetail")?.classList.contains("open")&&selectedDrugId===key;
 if(remember&&!detailAlreadyOpen)rememberAppView();
 selectedDrugId=key;
 let d=representativeDrug(group), records=aggregateDoseRecords(group), detail=$("drugDetail");
 let allLocked=group.every(g=>effectiveDrug(g).doseLocked);
 detail.classList.remove("emptyDetail");detail.classList.add("open");
 let categories=integrityCategories(d);

 detail.innerHTML=`<button class="detailClose" onclick="closeDrugDetail()">✕</button>
 <div class="drugCardTheme" data-cat="${categories.join(" | ")}">
 <div class="detailHero">
   <div class="detailIcon dynamic">${drugIcon(d)}</div>
   <div class="detailHeroMain">
     <h3>${d.name}</h3>
     <p>${d.drugClass||d.sub||d.context||""}</p>
     ${group.some(g=>g.localCustom)?`<div class="drugInlineActions">
       ${group.filter(g=>g.localCustom).map(g=>`<button class="editDrugBtn" onclick="openLocalDrugEditor('${g.id}')">✏️ Edit Drug</button><button class="deleteDrugBtn" onclick="deleteLocalDrug('${g.id}')">🗑 Delete</button>`).join("")}
     </div>`:""}
   </div>
 </div>
 <div class="detailGrid">
   <span>Categories</span><span><span class="multiPills">${categories.map(c=>`<span class="multiPill">${c}</span>`).join("")}</span></span>
   <span>Drug class</span><span>${d.drugClass||d.sub||"—"}</span>
   <span>Phases</span><span><span class="multiPills">${[...new Set(group.flatMap(g=>g.phases||[g.phase]))].map(p=>`<span class="multiPill">${p}</span>`).join("")}</span></span>
   <span>Status</span><span>${allLocked?"🔒 Dose Locked":"Dose records available"}</span>
   ${primaryCategoryForDrug(d)?`<span>Category source</span><span>✓ Master Medication Database</span>`:""}
 </div>

 <div class="classifyActions"><button onclick="openClassificationEditor('${group[0].id}')">🗂 Categories & Phases</button>
 ${group.some(g=>hiddenDrugs.includes(g.id))
 ?`<button onclick="unhideGenericInLibrary('${encodeURIComponent(key)}')">👁 Unhide in Drug Library</button>`
 :`<button onclick="hideGenericInLibrary('${encodeURIComponent(key)}')">🙈 Hide in Drug Library</button>`}
 </div>
 <div class="libraryHint"><b>Library visibility only:</b> Hide here never removes this drug from Plan. Plan visibility is controlled separately inside each phase.</div>

 <div class="detailSection"><h4>Dose & Administration by indication / phase</h4>
 ${records.map(r=>{
   let source=group.find(g=>g.id===r.sourceDrugId)||group[0], ed=effectiveDrug(source);
   let locked=r.doseLocked??ed.doseLocked;
   let rec=drugForRecord(ed,r);
   rec=effectiveDrug(rec);
   locked=!!rec.doseLocked;
   let c=locked?null:calc(rec);
   return `<div class="phaseRecord drugCardTheme" data-cat="${categories.join(" | ")}">
     <div class="phaseRecordHead recordHeaderV041">
       <div class="recordTitleV041">
         <b>${r.phase||"Other"} ${rec.localVerified?'<span class="verifiedBadge">LOCAL VERIFIED</span>':(rec.verification==="SOURCE_VERIFIED"?'<span class="sourceVerifiedBadge">SOURCE VERIFIED</span>':(!locked?'<span class="verifyDoseBadge">VERIFY</span>':""))}</b>
         <span>${r.context||""}</span>
       </div>
       <div class="recordCrudActions">
         ${isDrugArchived(source)?`<button class="restoreDrugBtn" onclick="restoreDrug('${source.id}')">↩ Restore</button>`:`<button class="archiveDrugBtn" onclick="archiveDrug('${source.id}')">📦 Archive</button>`}
         ${isLocalDrug(source.id)?`<button class="editDrugBtn" onclick="openLocalDrugEditor('${source.id}')">✏️ Edit</button>
         <button class="deleteDrugBtn" onclick="deleteLocalDrug('${source.id}')">🗑 Delete permanently</button>`:""}
       </div>
     </div>
     ${locked?`<div class="lockedDose">🔒 DOSE LOCKED</div>`:
     `<table class="detailTable">
       <tr><td>Dose range</td><td>${r.min??rec.min}–${r.max??rec.max} ${r.unit||rec.unit}</td></tr>
       <tr><td>Default</td><td>${r.def??rec.def} ${r.unit||rec.unit}</td></tr>
       ${(r.unit||rec.unit||"").includes("/kg")?`<tr class="weightBasisRow"><td>Dosing weight</td><td><b><span class="weightBasisBadge">${c.weightBasis.basis}</span> ${c.weightBasis.label}</b><br><span class="weightBasisValue">${fmt(c.weightBasis.kg)} kg</span><br><small>${c.weightBasis.formula}</small></td></tr>`:""}
       <tr><td>Calculated dose</td><td><span class="detailDose">${fmt(c.total)} ${c.unit}${c.rate?((rec.unit||"").includes("/hr")?"/hr":"/min"):""}</span></td></tr>
       <tr><td>Stock</td><td><b>${rec.stock} ${rec.stockUnit}</b> ${rec.stockOverridden?'<span class="overrideBadge">CUSTOM STOCK</span>':""}<br><button class="miniStockBtn" onclick="openStockEditor('${source.id}')">✏️ Edit stock</button></td></tr>
       <tr><td>DRAW / Pump</td><td>${c.volAvailable?`<b>${fmt(c.vol)} mL${c.rate?((rec.unit||"").includes("/hr")?"/hr":"/min"):""}</b>`:`<b class="noVolume">—</b><br><small class="badAlert">⚠ ${esc(c.volNote)}</small>`}${c.unitConverted?`<br><small class="unitConvNote">converted ${esc(c.unit)} → ${esc(rec.stockUnit)}</small>`:""}</td></tr>
     </table>`}
     <div class="phaseRecordActions">
       <button class="dilutionRecordBtn" onclick='openDilutionRecord("${source.id}",${JSON.stringify(r.phase||rec.phase||"")},${JSON.stringify(r.context||rec.context||"")})'>💧 Dilution</button>
       <button class="verifyDoseBtn" onclick='openVerify("${source.id}",${JSON.stringify(r.phase||rec.phase||"")},${JSON.stringify(r.context||rec.context||"")})'>${rec.localVerified?"✏️ Edit Local Verify":(locked?"🔓 Local Verify & Unlock":(rec.verification==="SOURCE_VERIFIED"?"🔎 Review / Local Verify":"🔎 Verify this dose"))}</button>
     </div>
     <div class="evidenceActions">
       <button onclick='cloudDoseAction("evidence",${JSON.stringify(r.cloudDoseId||rec.cloudDoseId||null)},${JSON.stringify(d.name)})'>📎 View evidence</button>
       <button onclick='cloudDoseAction("addref",${JSON.stringify(r.cloudDoseId||rec.cloudDoseId||null)},${JSON.stringify(d.name)})'>＋ Add reference</button>
       <button onclick='cloudDoseAction("verify",${JSON.stringify(r.cloudDoseId||rec.cloudDoseId||null)},${JSON.stringify(d.name)})'>✓ Verify</button>
       <button onclick='cloudDoseAction("history",${JSON.stringify(r.cloudDoseId||rec.cloudDoseId||null)},${JSON.stringify(d.name)})'>🕘 Verification history</button>
     </div>
     ${rec.ref?`<div class="detailRef">${rec.ref}</div>`:""}
   </div>`;
 }).join("")}
 </div>

 <div class="detailWarn"><b>Caution / Notes</b><br>${d.caution||"Verify patient-specific precautions and local protocol."}</div>
 <div class="detailSection"><h4>Contraindications</h4>${d.ci||"—"}</div>
 <div class="detailRef"><b>References</b><br>${[...new Set(group.map(g=>g.ref).filter(Boolean))].join("<br>")||"—"}</div>
 </div>`;
 renderLibraryCompact();
};
window.closeDrugDetail=()=>{
 if(appNavHistory.length){goAppBack();return;}
 $("drugDetail").classList.remove("open");selectedDrugId=null;updateAppBackBtn();
};
$("search").oninput=()=>{
 if(($("search").value||"").trim().length>0 && selectedCategory!=="All"){
   selectedCategory="All";
   renderCatFilters();
 }
 renderLibraryCompact();
};

function setLifecycleView(view){
  libraryLifecycleView=view;
  localStorage.setItem("anesthLibraryLifecycleView",view);
  $("showActiveDrugs")?.classList.toggle("active",view==="active");
  $("showArchivedDrugs")?.classList.toggle("active",view==="archived");
  renderLibraryCompact();
}
$("showActiveDrugs").onclick=()=>setLifecycleView("active");
$("showArchivedDrugs").onclick=()=>setLifecycleView("archived");
$("searchScope").onchange=()=>renderLibraryCompact();

async function setCloudDrugActive(id,active){
  if(typeof window.cloudSetDrugActive!=="function")return null;
  try{
    await window.cloudSetDrugActive(id,active);
    return true;
  }catch(e){
    console.warn(e);
    alert("Cloud update failed. No change was made.");
    return false;
  }
}
window.archiveDrug=async id=>{
  let d=findDrug(id);if(!d)return;
  if(!confirm(`Archive ${d.name}?\n\nThis removes the drug from Active Library and Plan, but keeps its reference and verification history.`))return;
  let cloud=await setCloudDrugActive(id,false); if(cloud===false)return;
  if(isLocalDrug(id)||cloud===null){
    if(!archivedLocalDrugs.includes(id))archivedLocalDrugs.push(id);
    saveArchivedLocalDrugs();
  }
  closeDrugDetail(); render(); renderLibraryCompact();
};
window.restoreDrug=async id=>{
  let d=findDrug(id);if(!d)return;
  let cloud=await setCloudDrugActive(id,true); if(cloud===false)return;
  archivedLocalDrugs=archivedLocalDrugs.filter(x=>x!==id); saveArchivedLocalDrugs();
  closeDrugDetail(); render(); renderLibraryCompact();
};

$("clearSearchBtn").onclick=()=>{
 $("search").value="";
 selectedCategory="All";
 renderCatFilters();
 renderLibraryCompact();
};
$("showHidden").onclick=()=>{let box=document.createElement("dialog");box.innerHTML=`<form method="dialog"><div class="head"><h2>Hidden from Drug Library</h2><button>✕</button></div>${hiddenPanel()}</form>`;document.body.appendChild(box);box.addEventListener("close",()=>box.remove());box.showModal();};


window.openDilutionRecord=(id,phase="",context="")=>{
 let raw=findDrug(id); if(!raw)return;
 let base=effectiveDrug(raw);
 let records=base.dosingRecords||[];
 let r=records.find(x=>(x.phase||"")===phase && (x.context||"")===context)
     || records.find(x=>(x.phase||"")===phase)
     || {phase:phase||base.phase,context:context||base.context,min:base.min,max:base.max,def:base.def,unit:base.unit,stock:base.stock,stockUnit:base.stockUnit,ref:base.ref};

 dilutionDrug=drugForRecord(base,r);
 dilutionDrug=effectiveDrug(dilutionDrug);

 let c=calc(dilutionDrug);
 $("dDrug").textContent=dilutionDrug.name;
 $("dDose").textContent=`${fmt(c.total)} ${c.unit}${c.rate?((dilutionDrug.unit||"").includes("/hr")?"/hr":"/min"):""}`;
 $("dStock").textContent=`${dilutionDrug.stock} ${dilutionDrug.stockUnit}`;

 let prefs=JSON.parse(localStorage.getItem("anesthDilutionPrefs")||"{}");
 let p=prefs[id+"||"+phase+"||"+context]||prefs[id]||{};
 $("dTarget").value=p.target??dilutionDrug.preferredTarget??dilutionDrug.stock;
 $("dFinal").value=p.finalVol??dilutionDrug.preferredFinal??10;
 $("dRecommended").textContent=`Default: ${$("dTarget").value} ${dilutionDrug.stockUnit} (editable; local protocol may override)`;

 dilutionDrug._dilutionPrefKey=id+"||"+phase+"||"+context;
 updateDilution();
 $("dilutionDialog").showModal();
};

window.openDilution=id=>{
 dilutionDrug=effectiveDrug(findDrug(id)); let c=calc(dilutionDrug);
 $("dDrug").textContent=dilutionDrug.name;$("dDose").textContent=`${fmt(c.total)} ${c.unit}${c.rate?(dilutionDrug.unit.includes("/hr")?"/hr":"/min"):""}`;
 $("dStock").textContent=`${dilutionDrug.stock} ${dilutionDrug.stockUnit}`;
 $("dTarget").value=dilutionDrug.preferredTarget||dilutionDrug.stock;$("dFinal").value=dilutionDrug.preferredFinal||10;
 $("dRecommended").textContent=`Default: ${dilutionDrug.preferredTarget||dilutionDrug.stock} ${dilutionDrug.stockUnit} (editable; local protocol may override)`;
 updateDilution();$("dilutionDialog").showModal();
}
["dTarget","dFinal","dDiluent"].forEach(id=>$(id).oninput=()=>{
 updateDilution();
 if(dilutionDrug?._dilutionPrefKey){
   let prefs=JSON.parse(localStorage.getItem("anesthDilutionPrefs")||"{}");
   prefs[dilutionDrug._dilutionPrefKey]={
     target:parseFloat($("dTarget").value)||"",
     finalVol:parseFloat($("dFinal").value)||"",
     diluent:$("dDiluent").value
   };
   localStorage.setItem("anesthDilutionPrefs",JSON.stringify(prefs));
 }
});
function updateDilution(){
 if(!dilutionDrug)return; let target=parseFloat($("dTarget").value)||0,final=parseFloat($("dFinal").value)||0,stock=dilutionDrug.stock,c=calc(dilutionDrug);
 // v0.62: target concentration is in the stock unit, so use the dose already
 // converted into that unit rather than the raw dose.
 let doseInStockUnit=c.totalInStockUnit;
 let drugVol=target*final/stock,dilVol=final-drugVol;
 let draw=(target>0&&doseInStockUnit!=null&&isFinite(doseInStockUnit))?doseInStockUnit/target:NaN;
 $("dDiluentName").textContent=$("dDiluent").value;$("dDrugVol").textContent=fmt(drugVol)+" mL";$("dDiluentVol").textContent=fmt(dilVol)+" mL";
 $("dFinalLine").textContent=`${fmt(final)} mL @ ${fmt(target)} ${dilutionDrug.stockUnit}`;$("dDraw").textContent=fmt(draw)+(c.rate?(dilutionDrug.unit.includes("/hr")?" mL/hr":" mL/min"):" mL");
 let alerts=[]; if(target<=0||final<=0)alerts.push("Target concentration and final volume must be > 0.");
 let notes=[];
 if(doseInStockUnit==null||!isFinite(doseInStockUnit))alerts.push(c.volNote||"Dose unit and stock unit are not compatible; DRAW volume cannot be calculated.");
 if(c.unitConverted)notes.push(`Dose is in ${c.unit} and the prepared concentration is in ${dilutionDrug.stockUnit}. The DRAW volume already accounts for this conversion.`);
 if(target>stock)alerts.push("Target concentration is higher than stock; this cannot be achieved by simple dilution.");
 if(dilVol<0)alerts.push("Calculated diluent volume is negative. Check target concentration.");
 if(draw>final && !c.rate)alerts.push("Required DRAW volume exceeds the prepared final volume.");
 $("dAlert").innerHTML=(alerts.length?`<div class="badAlert">⚠ ${esc(alerts.join(" "))}</div>`:"")+(notes.length?`<div class="unitConvNote">ℹ ${esc(notes.join(" "))}</div>`:"");
 if(!alerts.length && target>0 && final>0){dilutionPrefs[dilutionDrug.id]={target,final,drugVol,dilVol,diluent:$("dDiluent").value};localStorage.setItem("anesthDilutionPrefs",JSON.stringify(dilutionPrefs));}

}

let cs="last";const C=[
["last","LAST"],["mh","Malignant Hyperthermia"],["perls","Perioperative Arrest"],
["ana","Anaphylaxis"],["brady","Bradycardia"],["tachy","Tachycardia"],
["lary","Laryngospasm"],["broncho","Bronchospasm"],["cico","Difficult airway / CICO"],
["hem","Massive hemorrhage"],["hyperk","Hyperkalemia"],["hypogly","Hypoglycemia"],
["hypotension","Severe hypotension"],["air","Gas / air embolism"],["ptx","Tension pneumothorax"],
["pe","Pulmonary embolism"],["asp","Aspiration"],["highspinal","High neuraxial block"]
];
window.pick=x=>{cs=x;crisis()};

function perlsBanner(){
 return `<div class="perlsBanner"><b>PeRLS 2025 perioperative backbone</b>Resuscitate and identify/treat the likely perioperative precipitating cause in parallel. Use available OR data immediately: ETCO₂ trend, airway pressure, SpO₂, arterial line, surgical field/blood loss, recent drugs, regional/local anesthetic exposure and procedure events.</div>`;
}
function perlsCauses(){
 return `<div class="causeGrid">
 <div class="cause"><b>Airway / oxygenation</b>Tube/circuit problem, laryngospasm, bronchospasm, aspiration, hypoxia</div>
 <div class="cause"><b>Circulation / bleeding</b>Hemorrhage, hypovolemia, venous return obstruction</div>
 <div class="cause"><b>Drug / reaction</b>Anaphylaxis, LAST, medication error/toxicity</div>
 <div class="cause"><b>Procedure / mechanical</b>Tension pneumothorax, tamponade, gas embolism, PE</div>
 <div class="cause"><b>Metabolic</b>Hyperkalemia, severe acidosis, hypoglycemia, temperature disorder</div>
 <div class="cause"><b>Anesthesia-specific</b>MH, neuraxial complications, high block, anesthetic-related causes</div>
 </div>`;
}

function crisis(){
 $("cbuttons").innerHTML=C.map(x=>`<button onclick="pick('${x[0]}')" class="${cs==x[0]?"sel":""}">${x[1]}</button>`).join("");
 let ped=(years<18), w=weight, h="";
 if(cs==="last"){
   let small=w<70,bol=small?1.5*w:100,inf=small?.25*w:null;
   h=`<div class="crisisCard"><h2>LAST</h2>${perlsBanner()}
   <div class="crisisDx"><b>Recognition / diagnosis</b>Suspect after local anesthetic exposure with new neurologic toxicity (eg, agitation, seizure, altered consciousness) and/or cardiovascular toxicity (hypotension, conduction disturbance, ventricular arrhythmia, cardiovascular collapse). Stop local anesthetic immediately.</div>
   <div class="crisisSteps">
   <div class="crisisStep"><b>Call for help + LAST rescue kit</b><br>Secure airway, give oxygen, avoid hypoxia/acidosis. Treat seizure; benzodiazepine preferred.</div>
   <div class="crisisStep"><b>Give 20% lipid emulsion early</b><div class="crisisDose">${small?fmt(bol)+" mL bolus":"~100 mL bolus"}<small>${small?"1.5 mL/kg over 2–3 min":"over 2–3 min"}</small></div><div class="crisisDose">${small?fmt(inf)+" mL/min":"~250 mL over 15–20 min"}<small>${small?"0.25 mL/kg/min":""}</small></div></div>
   <div class="crisisStep"><b>If unstable</b><br>Repeat lipid bolus and double infusion. Epinephrine: use smaller-than-standard doses; ASRA suggests starting ≤1 mcg/kg.</div>
   <div class="crisisStep"><b>Avoid</b><br>Additional local anesthetic, beta-blockers, calcium-channel blockers and vasopressin.</div>
   <div class="crisisStep"><b>After stabilization</b><br>Continue lipid >15 min after hemodynamic stability; maximum lipid <b>${fmt(12*w)} mL</b> (12 mL/kg). Observe at least 2 h after seizure or 4–6 h after cardiovascular instability.</div></div>
   <div class="sourceTag">ASRA LAST Checklist 2020 v1.1 (disease-specific primary) • PeRLS 2025 perioperative framework • AHA 2025 Special Circumstances</div></div>`;
 } else if(cs==="mh"){
   let initial=Math.min(2.5*weight,300), repeatLow=1*weight, repeatHigh=Math.min(2.5*weight,300), vial=Math.ceil(initial/20);
   h=`<div class="crisisCard"><h2>Malignant Hyperthermia</h2>${perlsBanner()}
   <span class="primaryThai">PRIMARY: RCAT 2569</span>
   <div class="crisisDx"><b>Recognition / diagnosis</b>สงสัย MH เมื่อมี ETCO₂ สูงผิดปกติ, tachycardia/arrhythmia, masseter spasm หลัง succinylcholine, generalized rigidity หรือ mixed respiratory/metabolic acidosis; อุณหภูมิสูงอย่างรวดเร็วและ myoglobinuria อาจเกิดตามมา. ประเมิน differential เช่น light anesthesia, inadequate ventilation, exhausted CO₂ absorber, machine problem, laparoscopic CO₂ load, sepsis, anaphylaxis และ thyroid storm.</div>
   <div class="crisisSteps">
   <div class="crisisStep"><b>หยุด trigger ทันที</b><br>หยุด succinylcholine, ปิด volatile anesthetic และนำ vaporizer ออกจากเครื่อง. เรียกทีมช่วยเหลือและแจ้งศัลยแพทย์ให้ยกเลิก/เร่งจบการผ่าตัดตามความเหมาะสม.</div>
   <div class="crisisStep"><b>100% O₂ + hyperventilate</b><br>เพิ่ม minute ventilation ประมาณ 2–3 เท่าปกติ และ oxygen fresh-gas flow 10–15 L/min ตาม RCAT.</div>
   <div class="crisisStep"><b>Dantrolene — initial</b><div class="crisisDose">${fmt(initial)} mg IV<small>RCAT: 2.5 mg/kg actual body weight; maximum 300 mg per dose</small></div><div>ประเทศไทย: 20 mg/vial + sterile water 60 mL/vial → สำหรับ initial dose นี้เตรียม <b>${vial} vial(s)</b> (ปัดขึ้น)</div></div>
   <div class="crisisStep"><b>Dantrolene — repeat if inadequate response</b><div class="crisisDose">${fmt(repeatLow)}–${fmt(repeatHigh)} mg IV<small>RCAT: 1–2.5 mg/kg every 10–15 min; max 300 mg per dose</small></div><div>ติดตาม ETCO₂, muscle rigidity และ core temperature. หาก cumulative 10 mg/kg แล้วยังไม่ดีขึ้น ให้ทบทวน differential; หากยังสงสัย MH สามารถพิจารณาเกิน 10 mg/kg ได้.</div></div>
   <div class="crisisStep"><b>Cooling + metabolic complications</b><br>Cooling ตามข้อบ่งชี้และหยุดเมื่อ core temperature ถึง 38.5°C. ถ้า pH &lt;7.2: RCAT ระบุ 7.5% NaHCO₃ 1–2 mmol/kg IV. Hyperkalemia: regular insulin 0.1 U/kg + 50% dextrose 1 mL/kg IV. หลีกเลี่ยง calcium-channel blockers ร่วมกับ dantrolene.</div>
   <div class="crisisStep"><b>Monitoring / labs</b><br>Core temperature, ECG, BP, SpO₂, ETCO₂; พิจารณา arterial line/urinary catheter/central access ตามความรุนแรง. ตรวจ ABG, glucose, renal function, electrolytes/Ca, lactate, CK, myoglobin, LFT, CBC/coagulation และ urine myoglobin.</div>
   <div class="crisisStep"><b>After crisis</b><br>ดูแลใกล้ชิดใน ICU อย่างน้อย 24 h และเฝ้าระวัง recrudescence. RCAT ไม่แนะนำ routine prophylactic dantrolene แบบ scheduled bolus หรือ continuous infusion หลังควบคุม crisis; หากเกิดอาการซ้ำ ให้ใช้แนวทาง RCAT ตามเวลาที่เกิดซ้ำ.</div>
   </div>
   <details class="conflict"><summary>⚠ Guideline differences — แตะเพื่อดู</summary><div class="conflictBody">
   <b>ใน Anesthculator Thailand Edition ให้ RCAT 2569 เป็นค่าหลักเมื่อข้อมูลต่างกัน</b>
   <table><tr><th>ประเด็น</th><th>RCAT 2569</th><th>MHAUS / international cross-check</th></tr>
   <tr><td>Initial dantrolene</td><td>2.5 mg/kg actual body weight; max 300 mg/dose</td><td>2.5 mg/kg initial; repeat until response</td></tr>
   <tr><td>Repeat dose/timing</td><td>1–2.5 mg/kg every 10–15 min</td><td>MHAUS materials emphasize repeat dosing until response; some expert FAQ material describes shorter intervals in rapidly evolving crisis</td></tr>
   <tr><td>Cooling stop point</td><td>38.5°C</td><td>MHAUS commonly targets no more than about 38°C</td></tr>
   <tr><td>Post-crisis dantrolene</td><td><b>No routine prophylactic scheduled/continuous dantrolene</b>; treat recrudescence if it occurs</td><td>MHAUS has recommended maintenance dosing after acute control</td></tr></table>
   <p>เหตุผลที่แสดงหมายเหตุนี้: guideline ต่างประเทศและ RCAT ไม่ตรงกันทุกจุด จึงไม่ควรซ่อนความแตกต่างจากผู้ใช้.</p>
   </div></details>
   <div class="sourceTag">Primary: RCAT Clinical Practice Guideline for MH, 2569 (GL version 150469) • Cross-check: MHAUS • Perioperative framework: PeRLS 2025</div></div>`;
 } else if(cs==="perls"){
   if(ped){
     let epi=.01*w, amio=Math.min(5*w,300), lido=1*w;
     h=`<div class="crisisCard"><h2>Pediatric Cardiac Arrest</h2>${perlsBanner()}
     <div class="crisisDx"><b>Diagnosis</b>No pulse / signs of circulation → start CPR. Attach monitor/defibrillator and classify rhythm as VF/pVT (shockable) or asystole/PEA (nonshockable).</div>
     <div class="crisisSteps">
     <div class="crisisStep"><b>Start high-quality CPR + oxygen</b><br>100–120/min, depth ≥1/3 AP chest. IV/IO. Rhythm check every 2 min.</div>
     <div class="crisisStep"><b>If VF/pVT</b><div class="crisisDose">${fmt(2*w)} J first shock<small>2 J/kg</small></div><div class="crisisDose">${fmt(4*w)} J second shock<small>4 J/kg; subsequent ≥4 J/kg, max 10 J/kg or adult dose</small></div></div>
     <div class="crisisStep"><b>Epinephrine</b><div class="crisisDose">${fmt(epi)} mg IV/IO<small>0.01 mg/kg of 0.1 mg/mL; max 1 mg, every 3–5 min. For nonshockable rhythm give ASAP.</small></div></div>
     <div class="crisisStep"><b>Refractory VF/pVT</b><div class="crisisDose">${fmt(amio)} mg amiodarone<small>5 mg/kg, max 300 mg; or lidocaine ${fmt(lido)} mg (1 mg/kg)</small></div></div>
     <div class="crisisStep"><b>Advanced airway + reversible causes</b><br>Continuous compressions; breath every 2–3 sec after advanced airway. Treat reversible causes and the likely perioperative precipitating cause simultaneously.</div><div class="crisisStep"><b>PeRLS cause-directed search</b>${perlsCauses()}</div></div>
     <div class="sourceTag">PeRLS 2025 perioperative backbone • AHA/AAP 2025 Pediatric Cardiac Arrest Algorithm</div></div>`;
   } else {
     h=`<div class="crisisCard"><h2>Adult Cardiac Arrest</h2>${perlsBanner()}
     <div class="crisisDx"><b>Diagnosis</b>No pulse → CPR immediately. Attach monitor/defibrillator; distinguish VF/pVT from asystole/PEA while actively searching for the perioperative cause.</div>
     <div class="crisisSteps">
     <div class="crisisStep"><b>High-quality CPR + oxygen</b><br>100–120/min, depth ≥5 cm; 30:2 until advanced airway, then continuous compressions + 1 breath every 6 sec.</div>
     <div class="crisisStep"><b>VF/pVT</b><br>Defibrillate: biphasic manufacturer recommendation (commonly 120–200 J); if unknown use maximum available. CPR 2 min after shock.</div>
     <div class="crisisStep"><b>Epinephrine</b><div class="crisisDose">1 mg IV/IO<small>every 3–5 min; nonshockable rhythm: give as soon as feasible</small></div></div>
     <div class="crisisStep"><b>Refractory VF/pVT</b><div class="crisisDose">Amiodarone 300 mg<small>second dose 150 mg; OR lidocaine 1–1.5 mg/kg then 0.5–0.75 mg/kg</small></div></div>
     <div class="crisisStep"><b>Airway + reversible/perioperative causes</b><br>Capnography. Treat hypovolemia/hemorrhage, hypoxia, acidosis, K⁺ disturbance, hypothermia, tension PTX, tamponade, toxins, PE/coronary thrombosis; also consider anaphylaxis, LAST, MH, gas embolism and procedure-specific causes.</div><div class="crisisStep"><b>PeRLS cause-directed search</b>${perlsCauses()}</div></div>
     <div class="sourceTag">PeRLS 2025 perioperative backbone • AHA 2025 Adult Cardiac Arrest Algorithm</div></div>`;
   }
 } else if(cs==="brady"){
   if(ped){
     let epi=Math.min(.01*w,1), atrop=Math.min(Math.max(.02*w,.1),.5);
     h=`<div class="crisisCard"><h2>Pediatric Bradycardia With a Pulse</h2>${perlsBanner()}<div class="crisisDx"><b>Recognition</b>Bradycardia + cardiopulmonary compromise. Correct hypoxia/ventilation first. If HR &lt;60/min with compromise despite effective ventilation/oxygen, start CPR.</div><div class="crisisSteps"><div class="crisisStep"><b>Airway / oxygen / monitor / IV-IO</b><br>Treat hypoxia, hypotension, hypoglycemia, hypothermia, acidosis and toxins.</div><div class="crisisStep"><b>If persistent compromise</b><div class="crisisDose">Epinephrine ${fmt(epi)} mg IV/IO<small>0.01 mg/kg; max 1 mg</small></div></div><div class="crisisStep"><b>If increased vagal tone or primary AV block</b><div class="crisisDose">Atropine ${fmt(atrop)} mg IV/IO<small>0.02 mg/kg; min 0.1 mg, max single 0.5 mg; may repeat once</small></div></div><div class="crisisStep"><b>Refractory complete heart block/sinus-node dysfunction</b><br>Consider emergency transcutaneous pacing.</div></div><div class="sourceTag">PeRLS 2025 perioperative framework • AHA/AAP 2025 Pediatric Bradycardia Algorithm</div></div>`;
   } else h=`<div class="crisisCard"><h2>Adult Symptomatic Bradycardia</h2>${perlsBanner()}<div class="crisisDx"><b>Recognition</b>Bradyarrhythmia with hypotension, altered mental status, shock, ischemic chest discomfort or acute heart failure: support ABCs and treat reversible cause.</div><div class="crisisSteps"><div class="crisisStep"><b>Atropine</b><div class="crisisDose">1 mg IV<small>repeat every 3–5 min; max 3 mg</small></div></div><div class="crisisStep"><b>If ineffective</b><br>Transcutaneous pacing and/or epinephrine or dopamine infusion; prepare for transvenous pacing when indicated.</div></div><div class="sourceTag">PeRLS 2025 perioperative framework • AHA 2025 Adult Bradycardia With a Pulse Algorithm</div></div>`;
 } else if(cs==="ana"){
   if(years<=12){
     let mod=2*weight, lifeLow=4*weight, lifeHigh=10*weight, fluid=20*weight;
     h=`<div class="crisisCard"><h2>Perioperative Anaphylaxis — Paediatric</h2>${perlsBanner()}
     <div class="crisisDx"><b>Recognition</b>Unresponsive hypotension and/or bronchospasm after a likely perioperative trigger. Skin signs may be absent.</div>
     <div class="crisisSteps">
     <div class="crisisStep"><b>Stop trigger + call for help/anaphylaxis box</b><br>100% O₂, secure airway, check capnography; consider early intubation if airway oedema.</div>
     <div class="crisisStep"><b>Rapid crystalloid</b><div class="crisisDose">${fmt(fluid)} mL<small>20 mL/kg; repeat as needed</small></div></div>
     <div class="crisisStep"><b>IV adrenaline — monitored anesthesia setting</b><div class="crisisDose">${fmt(mod)} mcg<small>Moderate: 2 mcg/kg IV; ANZAAG dilution 20 mcg/mL → ${fmt(mod/20)} mL</small></div><div class="crisisDose">${fmt(lifeLow)}–${fmt(lifeHigh)} mcg<small>Life-threatening: 4–10 mcg/kg IV → ${fmt(lifeLow/20)}–${fmt(lifeHigh/20)} mL at 20 mcg/mL; repeat every 1–2 min as needed</small></div></div>
     <div class="crisisStep"><b>Adrenaline infusion</b><div class="crisisDose">${fmt(.1*weight)} mcg/min starting<small>0.1 mcg/kg/min; ANZAAG: 1 mg in 50 mL = 20 mcg/mL, start 0.3 mL/kg/h and titrate up to 2 mcg/kg/min</small></div></div>
     <div class="crisisStep"><b>If PEA cardiac arrest</b><div class="crisisDose">${fmt(.01*weight)} mg IV/IO<small>10 mcg/kg; follow PALS/non-shockable arrest algorithm</small></div></div>
     </div>
     <details class="conflict"><summary>⚠ Guideline differences — แตะเพื่อดู</summary><div class="conflictBody">ANZAAG/ANZCA provides anesthesia-specific titrated IV adrenaline doses in a monitored perioperative setting. AHA 2025 focuses primarily on cardiac arrest from anaphylaxis and notes uncertainty about standard IM anaphylaxis dosing once arrest has occurred. For Thailand Edition, this is shown as an international perioperative reference pending RCAT/institutional reconciliation.</div></details>
     <div class="sourceTag">ANZAAG/ANZCA Paediatric Immediate Management 2022 • AHA 2025 Special Circumstances • PeRLS 2025 • Thai reconciliation pending</div></div>`;
   } else {
     h=`<div class="crisisCard"><h2>Perioperative Anaphylaxis — Adult</h2>${perlsBanner()}
     <div class="crisisDx"><b>Recognition</b>Sudden hypotension/collapse and/or bronchospasm after a likely trigger; severe reactions may have minimal skin signs.</div>
     <div class="crisisSteps">
     <div class="crisisStep"><b>Stop trigger + call for help/anaphylaxis box</b><br>100% O₂, secure airway, capnography, remove likely trigger, stop procedure if needed.</div>
     <div class="crisisStep"><b>Rapid crystalloid</b><br>ANZAAG adult card: 500 mL for moderate hypotension; ~1000 mL for life-threatening reaction, with further large-volume resuscitation as needed.</div>
     <div class="crisisStep"><b>IV adrenaline — monitored anesthesia setting</b><div class="crisisDose">10–20 mcg IV<small>Moderate; escalate to 50 mcg if inadequate response</small></div><div class="crisisDose">50–100 mcg IV<small>Life-threatening; escalate to 200 mcg if inadequate response</small></div><div>Recommended preparation: 1 mg in 10 mL = <b>100 mcg/mL</b>. Thus 10 mcg = 0.1 mL; 20 mcg = 0.2 mL; 50 mcg = 0.5 mL; 100 mcg = 1 mL; 200 mcg = 2 mL.</div></div>
     <div class="crisisStep"><b>If >3 boluses / persistent shock</b><div class="crisisDose">Adrenaline infusion 3 mcg/min starting<small>ANZAAG: 3 mg in 50 mL saline; 3 mL/h = 3 mcg/min, titrate; stated range 0.05–0.5 mcg/kg/min</small></div></div>
     <div class="crisisStep"><b>If SBP &lt;50 mmHg</b><br>ANZAAG recommends starting chest compressions.</div>
     <div class="crisisStep"><b>If PEA cardiac arrest</b><div class="crisisDose">Epinephrine 1 mg IV<small>then follow non-shockable ALS; ANZAAG card repeats 1–2 min as needed, while AHA standard adult arrest uses 1 mg every 3–5 min</small></div></div>
     </div>
     <details class="conflict"><summary>⚠ Guideline differences — แตะเพื่อดู</summary><div class="conflictBody"><table><tr><th>Issue</th><th>ANZAAG/ANZCA perioperative</th><th>Other reference</th></tr><tr><td>Initial IV adrenaline</td><td>Moderate 10–20 mcg; life-threatening 50–100 mcg</td><td>RCUK perioperative algorithm commonly recommends 50 mcg initial in adults >12 y, while acknowledging 10–50 mcg titration may be sufficient</td></tr><tr><td>PEA arrest repeat interval</td><td>1 mg IV, repeat 1–2 min as needed</td><td>AHA adult arrest: 1 mg every 3–5 min</td></tr></table><p>Because these differ, the app shows the conflict rather than silently choosing one. A Thai-primary default will be set when an RCAT/institutional perioperative anaphylaxis guideline is verified.</p></div></details>
     <div class="sourceTag">ANZAAG/ANZCA Adult Immediate Management 2022 • Resuscitation Council UK perioperative algorithm 2024 • AHA 2025 Special Circumstances • PeRLS 2025</div></div>`;
   }
 } else if(cs==="tachy"){
   if(years<18){
     h=`<div class="crisisCard"><h2>Pediatric Tachycardia With a Pulse</h2>${perlsBanner()}
     <div class="crisisDx"><b>Recognition</b>Assess QRS width and hemodynamic compromise. Treat reversible perioperative causes such as pain/light anesthesia, hypovolemia, hypoxia, hypercarbia, fever, anaphylaxis or drug effects.</div>
     <div class="crisisSteps"><div class="crisisStep"><b>Unstable</b><br>Synchronized cardioversion per AHA/PALS age-appropriate algorithm.</div><div class="crisisStep"><b>Stable narrow-complex</b><br>Vagal maneuvers/adenosine pathway may apply when SVT is suspected; exact dosing should follow current AHA/AAP PALS algorithm.</div></div>
     <div class="sourceTag">PeRLS 2025 • AHA/AAP 2025 Pediatric Tachycardia With a Pulse</div></div>`;
   } else {
     h=`<div class="crisisCard"><h2>Adult Tachycardia With a Pulse</h2>${perlsBanner()}
     <div class="crisisDx"><b>Recognition</b>Assess instability: hypotension, altered mental status, shock, ischemic chest discomfort or acute heart failure. Identify QRS width and likely rhythm.</div>
     <div class="crisisSteps"><div class="crisisStep"><b>Unstable</b><br>Synchronized cardioversion; sedate if feasible without delaying treatment.</div><div class="crisisStep"><b>Stable</b><br>Use rhythm/QRS-directed AHA pathway while correcting perioperative triggers.</div></div>
     <div class="sourceTag">PeRLS 2025 • AHA 2025 Adult Tachycardia With a Pulse</div></div>`;
   }
 } else if(cs==="broncho"){
   h=`<div class="crisisCard"><h2>Bronchospasm</h2>${perlsBanner()}
   <div class="crisisDx"><b>Recognition</b>Wheezing or silent chest, increased peak airway pressure, prolonged expiration, rising ETCO₂ and impaired ventilation. Exclude tube kink/obstruction, mainstem intubation, pneumothorax and anaphylaxis.</div>
   <div class="crisisSteps"><div class="crisisStep"><b>100% O₂ + manual ventilation</b><br>Check circuit and ETT; suction if needed.</div><div class="crisisStep"><b>Deepen anesthesia</b><br>Use agent appropriate to hemodynamics and local practice.</div><div class="crisisStep"><b>Bronchodilator therapy</b><br>Inhaled beta-agonist is typical first-line; IV epinephrine may be needed when bronchospasm is part of anaphylaxis or severe collapse.</div></div>
   <details class="conflict"><summary>⚠ Guideline differences — แตะเพื่อดู</summary><div class="conflictBody">Specific inhaled/IV bronchodilator doses vary by adult/pediatric source and device. This build shows the algorithm but does not present one universal dose until Thai institutional reconciliation is complete.</div></details></div>`;
 } else if(cs==="cico"){
   h=`<div class="crisisCard"><h2>Difficult Airway / CICO</h2>${perlsBanner()}
   <div class="crisisDx"><b>Recognition</b>Cannot intubate and cannot oxygenate despite optimized attempts. Treat as an oxygenation emergency.</div>
   <div class="crisisSteps"><div class="crisisStep"><b>Call for help early</b><br>Optimize mask ventilation, airway adjuncts, positioning and neuromuscular blockade as appropriate.</div><div class="crisisStep"><b>Supraglottic rescue</b><br>Attempt effective oxygenation rather than repeated traumatic laryngoscopy.</div><div class="crisisStep"><b>If oxygenation still fails</b><br>Proceed to emergency front-of-neck access according to adult/pediatric difficult-airway protocol.</div></div>
   <div class="sourceTag">PeRLS perioperative framework • ASA difficult-airway concepts • Thai airway protocol reconciliation pending</div></div>`;
 } else if(cs==="hem"){
   h=`<div class="crisisCard"><h2>Massive Hemorrhage</h2>${perlsBanner()}
   <div class="crisisDx"><b>Recognition</b>Rapid blood loss, falling BP, narrowing pulse pressure, tachycardia, low ETCO₂, poor perfusion or visible surgical hemorrhage.</div>
   <div class="crisisSteps"><div class="crisisStep"><b>Activate massive transfusion pathway</b><br>Call blood bank/team early; obtain large-bore access/rapid infuser and warming.</div><div class="crisisStep"><b>Hemostatic resuscitation</b><br>Use institution-specific blood-component ratio or viscoelastic-guided strategy.</div><div class="crisisStep"><b>Correct physiology</b><br>Prevent hypothermia, hypocalcemia, severe acidosis and dilutional coagulopathy; monitor ionized calcium, fibrinogen and coagulation.</div></div>
   <details class="conflict"><summary>⚠ Guideline differences — แตะเพื่อดู</summary><div class="conflictBody">Component ratios, fibrinogen thresholds and antifibrinolytic protocols vary substantially by institution and surgical population. Thailand default should follow each hospital's massive-transfusion protocol rather than a single universal preset.</div></details></div>`;
 } else if(cs==="hyperk"){
   h=`<div class="crisisCard"><h2>Hyperkalemia</h2>${perlsBanner()}
   <div class="crisisDx"><b>Recognition</b>ECG changes, muscle weakness or peri-arrest deterioration with known/suspected elevated K⁺. Confirm rapidly when feasible without delaying treatment in instability.</div>
   <div class="crisisSteps"><div class="crisisStep"><b>Stabilize myocardium</b><br>Calcium is commonly used when ECG toxicity is present.</div><div class="crisisStep"><b>Shift potassium intracellularly</b><br>Insulin + glucose and beta-agonist strategies are common; bicarbonate may be considered with significant acidosis.</div><div class="crisisStep"><b>Remove potassium</b><br>Consider dialysis or definitive elimination strategy depending on cause and clinical context.</div></div>
   <details class="conflict"><summary>⚠ Evidence / guideline note — แตะเพื่อดู</summary><div class="conflictBody">AHA 2025 notes that in hyperkalemic cardiac arrest, effectiveness of IV calcium, bicarbonate and insulin/glucose on clinical outcomes is not well established despite common physiologic use. The app therefore avoids presenting these as equivalent-evidence interventions to standard CPR/defibrillation.</div></details>
   <div class="sourceTag">AHA 2025 Special Circumstances • PeRLS 2025 • Thai electrolyte protocol reconciliation pending</div></div>`;
 } else if(cs==="hypogly"){
   h=`<div class="crisisCard"><h2>Hypoglycemia</h2>${perlsBanner()}
   <div class="crisisDx"><b>Recognition</b>Low measured glucose with altered consciousness, seizure, unexplained delayed emergence or autonomic instability.</div>
   <div class="crisisSteps"><div class="crisisStep"><b>Confirm glucose immediately</b><br>Point-of-care testing if available.</div><div class="crisisStep"><b>Give IV dextrose when symptomatic/severe</b><br>Concentration and dose differ substantially by neonate/child/adult and institutional policy.</div><div class="crisisStep"><b>Recheck glucose</b><br>Repeat and treat the underlying cause.</div></div>
   <details class="conflict"><summary>⚠ Guideline differences — แตะเพื่อดู</summary><div class="conflictBody">Pediatric and adult dextrose concentration/dose conventions differ across institutions. Exact dose is withheld until Thai pediatric/adult emergency protocols are reconciled.</div></details></div>`;
 } else if(cs==="hypotension"){
   h=`<div class="crisisCard"><h2>Severe Hypotension</h2>${perlsBanner()}
   <div class="crisisDx"><b>Recognition</b>Marked BP reduction with poor perfusion. In the OR, rapidly identify whether the dominant mechanism is hypovolemia/bleeding, vasodilation, myocardial dysfunction, obstruction or anaphylaxis.</div>
   <div class="crisisSteps"><div class="crisisStep"><b>Immediate support</b><br>100% O₂ if unstable, reduce anesthetic contribution when appropriate, assess volume status and surgical field.</div><div class="crisisStep"><b>Mechanism-directed vasopressor/inotrope</b><br>Choice of phenylephrine, ephedrine, norepinephrine, epinephrine or other agents depends on physiology and patient context.</div></div>
   <details class="conflict"><summary>⚠ Guideline differences — แตะเพื่อดู</summary><div class="conflictBody">Bolus and infusion doses differ by age, institution and anesthesia practice. Exact values remain a protocol-level local setting rather than a single global default.</div></details></div>`;
 } else if(cs==="air"){
   h=`<div class="crisisCard"><h2>Gas / Air Embolism</h2>${perlsBanner()}
   <div class="crisisDx"><b>Recognition</b>Sudden ETCO₂ drop, hypoxemia, hypotension, arrhythmia or cardiovascular collapse during a procedure with risk of venous air/gas entry.</div>
   <div class="crisisSteps"><div class="crisisStep"><b>Stop further gas entry</b><br>Alert surgeon, flood/occlude source when feasible and stop insufflation if relevant.</div><div class="crisisStep"><b>100% O₂ + hemodynamic support</b><br>Discontinue nitrous oxide if in use.</div><div class="crisisStep"><b>Consider aspiration via central venous catheter</b><br>If catheter position and clinical circumstances make this feasible.</div></div>
   <div class="sourceTag">AHA 2025 Special Circumstances • PeRLS perioperative framework</div></div>`;
 } else if(cs==="ptx"){
   h=`<div class="crisisCard"><h2>Tension Pneumothorax</h2>${perlsBanner()}
   <div class="crisisDx"><b>Recognition</b>Sudden hypoxemia, hypotension, rising airway pressure, unilateral breath-sound reduction and obstructive shock physiology.</div>
   <div class="crisisSteps"><div class="crisisStep"><b>Do not wait for imaging in instability</b><br>Immediate decompression when clinical suspicion is high.</div><div class="crisisStep"><b>Definitive drainage</b><br>Follow with chest tube / definitive thoracic management.</div></div>
   <div class="sourceTag">PeRLS perioperative framework • AHA reversible-cause concepts</div></div>`;
 } else if(cs==="pe"){
   h=`<div class="crisisCard"><h2>Pulmonary Embolism</h2>${perlsBanner()}
   <div class="crisisDx"><b>Recognition</b>Sudden hypoxemia, ETCO₂ fall, RV strain/hemodynamic collapse, especially with thromboembolic risk.</div>
   <div class="crisisSteps"><div class="crisisStep"><b>Support oxygenation and circulation</b><br>Use bedside echo when available to assess RV strain and alternative causes.</div><div class="crisisStep"><b>If cardiac arrest from suspected PE</b><br>Follow AHA arrest algorithm and consider reperfusion strategy appropriate to the setting.</div></div>
   <div class="sourceTag">AHA 2025 Special Circumstances • PeRLS 2025</div></div>`;
 } else if(cs==="asp"){
   h=`<div class="crisisCard"><h2>Aspiration</h2>${perlsBanner()}
   <div class="crisisDx"><b>Recognition</b>Witnessed regurgitation/aspiration, desaturation, bronchospasm, particulate material or new pulmonary findings.</div>
   <div class="crisisSteps"><div class="crisisStep"><b>Protect airway + oxygenate</b><br>Suction oropharynx; intubate if needed for airway protection/ventilation.</div><div class="crisisStep"><b>Suction trachea when appropriate</b><br>Avoid unnecessary delay in oxygenation; bronchoscopy may be considered for particulate material.</div><div class="crisisStep"><b>Post-event care</b><br>Supportive respiratory management; antibiotics/steroids are not automatically indicated solely because aspiration occurred.</div></div></div>`;
 } else if(cs==="highspinal"){
   h=`<div class="crisisCard"><h2>High / Total Neuraxial Block</h2>${perlsBanner()}
   <div class="crisisDx"><b>Recognition</b>Rapidly ascending sensory/motor block with dyspnea, arm weakness, severe hypotension/bradycardia, loss of consciousness or apnea after neuraxial anesthesia.</div>
   <div class="crisisSteps"><div class="crisisStep"><b>Call for help + 100% O₂</b><br>Support ventilation; prepare for tracheal intubation if apnea or loss of airway reflexes.</div><div class="crisisStep"><b>Aggressive hemodynamic support</b><br>Fluids and vasopressor/inotrope therapy according to physiology and local neuraxial emergency protocol.</div><div class="crisisStep"><b>Continue support until block recedes</b><br>Exclude LAST, anaphylaxis, hemorrhage and other perioperative causes if presentation is atypical.</div></div>
   <details class="conflict"><summary>⚠ Guideline differences — แตะเพื่อดู</summary><div class="conflictBody">Vasopressor selection and dose vary by obstetric vs non-obstetric context and institutional practice. Exact drug doses remain local-protocol driven.</div></details></div>`;
 } else if(cs==="lary"){
   h=`<div class="crisisCard"><h2>Laryngospasm</h2>${perlsBanner()}<div class="crisisDx"><b>Recognition</b>Inspiratory obstruction/stridor or silent complete obstruction, poor air movement, paradoxical chest movement and falling SpO₂ around airway stimulation.</div><div class="crisisSteps"><div class="crisisStep"><b>Remove stimulus + call for help</b><br>100% oxygen, airway-opening maneuver/jaw thrust, clear blood/secretions and apply CPAP with effective mask seal.</div><div class="crisisStep"><b>Deepen anesthesia if appropriate</b><br>Medication dosing is intentionally not displayed in this build until pediatric/adult laryngospasm drug doses are reconciled against the agreed Thai institutional sources.</div><div class="crisisStep"><b>If persistent complete obstruction / hypoxemia</b><br>Prepare neuromuscular blockade and tracheal intubation per institutional difficult-airway/emergency protocol.</div></div><div class="sourceTag">Algorithm structure included; drug-level Thai verification pending</div></div>`;
 }
 $("cpanel").innerHTML=h;
 enhanceCrisisPanel();
}

let crisisStartedAt=null,crisisTicker=null,crisisLog=[];
let crisisStepState={},crisisRoles={},crisisTimers=[],crisisDecisions={},crisisSnapshotCount=0;
const CRISIS_STATE_KEY="anesthCrisisStateV0633";
function saveCrisisState(){
 const payload={version:1,cs,startedAt:crisisStartedAt?crisisStartedAt.getTime():null,log:crisisLog,steps:crisisStepState,roles:crisisRoles,timers:crisisTimers,decisions:crisisDecisions,snapshots:crisisSnapshotCount,savedAt:Date.now()};
 try{localStorage.setItem(CRISIS_STATE_KEY,JSON.stringify(payload));safetyDBPut("crisisState",payload)}catch(e){console.warn("Crisis state save failed",e)}
}
function clearCrisisState(){try{localStorage.removeItem(CRISIS_STATE_KEY);safetyDBDelete("crisisState")}catch(e){}}
function restoreCrisisState(){
 try{const raw=localStorage.getItem(CRISIS_STATE_KEY);if(!raw)return false;const x=JSON.parse(raw);if(!x||!x.startedAt)return false;
 cs=x.cs||cs;crisisStartedAt=new Date(x.startedAt);crisisLog=Array.isArray(x.log)?x.log:[];crisisStepState=x.steps||{};crisisRoles=x.roles||{};crisisTimers=Array.isArray(x.timers)?x.timers:[];crisisDecisions=x.decisions||{};crisisSnapshotCount=+x.snapshots||0;return true
 }catch(e){console.warn("Crisis restore failed",e);return false}
}
const CRISIS_ROLES=["Team leader","Airway","Drugs","Circulation / CPR","Runner","Recorder"];
function crisisClock(t){let sec=Math.max(0,Math.floor((t-(crisisStartedAt||t))/1000));return String(Math.floor(sec/60)).padStart(2,"0")+":"+String(sec%60).padStart(2,"0")}
function crisisAddLog(label,meta={}){
 let now=new Date(),elapsed=crisisStartedAt?crisisClock(now):"--:--";
 crisisLog.push({elapsed,time:now.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit",second:"2-digit"}),label,crisis:cs,...meta});
 renderCrisisLog();saveCrisisState();
}
function renderCrisisLog(){
 let box=$("crisisLog"),count=$("crisisLogCount");if(!box||!count)return;count.textContent=crisisLog.length;
 box.innerHTML=crisisLog.length?crisisLog.map(x=>`<div class="crisisLogItem"><time>${x.elapsed}</time><div><b>${x.label}</b><br><small>${x.time} • ${C.find(c=>c[0]===x.crisis)?.[1]||x.crisis}</small></div></div>`).join(""):`<div class="note">ยังไม่มีรายการ</div>`;
}
function stepKey(i){return `${cs}:${i}`}
function getStepState(i){return crisisStepState[stepKey(i)]||"todo"}
function setStepState(i,state,title){
 crisisStepState[stepKey(i)]=state;applyStepVisual(i);saveCrisisState();
 let labels={todo:"Reopened",progress:"In progress",done:"Completed",na:"Not applicable"};
 crisisAddLog(`${labels[state]}: ${title}`,{kind:"step",step:i,state});
 updateCrisisChecklist(i,state);
}
function applyStepVisual(i){
 let el=document.querySelector(`#cpanel .crisisStep[data-step="${i}"]`);if(!el)return;
 let state=getStepState(i);el.classList.remove("todo","progress","done","na","current","collapsed");el.classList.add(state);el.dataset.state=state;

}
function currentStepNumber(){
 const steps=[...document.querySelectorAll("#cpanel .crisisStep")];
 let progress=steps.find(el=>getStepState(+el.dataset.step)==="progress");
 let next=progress||steps.find(el=>!["done","na"].includes(getStepState(+el.dataset.step)));
 return next?+next.dataset.step:null;
}
function updateCrisisChecklist(changedStep=null,state=null){
 const steps=[...document.querySelectorAll("#cpanel .crisisStep")];if(!steps.length)return;
 const current=currentStepNumber();let done=0;
 steps.forEach(el=>{const i=+el.dataset.step,st=getStepState(i);if(st==="done")done++;el.classList.toggle("current",i===current)});
 const count=$("crisisProgressCount"),fill=$("crisisProgressFill");if(count)count.textContent=`${done} / ${steps.length}`;if(fill)fill.style.width=`${steps.length?done/steps.length*100:0}%`;
 const finish=$("crisisFinishPanel");if(finish)finish.classList.toggle("show",done===steps.length);
}
function cycleStep(el){
 let i=+el.dataset.step,title=el.querySelector(".stepTitleText")?.textContent||`Step ${i}`;
 let state=getStepState(i);
 // v0.63.2: one tap behaves as a checklist. Tap once to complete; tap again to reopen.
 setStepState(i,state==="done"?"todo":"done",title);
}
function renderRoleBoard(){
 let board=$("crisisRoleBoard");if(!board)return;
 board.innerHTML=CRISIS_ROLES.map((r,i)=>`<label><span>${r}</span><input data-role="${r}" value="${crisisRoles[r]||""}" placeholder="ชื่อ / initials"><button type="button" data-claim="${r}">${crisisRoles[r]?"Change":"Claim"}</button></label>`).join("");
}
function timerText(sec){return `${String(Math.floor(sec/60)).padStart(2,"0")}:${String(sec%60).padStart(2,"0")}`}
function addCrisisTimer(seconds,label){
 if(!crisisStartedAt)startCrisis();let id=Date.now()+Math.random();crisisTimers.push({id,label,due:Date.now()+seconds*1000,seconds,status:"running"});saveCrisisState();crisisAddLog(`Timer started: ${label} (${timerText(seconds)})`,{kind:"timer"});renderTimers();
}
function renderTimers(){
 let box=$("crisisTimerList");
 if(box)box.innerHTML=crisisTimers.length?crisisTimers.map(t=>{let left=Math.max(0,Math.ceil((t.due-Date.now())/1000)),due=t.status==="due";return `<div class="crisisTimer ${due?"due":""}" data-timer-id="${t.id}"><div><b>${t.label}</b><small>${due?"DUE NOW":timerText(left)}</small></div><button type="button" data-timer-repeat="${t.id}">↻ Repeat</button><button type="button" data-timer-done="${t.id}">✓</button></div>`}).join(""):`<div class="note">ยังไม่มี active timer</div>`;
 document.querySelectorAll("#cpanel .stepContextTimer").forEach(card=>{
   const label=card.dataset.timerLabel, preset=+(card.dataset.timerSeconds||0);
   const active=[...crisisTimers].reverse().find(t=>t.label===label);
   const time=card.querySelector(".stepContextTime"), btn=card.querySelector("[data-add-timer]");
   if(active){const left=Math.max(0,Math.ceil((active.due-Date.now())/1000));time.textContent=active.status==="due"?"DUE NOW":timerText(left);card.classList.toggle("due",active.status==="due");if(btn)btn.textContent="↻ Restart timer";}
   else{time.textContent=timerText(preset);card.classList.remove("due");if(btn)btn.textContent="▶ Start timer";}
 });
}
function tickCrisis(){
 if(crisisStartedAt&&$("crisisElapsed"))$("crisisElapsed").textContent=crisisClock(new Date());
 let changed=false;crisisTimers.forEach(t=>{if(t.status==="running"&&Date.now()>=t.due){t.status="due";changed=true;crisisAddLog(`TIMER DUE: ${t.label}`,{kind:"timer_due"});}});renderTimers();
}
function contextTimersForStep(step){
 const map={
   last:{2:[[180,"Lipid bolus — 3 minutes"],[1200,"Lipid infusion — 20 minutes"]]},
   mh:{3:[[600,"Reassess response / repeat dantrolene"]]},
   ana:{2:[[120,"Reassess BP / airway response"]]},
   hyperk:{2:[[300,"Repeat ECG / K⁺ / glucose"]]},
   hypogly:{2:[[900,"Repeat glucose"]]},
   perls:{1:[[120,"Rhythm check"]]}
 };
 return map[cs]?.[step]||[];
}
function decisionForStep(step){
 const map={
   last:{2:{question:"หลังเริ่ม lipid แล้ว circulation เป็นอย่างไร?",yes:"Stable / improving",yesDetail:"Continue infusion and monitoring",yesTarget:4,no:"Persistent instability",noDetail:"Repeat bolus and increase infusion",noTarget:3}},
   mh:{3:{question:"หลังให้ dantrolene แล้ว response เพียงพอหรือไม่?",yes:"Improving",yesDetail:"Continue monitoring and treat complications",yesTarget:5,no:"Inadequate response",noDetail:"Repeat dantrolene according to protocol",noTarget:4}},
   ana:{2:{question:"หลังการรักษา BP และ airway ดีขึ้นหรือไม่?",yes:"Improving",yesDetail:"Continue observation and supportive care",yesTarget:3,no:"Not improving",noDetail:"Escalate treatment according to algorithm",noTarget:3}},
   hyperk:{2:{question:"ECG / potassium / glucose ดีขึ้นหรือไม่?",yes:"Improving",yesDetail:"Continue monitoring",yesTarget:3,no:"Persistent abnormality",noDetail:"Proceed to definitive potassium removal",noTarget:3}},
   hypogly:{2:{question:"Repeat glucose กลับสู่เป้าหมายหรือไม่?",yes:"Yes",yesDetail:"Monitor and identify the cause",yesTarget:3,no:"No",noDetail:"Repeat treatment according to local protocol",noTarget:2}},
   perls:{1:{question:"Rhythm check หลัง CPR cycle",yes:"Organized rhythm / pulse",yesDetail:"Enter post-arrest care",yesTarget:5,no:"No pulse",noDetail:"Continue the appropriate arrest branch",noTarget:2}}
 };
 return map[cs]?.[step]||null;
}
function enhanceCrisisPanel(){
 let panel=$("cpanel");if(!panel)return;let card=panel.querySelector(".crisisCard");if(!card)return;
 card.insertAdjacentHTML("afterbegin",`<div class="crisisProgress"><b>Crisis checklist progress</b><div class="crisisProgressTrack"><div id="crisisProgressFill" class="crisisProgressFill"></div></div><strong id="crisisProgressCount">0 / 0</strong></div>`);
 let ops=document.createElement("section");ops.className="crisisOps";ops.innerHTML=`
${cs==="perls"?`<details class="crisisModule"><summary>👥 CPR team roles <span>cardiac arrest only</span></summary><div id="crisisRoleBoard" class="crisisRoleBoard"></div></details>`:""}`;
 let dx=card.querySelector(".crisisDx");(dx||card.firstChild).before(ops);if(cs==="perls")renderRoleBoard();renderTimers();
 panel.querySelectorAll(".crisisStep").forEach((el,i)=>{let n=i+1;el.dataset.step=n;el.setAttribute("role","group");
   const nodes=[...el.childNodes], main=document.createElement("div");main.className="stepMain";
   const body=document.createElement("div");body.className="stepBody";nodes.forEach(node=>body.appendChild(node));const firstB=body.querySelector("b");if(firstB)firstB.classList.add("stepTitleText");main.appendChild(body);
   const timers=contextTimersForStep(n);if(timers.length){
     const wrap=document.createElement("div");wrap.className="stepContextTimers";
     wrap.innerHTML=timers.map(timer=>`<div class="stepContextTimer" data-timer-label="${timer[1]}" data-timer-seconds="${timer[0]}"><div class="stepContextTimerHead"><b>${timer[1]}</b><span class="stepContextTime">${timerText(timer[0])}</span></div><div class="stepContextTimerActions"><button type="button" data-add-timer="${timer[0]}" data-timer-label="${timer[1]}">▶ Start timer</button></div></div>`).join("");
     main.appendChild(wrap);
   }
   const decision=decisionForStep(n);
   if(decision){
     const node=document.createElement("div");node.className="stepDecisionNode";
     const selected=crisisDecisions[stepKey(n)]||"";
     node.dataset.decisionStep=n;
     node.innerHTML=`<div class="decisionQuestion">${decision.question}</div><div class="decisionBranches"><button type="button" class="decisionBranch positive ${selected==="yes"?"selected":""}" data-decision-choice="yes" data-decision-step="${n}" data-decision-target="${decision.yesTarget||n+1}"><b>${decision.yes}</b><small>${decision.yesDetail||""}</small></button><button type="button" class="decisionBranch negative ${selected==="no"?"selected":""}" data-decision-choice="no" data-decision-step="${n}" data-decision-target="${decision.noTarget||n+1}"><b>${decision.no}</b><small>${decision.noDetail||""}</small></button></div>`;
     main.appendChild(node);
   }
   el.append(main);el.insertAdjacentHTML("beforeend",`<button type="button" class="stepNaButton" data-step-na="${n}" aria-label="Mark step not applicable">N/A</button>`);applyStepVisual(n)
 });
 card.insertAdjacentHTML("beforeend",`<section id="crisisFinishPanel" class="crisisFinishPanel"><h3>✓ Crisis checklist completed</h3><p>Review the timeline and complete post-event documentation or debriefing.</p><button type="button" data-open-timeline>View timeline</button></section>`);
 updateCrisisChecklist();
}
function startCrisis(){
 if(!crisisStartedAt){crisisStartedAt=new Date();crisisAddLog("Crisis mode started");saveCrisisState();}
 $("crisisRunBar").hidden=false;$("crisisStartBtn").textContent="● CRISIS ACTIVE";$("crisisStartedAt").textContent="Started "+crisisStartedAt.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"});
 clearInterval(crisisTicker);crisisTicker=setInterval(tickCrisis,1000);tickCrisis();
}
function resetCrisis(){
 clearInterval(crisisTicker);crisisTicker=null;crisisStartedAt=null;crisisLog=[];crisisStepState={};crisisRoles={};crisisTimers=[];crisisDecisions={};crisisSnapshotCount=0;clearCrisisState();
 $("crisisRunBar").hidden=true;$("crisisElapsed").textContent="00:00";$("crisisStartBtn").textContent="▶ START CRISIS";renderCrisisLog();crisis();
}
function filterCrisis(q){q=(q||"").trim().toLowerCase();$("cbuttons").querySelectorAll("button").forEach((b,i)=>{let item=C[i],match=!q||(item[1]+" "+item[0]).toLowerCase().includes(q);b.hidden=!match});let visible=[...$("cbuttons").querySelectorAll("button")].filter(b=>!b.hidden);if(q&&!visible.length)$("cpanel").innerHTML='<div class="crisisNoResult">ไม่พบเหตุการณ์ที่ตรงกับคำค้น</div>';else if(q&&visible.length&&!visible.some(b=>b.classList.contains("sel"))){visible[0].click()}else if(!q)crisis()}

document.addEventListener("click",e=>{
 let decisionChoice=e.target.closest("[data-decision-choice]");if(decisionChoice){e.stopPropagation();if(!crisisStartedAt)startCrisis();let step=+decisionChoice.dataset.decisionStep,choice=decisionChoice.dataset.decisionChoice,target=+decisionChoice.dataset.decisionTarget;crisisDecisions[stepKey(step)]=choice;saveCrisisState();let decision=decisionForStep(step);crisisAddLog(`Reassessment: ${choice==="yes"?decision?.yes:decision?.no}`,{kind:"decision",step,choice});let node=decisionChoice.closest(".stepDecisionNode");node?.querySelectorAll(".decisionBranch").forEach(b=>b.classList.toggle("selected",b===decisionChoice));let current=document.querySelector(`#cpanel .crisisStep[data-step="${step}"]`);if(current&&getStepState(step)!=="done")setStepState(step,"done",current.querySelector(".stepTitleText")?.textContent||`Step ${step}`);requestAnimationFrame(()=>{let next=document.querySelector(`#cpanel .crisisStep[data-step="${target}"]`);next?.scrollIntoView({behavior:"smooth",block:"center"});next?.classList.add("decisionTargetFlash");setTimeout(()=>next?.classList.remove("decisionTargetFlash"),1400)});return}
 let claim=e.target.closest("[data-claim]");if(claim){let role=claim.dataset.claim,input=document.querySelector(`[data-role="${role}"]`),name=(input?.value||"").trim()||"Assigned";crisisRoles[role]=name;crisisAddLog(`${role} assigned: ${name}`,{kind:"role"});renderRoleBoard();return}
 let add=e.target.closest("[data-add-timer]");if(add){addCrisisTimer(+add.dataset.addTimer,add.dataset.timerLabel);return}
 let repeat=e.target.closest("[data-timer-repeat]");if(repeat){let t=crisisTimers.find(x=>String(x.id)===repeat.dataset.timerRepeat);if(t){t.due=Date.now()+t.seconds*1000;t.status="running";saveCrisisState();crisisAddLog(`Timer repeated: ${t.label}`);renderTimers()}return}
 let doneTimer=e.target.closest("[data-timer-done]");if(doneTimer){let t=crisisTimers.find(x=>String(x.id)===doneTimer.dataset.timerDone);if(t)crisisAddLog(`Timer acknowledged: ${t.label}`);crisisTimers=crisisTimers.filter(x=>String(x.id)!==doneTimer.dataset.timerDone);saveCrisisState();renderTimers();return}
 let na=e.target.closest("[data-step-na]");if(na){e.stopPropagation();let el=na.closest(".crisisStep"),i=+na.dataset.step,title=el.querySelector("b")?.textContent||`Step ${i}`;setStepState(i,getStepState(i)==="na"?"todo":"na",title);return}
 let openTimeline=e.target.closest("[data-open-timeline]");if(openTimeline){document.querySelector(".crisisLogPanel")?.setAttribute("open","");document.querySelector(".crisisLogPanel")?.scrollIntoView({behavior:"smooth",block:"center"});return}
 let step=e.target.closest("#cpanel .crisisStep");if(step&&!e.target.closest("button,input,select,a,textarea")){if(!crisisStartedAt)startCrisis();cycleStep(step)}
});
$("crisisStartBtn").onclick=startCrisis;$("crisisResetBtn").onclick=resetCrisis;$("crisisSearch").oninput=e=>filterCrisis(e.target.value);
$("copyCrisisLog").onclick=async()=>{let roleLine=Object.entries(crisisRoles).map(([r,n])=>`${r}: ${n}`).join(" | ");let text=[`Anesthculator Crisis Timeline`,roleLine?`Roles | ${roleLine}`:"",...crisisLog.map(x=>`${x.elapsed} | ${x.time} | ${x.label} | ${C.find(c=>c[0]===x.crisis)?.[1]||x.crisis}`)].filter(Boolean).join("\n");try{await navigator.clipboard.writeText(text);$("copyCrisisLog").textContent="✓ Copied";setTimeout(()=>$("copyCrisisLog").textContent="Copy timeline",1200)}catch(e){alert(text||"No log")}};
if(restoreCrisisState()){crisis();startCrisis();renderCrisisLog()}else renderCrisisLog();


let dark=localStorage.getItem("anesthDark")=="1";function th(){document.documentElement.dataset.dark=dark?"1":"0";$("theme").textContent=dark?"☀":"☾"}th();$("theme").onclick=()=>{dark=!dark;localStorage.setItem("anesthDark",dark?"1":"0");th()}
$("dilutionDialog").addEventListener("close",()=>render());
$("dTarget").addEventListener("change",()=>render());
$("dFinal").addEventListener("change",()=>render());
$("dDiluent").addEventListener("change",()=>render());

$("addDrugBtn").onclick=()=>openLocalDrugEditor();
$("exportSafetyBtn").onclick=()=>{const keys=[];for(let i=0;i<localStorage.length;i++)keys.push(localStorage.key(i));const storage={};keys.filter(k=>k&&k.startsWith("anesth")).forEach(k=>{const v=localStorage.getItem(k);try{storage[k]=JSON.parse(v)}catch{storage[k]=v}});const payload={format:"AnesthculatorSafetyBackup",version:1,appVersion:"0.70",exportedAt:new Date().toISOString(),storage};const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=`Anesthculator_Safety_Backup_${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(url);mirrorCriticalData()};
$("importSafetyBtn").onclick=()=>$("importSafetyFile").click();
$("importSafetyFile").onchange=async e=>{const f=e.target.files?.[0];if(!f)return;try{const data=JSON.parse(await f.text());if(data.format!=="AnesthculatorSafetyBackup"||!data.storage)throw new Error("Unsupported backup format");Object.entries(data.storage).forEach(([k,v])=>localStorage.setItem(k,typeof v==="string"?v:JSON.stringify(v)));await mirrorCriticalData();appNotify("Safety backup imported. Reloading…");setTimeout(()=>location.reload(),700)}catch(err){appNotify("Import failed: "+err.message)}finally{e.target.value=""}};

$("exportDrugsBtn").onclick=()=>{
 let payload={format:"AnesthculatorLocalDrugs",version:1,exportedAt:new Date().toISOString(),drugs:localDrugs};
 let blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
 let url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download="Anesthculator_Local_Drugs.json";document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
};
$("importDrugsBtn").onclick=()=>$("importDrugsFile").click();
$("importDrugsFile").onchange=async e=>{
 let f=e.target.files?.[0]; if(!f)return;
 try{
   let data=JSON.parse(await f.text()),arr=Array.isArray(data)?data:data.drugs;
   if(!Array.isArray(arr))throw new Error("Invalid drug library file.");
   let imported=0;
   for(let raw of arr){
     if(!raw.name)continue;
     let d=localDrugTemplate(raw);
     if(!d.id.startsWith("local-"))d.id="local-"+crypto.randomUUID();
     let i=localDrugs.findIndex(x=>x.id===d.id);
     if(i>=0)localDrugs[i]=d;else localDrugs.push(d);
     imported++;
   }
   saveLocalDrugs();renderCatFilters();render();renderLibraryCompact();
   alert(`Imported ${imported} local drug(s).`);
 }catch(err){alert("Import failed: "+err.message)}
 e.target.value="";
};



// v0.70 Clinical Approach Layer -------------------------------------------------
const CLINICAL_APPROACHES=[
 {id:"cardiac-arrest",name:"Cardiac arrest",urgency:"critical",terms:["cardiac arrest","arrest","no pulse","pulseless","หัวใจหยุดเต้น","คลำชีพจรไม่ได้","pea","vf","vt"]},
 {id:"hypoxemia",name:"Hypoxemia",urgency:"critical",terms:["hypoxemia","hypoxia","desaturation","spo2 drop","oxygen low","ออกซิเจนต่ำ","เขียว","cyanosis"]},
 {id:"high-airway-pressure",name:"High airway pressure",urgency:"critical",terms:["high airway pressure","peak pressure","stiff bag","difficult ventilation","บีบ bag ยาก","แรงดันทางเดินหายใจสูง","wheeze","bronchospasm","cannot ventilate"]},
 {id:"hypotension",name:"Hypotension",urgency:"critical",terms:["hypotension","low bp","map low","bp drop","shock","collapse","ความดันตก","ความดันต่ำ","map 65","sbp drop","cefazolin","antibiotic","bleeding","spinal","etco2 drop"]},
 {id:"bradycardia",name:"Bradycardia",urgency:"high",terms:["bradycardia","slow heart rate","hr low","ชีพจรช้า","หัวใจเต้นช้า","vagal","high spinal"]},
 {id:"tachy-arrhythmia",name:"Tachycardia / Arrhythmia",urgency:"high",terms:["tachycardia","arrhythmia","af","svt","vt","heart rate fast","หัวใจเต้นเร็ว","หัวใจเต้นผิดจังหวะ"]},
 {id:"hyperthermia",name:"Hyperthermia",urgency:"high",terms:["hyperthermia","temperature high","fever intraoperative","ร้อน","ไข้สูง","jaw rigidity","masseter spasm","co2 rising","mh","malignant hyperthermia"]},
 {id:"seizure-last",name:"Seizure / LAST",urgency:"high",terms:["seizure","convulsion","ชัก","last","local anesthetic toxicity","bupivacaine","wide qrs","tinnitus","metallic taste"]},
 {id:"rash-angioedema",name:"Rash / Angioedema",urgency:"high",terms:["rash","urticaria","angioedema","ผื่น","บวม","หน้า บวม","allergy","anaphylaxis"]},
 {id:"delayed-emergence",name:"Delayed emergence",urgency:"moderate",terms:["delayed emergence","not waking","ตื่นช้า","ไม่ตื่น","prolonged sedation","residual blockade"]},
 {id:"severe-hypertension",name:"Severe Hypertension",urgency:"moderate",terms:["severe hypertension","high bp","hypertensive crisis","ความดันสูง","bp high"]},
 {id:"emergence-agitation",name:"Emergence Agitation",urgency:"moderate",terms:["emergence agitation","agitated","ดิ้น","กระสับกระส่าย","delirium","restless after anesthesia"]}
];
const APPROACH_RELATIONS={
 "cefazolin":["hypotension","rash-angioedema","high-airway-pressure"],"antibiotic":["hypotension","rash-angioedema","high-airway-pressure"],"stiff bag":["high-airway-pressure","hypoxemia","hypotension"],"etco2 drop":["hypotension","hypoxemia","cardiac-arrest"],"bupivacaine":["seizure-last","tachy-arrhythmia","cardiac-arrest"],"spinal":["hypotension","bradycardia","high-airway-pressure"],"cement":["hypotension","hypoxemia","cardiac-arrest"],"laparoscopy":["hypotension","high-airway-pressure","hypoxemia"],"tื่นช้า":["delayed-emergence"],"ผื่น":["rash-angioedema","hypotension","high-airway-pressure"]
};
let selectedApproachId="hypotension",selectedMechanism="";
function normalizeClinicalText(s){return (s||"").toLowerCase().normalize("NFKD").replace(/[^a-z0-9ก-๙₂%/. ]+/g," ").replace(/\s+/g," ").trim()}
function clinicalScore(item,q){if(!q)return 1;let s=0,n=normalizeClinicalText(q);if(normalizeClinicalText(item.name).includes(n))s+=100;for(const t of item.terms){let nt=normalizeClinicalText(t);if(n.includes(nt)||nt.includes(n))s+=35;for(const w of n.split(" "))if(w.length>2&&nt.includes(w))s+=4}for(const [k,ids] of Object.entries(APPROACH_RELATIONS))if(n.includes(normalizeClinicalText(k))&&ids.includes(item.id))s+=50-ids.indexOf(item.id)*7;return s}
function renderApproachEntries(q=""){
 const host=$("approachEntries");if(!host)return;const ranked=CLINICAL_APPROACHES.map((x,i)=>({...x,score:clinicalScore(x,q),order:i})).filter(x=>!q||x.score>0).sort((a,b)=>q?b.score-a.score:a.order-b.order);
 host.innerHTML=ranked.map(x=>`<button class="approachEntry ${x.id===selectedApproachId?"selected":""}" data-approach-id="${x.id}"><span class="entryNum">${x.order+1}</span><b>${x.name}</b><span class="entryUrgency urgency-${x.urgency}">${x.urgency==="critical"?"วิกฤตสูง":x.urgency==="high"?"วิกฤตสูง–ปานกลาง":"ปานกลาง"}</span></button>`).join("")||`<div class="approachNoResult">ไม่พบหัวข้อที่ตรง ลองพิมพ์อาการ เหตุการณ์ ยา หรือ monitor change ด้วยคำอื่น</div>`;
 if(q){let best=ranked[0];$("approachSearchWhy").innerHTML=best?`<span class="approachSearchResult">Best match: ${best.name}</span> · จัดอันดับจากคำ ความหมาย และความสัมพันธ์ทางคลินิก`:`ยังไม่พบความสัมพันธ์ที่ตรง`;}else $("approachSearchWhy").textContent="เลือกอาการด้านล่าง หรือพิมพ์สิ่งที่เกิดขึ้นกับผู้ป่วย";
}
function checkList(items){return `<div class="approachChecklist">${items.map(x=>`<label class="approachCheck"><input type="checkbox"><span>${x}</span></label>`).join("")}</div>`}
const mechanismData={
 vasodilation:{title:"Vasodilation / low SVR",checks:["ทบทวน depth และยาที่เพิ่งให้","พิจารณา neuraxial sympathetic block","มองหา anaphylaxis แม้ไม่มีผื่น","ทบทวน sepsis, reperfusion หรือ vasoplegia"],links:["Anaphylaxis"]},
 preload:{title:"Low preload / bleeding",checks:["ถามศัลยแพทย์และตรวจ surgical field","ทบทวน suction, swab และ concealed loss","ประเมิน position, pneumoperitoneum และ vena cava compression","พิจารณา fluid responsiveness และ blood products ตามบริบท"],links:["Hemorrhage / Massive transfusion"]},
 pump:{title:"Pump failure",checks:["ตรวจ ECG และ rhythm","มองหา ischemia หรือ new ventricular dysfunction","ใช้ FOCUS/echo เมื่อพร้อมและไม่ทำให้การกู้ชีพล่าช้า","พิจารณา inotropy ตาม physiology"],links:["Cardiac arrest"]},
 obstruction:{title:"Obstructive physiology",checks:["ดู ETCO₂ trend, SpO₂ และ airway pressure","พิจารณา tension pneumothorax, PE, air/CO₂ embolism, tamponade","ตรวจบริบท laparoscopy, line manipulation และ sitting position","ใช้ FOCUS/echo และแก้ reversible cause อย่างเร่งด่วน"],links:["Cardiac arrest","Hypoxemia"]},
 rhythm:{title:"Rate / rhythm",checks:["ยืนยัน rhythm และ pulse","ค้นหา vagal stimulus, high spinal, hypoxemia หรือยา","แยก bradycardia กับ unstable tachyarrhythmia","เชื่อมไป clinical approach เฉพาะ rhythm"],links:["Bradycardia","Tachycardia / Arrhythmia"]},
 unclear:{title:"Unclear / mixed physiology",checks:["ทำ simultaneous stabilization และ focused re-check","ตรวจ IV delivery, drug preparation และ measurement error","ทบทวนเหตุการณ์ 5–10 นาทีที่ผ่านมา","พิจารณาหลายกลไกร่วมกันและขอ senior help"],links:[]}
};
function renderHypotension(){
 const panel=$("approachPanel");panel.innerHTML=`
 <div class="approachTitle"><div><h3>Hypotension</h3><p>เริ่มจากค่าที่พบจริง แยกความรุนแรง ประคองพร้อมค้นหากลไก และเชื่อมไป Crisis เมื่อสงสัย</p></div><span class="approachStatus">FULL PATHWAY v0.70</span></div>
 <section class="approachSection"><header><span>1</span><b>Verify & assess severity</b></header><div class="approachSectionBody">${checkList(["วัด NIBP ซ้ำทันที หรือประเมิน waveform/zero/level ของ arterial line","คลำชีพจรและดู trend ไม่ใช้ค่าครั้งเดียวตัดสิน","ประเมิน perfusion, ECG, SpO₂, ETCO₂ และระดับความรู้สึกตัวตามบริบท","พิจารณาทั้งระดับ ระยะเวลา baseline และโรคร่วม ไม่ใช้ MAP ตัวเลขเดียวกับทุกคน"])}</div></section>
 <section class="approachSection"><header><span>2</span><b>Parallel action: stabilize + identify cause</b></header><div class="approachSectionBody"><div class="approachParallel"><div><h4>STABILIZE NOW</h4>${checkList(["แจ้งทีมและศัลยแพทย์เมื่อมีความไม่มั่นคง","หยุด stimulus/traction/insufflation ที่เกี่ยวข้องเมื่อเหมาะสม","ประเมิน airway, oxygenation และ ventilation","เลือก temporary vasoactive support ตาม physiology และ local protocol"])}</div><div><h4>FIND THE CAUSE NOW</h4>${checkList(["HR และ rhythm","ETCO₂ trend และ peak airway pressure","surgical field / blood loss","ยา เลือด หรือเหตุการณ์ใน 5–10 นาทีที่ผ่านมา","position, PEEP, pneumoperitoneum, tourniquet/unclamp"])}</div></div></div></section>
 <section class="approachSection"><header><span>3</span><b>Choose the predominant physiology</b></header><div class="approachSectionBody"><div class="approachDecisionGrid">${Object.entries(mechanismData).map(([k,v])=>`<button class="approachDecision ${selectedMechanism===k?"selected":""}" data-mechanism="${k}"><b>${v.title}</b><small>แตะเพื่อเปิด targeted checks</small></button>`).join("")}</div><div id="mechanismBranch"></div></div></section>
 <section class="approachSection"><header><span>4</span><b>Pitfalls</b></header><div class="approachSectionBody"><div class="approachPitfall"><b>ผิวหนังปกติไม่ตัด perioperative anaphylaxis</b><br>ผื่นอาจถูกผ้าคลุมบัง หรือปรากฏหลังแก้ hypotension แล้ว</div><div class="approachPitfall"><b>ไม่ตอบสนองต่อ pressor ไม่ได้แปลว่าต้องเพิ่มยาอย่างเดียว</b><br>ตรวจ IV delivery, measurement และทบทวน hemorrhage, obstruction, pump failure, anaphylaxis, high spinal หรือ LAST</div><div class="approachPitfall"><b>HR อย่างเดียวไม่เพียงพอสำหรับเลือก vasopressor</b><br>ต้องพิจารณา preload, SVR, contractility และ rhythm ร่วมกัน</div></div></section>
 <section class="approachSection"><header><span>5</span><b>Reassessment decision</b></header><div class="approachSectionBody"><p>ประเมิน BP/MAP trend, pulse/rhythm, ETCO₂, SpO₂, airway pressure, blood loss และ perfusion หลัง intervention</p><div class="approachReassess"><button data-reassess="improved">✓ Meaningful improvement</button><button data-reassess="partial">◐ Partial response</button><button data-reassess="none">! No response</button></div><div id="reassessResult"></div></div></section>
 <section class="approachSection"><header><span>↗</span><b>Related Crisis Protocols</b></header><div class="approachSectionBody"><p>เปิดเมื่อภาพทางคลินิกเข้าได้หรือสงสัยสูง โดย Clinical Approach ยังคงเป็นเมนูแยกจาก Crisis</p><div class="approachLinks"><button class="approachLink" data-open-crisis="Anaphylaxis">Open Anaphylaxis</button><button class="approachLink" data-open-crisis="LAST">Open LAST</button><button class="approachLink" data-open-crisis="Perioperative Cardiac Arrest">Open Cardiac Arrest</button></div></div></section>`;
 renderMechanismBranch();
}
function renderMechanismBranch(){let host=$("mechanismBranch");if(!host||!selectedMechanism)return;let d=mechanismData[selectedMechanism];host.innerHTML=`<div class="approachBranch"><h4>${d.title}</h4><ul>${d.checks.map(x=>`<li>${x}</li>`).join("")}</ul>${d.links.length?`<div class="approachLinks">${d.links.map(x=>`<button class="approachLink" data-open-related="${x}">Related: ${x}</button>`).join("")}</div>`:""}</div>`}
function renderApproachPanel(){if(selectedApproachId==="hypotension")return renderHypotension();let item=CLINICAL_APPROACHES.find(x=>x.id===selectedApproachId);$("approachPanel").innerHTML=`<div class="approachTitle"><div><h3>${item?.name||"Clinical Approach"}</h3><p>Clinical pathway scaffold</p></div><span class="approachStatus">STRUCTURE READY</span></div><div class="approachPlaceholder"><div><b>${item?.name}</b><span>โครงสร้าง Entry → Immediate assessment → Differential → Investigations → Pitfalls → Decision → Reassessment → Crisis link พร้อมแล้ว<br>เนื้อหาฉบับเต็มจะเติมและตรวจหลักฐานทีละ pathway โดยเริ่มจาก Hypotension</span></div></div>`}
function initClinicalApproach(){renderApproachEntries();renderApproachPanel();$("approachSearch").addEventListener("input",e=>{renderApproachEntries(normalizeClinicalText(e.target.value));let ranked=CLINICAL_APPROACHES.map(x=>({...x,score:clinicalScore(x,e.target.value)})).sort((a,b)=>b.score-a.score);if(e.target.value.trim()&&ranked[0]?.score>0){selectedApproachId=ranked[0].id;renderApproachPanel();renderApproachEntries(e.target.value)}});$("approachClear").onclick=()=>{$("approachSearch").value="";renderApproachEntries();};}
document.addEventListener("click",e=>{
 let entry=e.target.closest("[data-approach-id]");if(entry){selectedApproachId=entry.dataset.approachId;selectedMechanism="";renderApproachEntries($("approachSearch")?.value||"");renderApproachPanel();document.getElementById("approachPanel")?.scrollIntoView({behavior:"smooth",block:"start"});return}
 let mech=e.target.closest("[data-mechanism]");if(mech){selectedMechanism=mech.dataset.mechanism;document.querySelectorAll("[data-mechanism]").forEach(x=>x.classList.toggle("selected",x===mech));renderMechanismBranch();document.getElementById("mechanismBranch")?.scrollIntoView({behavior:"smooth",block:"center"});return}
 let reassess=e.target.closest("[data-reassess]");if(reassess){let map={improved:"ตอบสนองดี → ดำเนิน targeted management ต่อ ติดตาม trend และค้นหาสาเหตุให้ครบ",partial:"ตอบสนองบางส่วน → พิจารณา mixed physiology ทบทวน intervention และ reassess ซ้ำ",none:"ไม่ตอบสนอง → ตรวจ delivery/measurement และทบทวน diagnosis; มองหา hemorrhage, obstruction, pump failure หรือ crisis ที่พลาด"};$("reassessResult").innerHTML=`<div class="approachBranch"><b>${map[reassess.dataset.reassess]}</b></div>`;return}
 let crisis=e.target.closest("[data-open-crisis]");if(crisis){showAppTab("crisis",true);let q=crisis.dataset.openCrisis;$("crisisSearch").value=q;filterCrisis(q);return}
 let related=e.target.closest("[data-open-related]");if(related){let label=related.dataset.openRelated;if(label==="Bradycardia")selectedApproachId="bradycardia";else if(label.startsWith("Tachy"))selectedApproachId="tachy-arrhythmia";else if(label==="Hypoxemia")selectedApproachId="hypoxemia";else if(label==="Cardiac arrest")selectedApproachId="cardiac-arrest";renderApproachEntries();renderApproachPanel();document.getElementById("approachPanel")?.scrollIntoView({behavior:"smooth",block:"start"});return}
});
initClinicalApproach();

if("serviceWorker"in navigator)navigator.serviceWorker.register("./sw.js");renderCatFilters();renderLibraryCompact();sync();
