/* Anesthculator v0.39 Cloud — evidence/verification data only; no patient fields are sent. */
(()=>{
const SUPABASE_URL='https://uktfoqvmkxfpczbbmepy.supabase.co';
const SUPABASE_KEY='sb_publishable_A2NLYpy1dt1D30lwa_S3bg_656DfnPH';
const SESSION_KEY='anesthCloudSessionV033';
const $c=id=>document.getElementById(id); let session=JSON.parse(localStorage.getItem(SESSION_KEY)||'null'); let selectedDoseId=null,selectedDrugName='';
const token=()=>session?.access_token||null;

let cloudDrugRows=[], cloudDoseRows=[], cloudReferences=[], cloudEvidenceFiles=[], cloudReconciliations=[], cloudProfiles=[];
let matcherLoadStatus={cloudQuery:'not attempted',cloudError:null,cloudCount:0,appCount:0,combinedCount:0};
let appEvidenceDoseRows=[];

function headers(extra={}){return {'apikey':SUPABASE_KEY,'Authorization':`Bearer ${token()||SUPABASE_KEY}`,'Content-Type':'application/json',...extra}}
async function api(path,opt={}){let r=await fetch(SUPABASE_URL+path,{...opt,headers:headers(opt.headers||{})});let text=await r.text(),data;try{data=text?JSON.parse(text):null}catch{data=text}if(!r.ok)throw new Error(data?.message||data?.msg||data?.error_description||data?.error||`${r.status} ${r.statusText}`);return data}
function esc(x){return String(x??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function setMsg(m){if($c('cloudSyncText'))$c('cloudSyncText').textContent=m}
function authUI(){let on=!!token();$c('cloudStatus').textContent=on?'Connected':'Signed out';$c('cloudUserText').textContent=on?`${session.user?.email||'Signed in'} • role loaded on refresh`:'Sign in to use the shared Drug Library.';$c('cloudSignOut').hidden=!on;$c('cloudSignIn').hidden=on;$c('cloudSignUp').hidden=on}
async function signIn(){try{let email=$c('cloudEmail').value.trim(),password=$c('cloudPassword').value;session=await api('/auth/v1/token?grant_type=password',{method:'POST',body:JSON.stringify({email,password})});localStorage.setItem(SESSION_KEY,JSON.stringify(session));authUI();await refresh()}catch(e){alert('Sign in failed: '+e.message)}}
async function signUp(){try{let email=$c('cloudEmail').value.trim(),password=$c('cloudPassword').value;let x=await api('/auth/v1/signup',{method:'POST',body:JSON.stringify({email,password})});if(x?.access_token){session=x;localStorage.setItem(SESSION_KEY,JSON.stringify(x));authUI();await refresh()}else alert('Account created. Check your email if confirmation is enabled, then sign in.')}catch(e){alert('Create account failed: '+e.message)}}
function signOut(){session=null;localStorage.removeItem(SESSION_KEY);window.setCloudLibrary?.([]);authUI();setMsg('Signed out. Built-in and local libraries remain available.')}
function mapCloud(drugs,doses){let by={};for(let x of doses||[])(by[x.drug_id]??=[]).push(x);return (drugs||[]).map(d=>{let rs=by[d.id]||[],r=rs[0]||{};return {id:'cloud-'+d.id,cloudId:d.id,active:d.active!==false,cloudActive:d.active!==false,name:d.generic_name,displayName:d.display_name,category:d.primary_category||'Other',categories:[d.primary_category||'Other'],drugClass:d.drug_class||'',phase:r.phase||'Other',phases:[...new Set(rs.map(x=>x.phase).filter(Boolean))],context:r.indication||'',min:r.dose_min,max:r.dose_max,def:r.dose_default,unit:r.dose_unit,stock:r.stock_concentration,stockUnit:r.stock_unit,ref:'Cloud Library • '+(r.status||'dose_locked'),doseLocked:r.status==='dose_locked',checked:['source_verified','local_verified'].includes(r.status),verification:(r.status||'').toUpperCase(),cloudDoseId:r.id,dosingRecords:rs.map(x=>({cloudDoseId:x.id,phase:x.phase||'Other',context:x.indication||'',min:x.dose_min,max:x.dose_max,def:x.dose_default,unit:x.dose_unit,stock:x.stock_concentration,stockUnit:x.stock_unit,ref:'Cloud • '+x.status,route:x.route,population:x.population,dosingWeight:x.dosing_weight||'TBW',dosingWeightFormula:x.dosing_weight_formula||null}))}})}
function renderRefs(refs){$c('cloudReferencesList').innerHTML=refs.length?refs.map(r=>`<div class="cloudRow"><b>${esc(r.title)}</b><span>${esc(r.organization||'')} ${esc(r.edition||'')}</span><small>${esc(r.publication_date||'')} ${esc(r.page_reference?'• p. '+r.page_reference:'')}</small></div>`).join(''):'No references yet.'}
function renderFiles(files,refs){let names=Object.fromEntries(refs.map(r=>[r.id,r.title]));$c('cloudFilesList').innerHTML=files.length?files.map(f=>`<div class="cloudRow"><b>${esc(f.original_filename||'Evidence file')}</b><span>${esc(names[f.reference_id]||'Reference')}</span><small>${esc(f.mime_type||'')} ${f.file_size_bytes?`• ${Math.round(f.file_size_bytes/1024)} KB`:''}</small><div class="evidenceFileActions"><button type="button" onclick="cloudOpenEvidenceById('${f.id}')">Open evidence</button><button type="button" class="dangerBtn" onclick="cloudDeleteEvidence('${f.id}')">🗑 Delete evidence</button></div></div>`).join(''):'No evidence files yet.'}
function renderVerifications(vs,refs){let names=Object.fromEntries(refs.map(r=>[r.id,r.title]));let arr=selectedDoseId?vs.filter(v=>v.dose_record_id===selectedDoseId):vs;$c('cloudVerificationsList').innerHTML=arr.length?arr.map(v=>`<div class="cloudRow"><b>${esc(v.verification_type)} • ${esc(v.decision)}</b><span>${esc(names[v.reference_id]||'No reference linked')}</span><small>${esc(v.verified_at||v.created_at||'')} ${v.notes?'• '+esc(v.notes):''}</small></div>`).join(''):(selectedDoseId?'No verification history for this dose.':'No verifications yet.')}
function renderUsers(ps){$c('cloudUsersList').innerHTML=ps.length?ps.map(p=>`<div class="cloudRow"><b>${esc(p.display_name||p.id)}</b><span class="roleBadge">${esc(p.role)}</span></div>`).join(''):'No profiles visible. Admin can enable shared profile visibility with the v0.39 SQL policy.'}

function fillReconcileFileSelect(files,refs){
  let sel=$c('reconcileFileSelect'); if(!sel)return;
  let titles=Object.fromEntries((refs||[]).map(r=>[r.id,r.title]));
  let current=sel.value;
  sel.innerHTML='<option value="">Choose evidence file…</option>'+(files||[]).map(f=>
    `<option value="${esc(f.id)}">${esc(f.original_filename||'Evidence file')} — ${esc(titles[f.reference_id]||'Reference')}</option>`
  ).join('');
  if([...sel.options].some(o=>o.value===current))sel.value=current;
}

function statusBadge(s){
  let v=(s||'uploaded').toUpperCase().replaceAll('_',' ');
  return `<span class="reconcileStatus ${esc((s||'uploaded').toLowerCase())}">${esc(v)}</span>`;
}
function proposedSummary(r){
  let p=r.proposed_changes||{},a=[];
  if(Array.isArray(p.variants)){
    let labels=p.variants.map(v=>{
      let dose=(v.dose_min!=null||v.dose_max!=null)
        ? `${v.dose_min??'—'}–${v.dose_max??'—'} ${v.dose_unit||''}`.trim()
        : (v.dose_default!=null?`${v.dose_default} ${v.dose_unit||''}`.trim():'');
      return [v.phase||'',dose,v.dosing_weight||''].filter(Boolean).join(' • ');
    });
    return labels.join(' | ')||`${p.variants.length} evidence variants`;
  }
  if(p.dose_min!=null||p.dose_max!=null){
    let range=(p.dose_min!=null&&p.dose_max!=null)?`${p.dose_min}–${p.dose_max}`:(p.dose_default??p.dose_min??p.dose_max);
    a.push(`Dose ${range}${p.dose_unit?' '+p.dose_unit:''}`);
  }else if(p.dose_default!=null)a.push(`Dose ${p.dose_default}${p.dose_unit?' '+p.dose_unit:''}`);
  if(p.dosing_weight)a.push(`Weight basis ${p.dosing_weight}`);
  if(p.stock_concentration!=null)a.push(`Stock ${p.stock_concentration}${p.stock_unit?' '+p.stock_unit:''}`);
  return a.join(' • ')||'No structured change extracted';
}
function currentLocalSummary(p){
  let x=p?.current_local_record;if(!x)return '';
  let a=[x.phase||x.indication||''];
  if(x.dose_min!=null||x.dose_max!=null)a.push(`${x.dose_min??'—'}–${x.dose_max??'—'} ${x.dose_unit||''}`.trim());
  else if(x.dose_default!=null)a.push(`${x.dose_default} ${x.dose_unit||''}`.trim());
  if(x.dosing_weight)a.push(x.dosing_weight);
  return a.filter(Boolean).join(' • ');
}


let selectedEvidenceIds=new Set();

function normUnit(u){
  return String(u||'').toLowerCase().replace(/\s+/g,'').replace('μ','mc').replace('µ','mc');
}
function numericClose(a,b){
  if(a==null||b==null)return true;
  let x=Number(a),y=Number(b);
  if(!Number.isFinite(x)||!Number.isFinite(y))return false;
  return Math.abs(x-y)<=Math.max(0.001,Math.abs(y)*0.02);
}
function candidateConflictInfo(r){
  let p=r.proposed_changes||{},vars=Array.isArray(p.variants)?p.variants:[p],reasons=[];
  let units=[...new Set(vars.map(v=>normUnit(v.dose_unit)).filter(Boolean))];
  let weights=[...new Set(vars.map(v=>String(v.dosing_weight||'').toUpperCase()).filter(Boolean))];
  let phases=[...new Set(vars.map(v=>canonicalEvidencePhase(v.phase||p.evidence_context)).filter(x=>x!=='unspecified'))];

  if(units.length>1)reasons.push(`Different dose units: ${units.join(', ')}`);
  if(weights.length>1)reasons.push(`Different weight bases: ${weights.join(', ')}`);
  if(phases.length>1)reasons.push(`Different phases: ${phases.join(', ')}`);

  let ranges=[...new Set(vars.map(v=>`${v.dose_min??''}|${v.dose_default??''}|${v.dose_max??''}|${normUnit(v.dose_unit)}`))];
  if(ranges.length>1)reasons.push('Multiple dose ranges found in the same drug/phase');

  return {conflict:reasons.length>0,reasons};
}
function reviewEligibility(r){
  let p=r.proposed_changes||{},conf=candidateConflictInfo(r);
  let confidence=Number(p.confidence_score||0);
  let structured=Object.keys(compatibleChange({},p)).length>0;
  let cloudReady=(cloudDrugRows||[]).length>0&&(cloudDoseRows||[]).length>0;
  let eligible=cloudReady&&!!r.dose_record_id&&!conf.conflict&&structured&&confidence>=80&&
    (r.status==='review_required'||r.status==='extracted');

  return {
    eligible,confidence,conflict:conf.conflict,reasons:conf.reasons,structured,cloudReady,
    blockedReason:!cloudReady?'Cloud drug/dose mapping is not available.':
      !r.dose_record_id?'A specific Cloud dose record is not mapped.':
      conf.conflict?'Resolve conflict first.':
      confidence<80?'Confidence is below 80%.':
      !structured?'No structured medication field is available.':''
  };
}
function evidenceQueueChanged(id,checked){
  if(checked)selectedEvidenceIds.add(id);else selectedEvidenceIds.delete(id);
  updateEvidenceQueueSummary();
}
function updateEvidenceQueueSummary(){
  let rows=(cloudReconciliations||[]).filter(r=>selectedEvidenceIds.has(r.id));
  let btn=$c('bulkApproveEvidenceBtn'),sum=$c('evidenceQueueSummary');
  if(sum)sum.textContent=rows.length?`${rows.length} eligible item(s) selected.`:'No items selected.';
  if(btn)btn.disabled=!rows.length;
}
window.cloudSelectEligibleEvidence=on=>{
  selectedEvidenceIds.clear();
  if(on)for(let r of cloudReconciliations||[])if(reviewEligibility(r).eligible)selectedEvidenceIds.add(r.id);
  document.querySelectorAll('.evidenceSelect').forEach(x=>x.checked=selectedEvidenceIds.has(x.value));
  updateEvidenceQueueSummary();
};
function clinicalChangeSummary(dose,changes){
  return Object.entries(changes).map(([k,v])=>`${k}: ${dose?.[k]??'—'} → ${v}`).join('\n');
}
async function applyReconciliationRecord(r,{skipConfirm=false}={}){
  if(!r?.dose_record_id)throw new Error('A specific Cloud dose record is required.');
  let eligibility=reviewEligibility(r);
  if(!eligibility.eligible)throw new Error(
    eligibility.conflict?`Evidence conflict: ${eligibility.reasons.join('; ')}`:
    'This item is not eligible for direct approval.'
  );
  let dose=(cloudDoseRows||[]).find(x=>x.id===r.dose_record_id);
  if(!dose)throw new Error('Dose record not found.');
  let changes=compatibleChange(dose,r.proposed_changes||{});
  if(!Object.keys(changes).length)throw new Error('No structured medication field is available to apply.');
  if(!skipConfirm&&!confirm(`Approve evidence update?\n\n${clinicalChangeSummary(dose,changes)}\n\nThis updates the Cloud dose record and writes verification history.`))return false;

  await api(`/rest/v1/dose_records?id=eq.${encodeURIComponent(r.dose_record_id)}`,{
    method:'PATCH',headers:{'Prefer':'return=representation'},
    body:JSON.stringify({...changes,updated_at:new Date().toISOString()})
  });
  await api('/rest/v1/verifications',{
    method:'POST',body:JSON.stringify({
      dose_record_id:r.dose_record_id,reference_id:r.reference_id,
      verification_type:'source_verified',decision:'verified',
      verified_dose_min:changes.dose_min??dose.dose_min,
      verified_dose_default:changes.dose_default??dose.dose_default,
      verified_dose_max:changes.dose_max??dose.dose_max,
      verified_dose_unit:changes.dose_unit??dose.dose_unit,
      verified_stock_concentration:changes.stock_concentration??dose.stock_concentration,
      verified_stock_unit:changes.stock_unit??dose.stock_unit,
      notes:`Clinician approved evidence reconciliation ${r.id}`,
      verified_by:session.user.id,verified_at:new Date().toISOString()
    })
  });
  await api(`/rest/v1/evidence_reconciliations?id=eq.${encodeURIComponent(r.id)}`,{
    method:'PATCH',
    body:JSON.stringify({
      status:'approved',reviewed_by:session.user.id,
      reviewed_at:new Date().toISOString(),applied_changes:changes,
      review_notes:'Approved through v0.55 clinician review workflow.'
    })
  });
  return true;
}
window.cloudBulkApproveEvidence=async()=>{
  if(!token())return alert('Sign in first.');
  let rows=(cloudReconciliations||[]).filter(r=>selectedEvidenceIds.has(r.id)&&reviewEligibility(r).eligible);
  if(!rows.length)return alert('No eligible evidence items are selected.');
  let preview=rows.slice(0,12).map(r=>{
    let p=r.proposed_changes||{};
    return `• ${r.matched_drug_name||'Drug'} — ${p.evidence_context||p.phase||'phase'} — ${proposedSummary(r)}`;
  }).join('\n');
  if(!confirm(`Approve ${rows.length} evidence update(s)?\n\n${preview}${rows.length>12?`\n• …and ${rows.length-12} more`:''}\n\nEvery item has a mapped Cloud dose record, confidence ≥80%, and no detected conflict.`))return;
  let ok=0,errors=[];
  for(let r of rows){
    try{if(await applyReconciliationRecord(r,{skipConfirm:true}))ok++}
    catch(e){errors.push(`${r.matched_drug_name||r.id}: ${e.message}`)}
  }
  selectedEvidenceIds.clear();
  await refresh();
  alert(`Bulk review complete: ${ok} approved${errors.length?`, ${errors.length} failed.\n\n${errors.slice(0,6).join('\n')}`:'.'}`);
};

function renderReconciliations(rows,refs,files){
  let el=$c('cloudReconciliationList');if(!el)return;
  let refName=Object.fromEntries((refs||[]).map(x=>[x.id,x.title]));
  let fileName=Object.fromEntries((files||[]).map(x=>[x.id,x.original_filename]));
  el.innerHTML=rows.length?rows.map(r=>{
    let p=r.proposed_changes||{},dose=(cloudDoseRows||[]).find(d=>d.id===r.dose_record_id);
    let drug=(cloudDrugRows||[]).find(d=>d.id===(dose?.drug_id||r.drug_id));
    let phase=p.evidence_context||p.phase||'Unspecified phase';
    let eligibility=reviewEligibility(r),confidence=eligibility.confidence;
    let cloudCurrent=dose?[
      dose.phase||dose.indication||'',
      dose.dose_min!=null||dose.dose_max!=null?`${dose.dose_min??'—'}–${dose.dose_max??'—'} ${dose.dose_unit||''}`:'',
      dose.dosing_weight||'TBW'
    ].filter(Boolean).join(' • '):'';
    let localCurrent=currentLocalSummary(p);
    let current=cloudCurrent||localCurrent||'No matching current dose record';
    let mapping=dose?'Cloud dose record matched':(localCurrent?'Built-in/local record matched; Cloud mapping required':'Manual mapping required');
    let conflictText=eligibility.conflict?eligibility.reasons.join(' • '):'';
    return `<div class="cloudRow reconcileRow clinicalEvidenceCard ${eligibility.conflict?'hasConflict':''}">
      <div class="reconcileRowTitle">
        <div class="evidenceTitleGroup">
          <label class="evidenceSelectWrap" title="${eligibility.eligible?'Select for clinician approval':'Not eligible for direct approval'}">
            <input class="evidenceSelect" type="checkbox" value="${r.id}" ${selectedEvidenceIds.has(r.id)?'checked':''}
              ${eligibility.eligible?'':'disabled'} onchange="evidenceQueueChanged('${r.id}',this.checked)">
          </label>
          <b>${esc(drug?.generic_name||r.matched_drug_name||'Unmatched evidence')}</b>
          <span class="phaseChip">${esc(phase)}</span>
        </div>
        ${statusBadge(eligibility.conflict&&r.status!=='approved'?'conflict':r.status)}
      </div>
      <span>${esc(refName[r.reference_id]||'Reference')} • ${esc(fileName[r.reference_file_id]||'Evidence file')}</span>
      <div class="confidenceRow">
        <span>Confidence</span><strong>${confidence||'—'}${confidence?'%':''}</strong>
        <span class="mappingState">${esc(mapping)}</span>
        ${eligibility.conflict?`<span class="conflictState">⚠ Conflict detected</span>`:''}
      </div>
      ${eligibility.conflict?`<div class="conflictBox"><b>Manual conflict review required</b><span>${esc(conflictText)}</span></div>`:''}
      <div class="evidenceCompareGrid">
        <div><small>Current record</small><strong>${esc(current)}</strong></div>
        <div><small>Evidence proposal</small><strong>${esc(proposedSummary(r))}</strong></div>
      </div>
      ${r.evidence_excerpt?`<details class="evidenceExcerpt"><summary>View evidence excerpt</summary><blockquote>${esc(r.evidence_excerpt)}</blockquote></details>`:''}
      ${r.page_reference?`<small>Page ${esc(r.page_reference)}</small>`:''}
      <div class="reconcileActions">
        ${r.reference_file_id?`<button type="button" onclick="cloudOpenEvidenceById('${r.reference_file_id}')">📎 Evidence</button>`:''}
        ${eligibility.eligible?
          `<button class="approveBtn" type="button" onclick="cloudApproveReconciliation('${r.id}')">✓ Review & approve</button>
           <button class="rejectBtn" type="button" onclick="cloudRejectReconciliation('${r.id}')">✕ Reject</button>`:
          `<button type="button" disabled>${esc(eligibility.blockedReason||'Cloud mapping required')}</button>
           ${(r.status==='review_required'||r.status==='extracted')?`<button class="rejectBtn" type="button" onclick="cloudRejectReconciliation('${r.id}')">✕ Reject</button>`:''}`}
      </div>
    </div>`;
  }).join(''):'No reconciliation items yet.';
  updateEvidenceQueueSummary();
}

async function extractPdfText(file){
  if(!window.pdfjsLib)throw new Error('PDF parser has not loaded. Check internet/CDN access and try again.');
  let data=await file.arrayBuffer();
  let doc=await window.pdfjsLib.getDocument({data}).promise;
  let pages=[],max=Math.min(doc.numPages,80);
  for(let i=1;i<=max;i++){
    let page=await doc.getPage(i),content=await page.getTextContent();
    let raw=(content.items||[]).filter(x=>String(x.str||'').trim());
    // Reconstruct rows from PDF coordinates. This is substantially more reliable
    // for tables than joining every text fragment with a single space.
    let rows=[];
    for(let item of raw){
      let x=Number(item.transform?.[4]||0), y=Number(item.transform?.[5]||0), s=String(item.str||'').trim();
      let row=rows.find(r=>Math.abs(r.y-y)<=3.5);
      if(!row){row={y,items:[]};rows.push(row)}
      row.items.push({x,s});
    }
    rows.sort((a,b)=>b.y-a.y);
    let lineRows=rows.map(r=>{
      let items=r.items.sort((a,b)=>a.x-b.x);
      let text=items.map(x=>x.s).join('  ').replace(/\s+/g,' ').trim();
      return {y:r.y,items,text};
    }).filter(r=>r.text);
    let text=normalizeEvidenceText(lineRows.map(r=>r.text).join('\n'));
    pages.push({page:i,text,lines:text.split(/\n+/).filter(Boolean),lineRows});
  }
  return pages;
}
async function extractXlsxText(file){
  if(!window.XLSX)throw new Error('Excel parser has not loaded.');
  let data=await file.arrayBuffer(),wb=window.XLSX.read(data,{type:'array'});
  let pages=[];
  wb.SheetNames.forEach((n,i)=>{
    let rows=window.XLSX.utils.sheet_to_json(wb.Sheets[n],{header:1,raw:false});
    let text=normalizeEvidenceText(rows.map(r=>r.join(' | ')).join('\n'));
    pages.push({page:n,text,lines:text.split(/\n+/).filter(Boolean)});
  });
  return pages;
}
async function fetchEvidenceFile(fileRow){
  const rawPath=String(fileRow.storage_path||'').replace(/^\/+/, '');
  if(!rawPath)throw new Error('Evidence storage_path is empty.');
  const path=rawPath.split('/').map(encodeURIComponent).join('/');
  const authHeaders={apikey:SUPABASE_KEY,Authorization:`Bearer ${token()}`,Accept:'application/octet-stream'};
  let directStatus=null,directType='',directLen='';

  // First try the documented private-bucket authenticated endpoint.
  let r=await fetch(`${SUPABASE_URL}/storage/v1/object/authenticated/reference-files/${path}?download=1`,{
    method:'GET',headers:authHeaders,cache:'no-store'
  });
  directStatus=r.status; directType=r.headers.get('content-type')||''; directLen=r.headers.get('content-length')||'';
  if(r.ok){
    let blob=await r.blob();
    if(blob.size>0)return blob;
  }

  // Some browsers/CDN paths can return an empty body despite a successful response.
  // Fall back to a short-lived signed URL generated with the same authenticated user.
  let sign=await fetch(`${SUPABASE_URL}/storage/v1/object/sign/reference-files/${path}`,{
    method:'POST',
    headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${token()}`,'Content-Type':'application/json'},
    body:JSON.stringify({expiresIn:120})
  });
  if(!sign.ok){
    let msg=await sign.text();
    throw new Error(`Storage download failed. Direct=${directStatus} (${directType||'no content-type'}, length=${directLen||'unknown'}); signed URL failed (${sign.status}): ${msg}`);
  }
  let signed=await sign.json();
  let signedPath=signed.signedURL||signed.signedUrl||signed.signed_url;
  if(!signedPath)throw new Error('Supabase returned no signed URL for this evidence object.');
  let signedUrl=/^https?:\/\//i.test(signedPath)?signedPath:`${SUPABASE_URL}/storage/v1${signedPath}`;
  let sr=await fetch(signedUrl,{method:'GET',cache:'no-store'});
  if(!sr.ok)throw new Error(`Signed evidence download failed (${sr.status}): ${await sr.text()}`);
  let blob=await sr.blob();
  if(!blob.size)throw new Error(`Downloaded file is 0 bytes. Direct endpoint status=${directStatus}; signed URL also returned 0 bytes. The Storage object itself is likely empty or points to the wrong object.`);
  return blob;
}
async function sha256Hex(blob){
  let buf=await blob.arrayBuffer(),hash=await crypto.subtle.digest('SHA-256',buf);
  return [...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
async function inspectEvidenceBlob(fileRow,blob){
  let meta=Number(fileRow.file_size_bytes||0),downloaded=blob.size||0;
  let first=new Uint8Array(await blob.slice(0,5).arrayBuffer());
  let header=String.fromCharCode(...first),isPdf=(fileRow.mime_type==='application/pdf'||/\.pdf$/i.test(fileRow.original_filename||''));
  let pdfValid=!isPdf||header==='%PDF-';
  return {meta,downloaded,isPdf,pdfValid,ready:downloaded>0&&pdfValid,header};
}
function showEvidenceDiagnostic(d){
  let el=$c('reconcileDiagnostic'); if(!el)return;
  let kb=n=>n?`${(n/1024).toFixed(n<10240?1:0)} KB`:'0 B';
  el.innerHTML=`<div><b>Evidence diagnostic</b></div><div>Stored metadata: <b>${kb(d.meta)}</b></div><div>Downloaded file: <b>${kb(d.downloaded)}</b> ${d.downloaded?'✓':'✕'}</div>${d.isPdf?`<div>PDF header: <b>${d.pdfValid?'valid ✓':'invalid ✕'}</b></div>`:''}<div>Ready for extraction: <b>${d.ready?'YES ✓':'NO ✕'}</b></div>`;
  el.hidden=false;
}

function normalizeEvidenceText(t){
  return String(t||'')
    .replace(/[\u00a0\u2007\u202f]/g,' ')
    .replace(/[‐‑‒−]/g,'-')
    .replace(/[–—]/g,'–')
    .replace(/μg/gi,'mcg').replace(/µg/gi,'mcg').replace(/ug\b/gi,'mcg')
    .replace(/\s*\/\s*/g,'/')
    .replace(/[ \t]+/g,' ')
    .replace(/\n[ \t]+/g,'\n')
    .trim();
}
function normalizedSearch(s){
  return normalizeEvidenceText(s).toLowerCase().replace(/[^a-z0-9ก-๙]+/g,' ').replace(/\s+/g,' ').trim();
}
function evidenceDrugTerms(d){
  let a=[d.generic_name,d.display_name].filter(Boolean).map(String);
  let expanded=[];
  for(let x of a){
    let base=x.trim();
    expanded.push(base);
    expanded.push(base.replace(/\s+/g,''));
    expanded.push(base.replace(/-/g,' '));
    // Generic-name fields sometimes contain parenthetical brands or salts.
    expanded.push(base.replace(/\([^)]*\)/g,' ').trim());
    expanded.push(base.replace(/\b(?:hydrochloride|hcl|sodium|sulfate|sulphate|citrate|tartrate|phosphate)\b/ig,' ').replace(/\s+/g,' ').trim());
  }
  return [...new Set(expanded.map(x=>x.trim()).filter(x=>x.length>=3))];
}
function compactEvidenceSearch(s){
  return normalizeEvidenceText(s).toLowerCase().replace(/[^a-z0-9ก-๙]+/g,'');
}
function findDrugMentions(page,d){
  let lines=page.lines||[],terms=evidenceDrugTerms(d),hits=[],matchedTerms=new Set();

  // 1) Normal line-level matching.
  for(let i=0;i<lines.length;i++){
    let nl=normalizedSearch(lines[i]);
    let cl=compactEvidenceSearch(lines[i]);
    for(let term of terms){
      let nt=normalizedSearch(term),ct=compactEvidenceSearch(term);
      if((nt && nl.includes(nt)) || (ct.length>=4 && cl.includes(ct))){
        hits.push({lineIndex:i,term,mode:'line'});
        matchedTerms.add(term);
        break;
      }
    }
  }

  // 2) Whole-page compact matching catches PDFs that split every glyph/token,
  // e.g. "P r o p o f o l" or fragments across table cells.
  if(!hits.length){
    let pageNorm=normalizedSearch(page.text||'');
    let pageCompact=compactEvidenceSearch(page.text||'');
    for(let term of terms){
      let nt=normalizedSearch(term),ct=compactEvidenceSearch(term);
      if((nt && pageNorm.includes(nt)) || (ct.length>=4 && pageCompact.includes(ct))){
        // Find the closest line by compact containment if possible.
        let idx=lines.findIndex(line=>{
          let lc=compactEvidenceSearch(line);
          return ct.length>=4 && lc.includes(ct);
        });
        hits.push({lineIndex:idx>=0?idx:null,term,mode:'page'});
        matchedTerms.add(term);
        break;
      }
    }
  }
  return {hits,matchedTerms:[...matchedTerms]};
}
function contextForDrugHit(page,hit,before=3,after=8){
  let lines=page.lines||[];
  if(Number.isInteger(hit.lineIndex)){
    return lines.slice(Math.max(0,hit.lineIndex-before),Math.min(lines.length,hit.lineIndex+after+1)).join(' | ');
  }

  // Whole-page fallback: find the term in normalized/compact text and return
  // a generous text window. This is only a candidate generator; human review is still required.
  let text=page.text||'',term=hit.term||'';
  let low=normalizeEvidenceText(text).toLowerCase();
  let needle=normalizeEvidenceText(term).toLowerCase();
  let pos=low.indexOf(needle);
  if(pos>=0)return text.slice(Math.max(0,pos-700),Math.min(text.length,pos+1800)).replace(/\n+/g,' | ');

  // Last-resort page context when glyph splitting prevents direct indexing.
  return text.slice(0,2600).replace(/\n+/g,' | ');
}
function contextWindow(page,lineIndex,before=2,after=5){
  let lines=page.lines||[];
  return lines.slice(Math.max(0,lineIndex-before),Math.min(lines.length,lineIndex+after+1)).join(' | ');
}
function detectWeightBases(t){
  let s=normalizeEvidenceText(t),low=s.toLowerCase(),out=[];
  const add=(basis,formula,idx)=>out.push({basis,formula:formula||'source-defined',idx:idx<0?999999:idx});
  let m;
  m=/(lean body weight|\blbw\b)/i.exec(s); if(m)add('LBW',/janmahasatian/i.test(s)?'Janmahasatian':'source-defined',m.index);
  m=/(ideal body weight|\bibw\b)/i.exec(s); if(m)add('IBW',/devine/i.test(s)?'Devine':(/lemmens/i.test(s)?'Lemmens':'source-defined'),m.index);
  m=/(adjusted body weight|adjusted bw|\badjbw\b|\babw\b)/i.exec(s); if(m)add('AdjBW','source-defined',m.index);
  m=/(total body weight|actual body weight|\btbw\b)/i.exec(s); if(m)add('TBW','source-defined',m.index);
  return out.sort((a,b)=>a.idx-b.idx);
}
function weightNearest(text,pos){
  let ws=detectWeightBases(text); if(!ws.length)return null;
  return ws.map(w=>({...w,dist:Math.abs(w.idx-pos)})).sort((a,b)=>a.dist-b.dist)[0];
}
function extractDoseCandidates(t){
  let s=normalizeEvidenceText(t),out=[];
  // Captures 1.5–2.5 mg/kg, 100–200 mcg/kg/min, 0.2 mg/kg, etc.
  let re=/(\d+(?:\.\d+)?)\s*(?:-|–|—|to)?\s*(?:(\d+(?:\.\d+)?)\s*)?(mcg|mg|g)\/kg(?:\/(min|hr|h))?/ig,m;
  while((m=re.exec(s))){
    let unit=m[3].toLowerCase()+'/kg'+(m[4]?'/'+(m[4].toLowerCase()==='h'?'hr':m[4].toLowerCase()):'');
    let a=+m[1],b=m[2]!=null?+m[2]:null;
    // Avoid treating a spaced single number as a fake range.
    let isRange=b!=null && /(?:-|–|—|to)/i.test(m[0]);
    out.push({idx:m.index,end:m.index+m[0].length,dose_min:isRange?a:null,dose_max:isRange?b:null,dose_default:isRange?null:a,dose_unit:unit,raw:m[0]});
  }
  return out;
}
function inferEvidenceContext(text,dosePos){
  let pre=normalizeEvidenceText(text.slice(Math.max(0,dosePos-260),dosePos+60)).toLowerCase();
  if(/maintenance|infusion|การให้ต่อเนื่อง|ยาหยด/.test(pre))return 'Maintenance / Infusion';
  if(/induction|bolus|นำสลบ/.test(pre))return 'Induction / Bolus';
  if(/emergency|resuscitation|crisis|ฉุกเฉิน/.test(pre))return 'Emergency';
  return '';
}
function inferDoseRecord(drugId,excerpt,evidenceContext=''){
  let rs=(cloudDoseRows||[]).filter(x=>x.drug_id===drugId);
  if(rs.length===1)return rs[0];
  let s=(excerpt+' '+evidenceContext).toLowerCase(),scores=rs.map(r=>{
    let score=0;
    for(let token of [r.phase,r.indication,r.route,r.population].filter(Boolean)){
      let words=String(token).toLowerCase().split(/[^a-z0-9]+/).filter(w=>w.length>3);
      for(let w of words)if(s.includes(w))score++;
    }
    if(/induction|bolus/.test(evidenceContext.toLowerCase()) && /induction|bolus/.test(String(r.phase+' '+r.indication).toLowerCase()))score+=3;
    if(/maintenance|infusion/.test(evidenceContext.toLowerCase()) && /maintenance|infusion/.test(String(r.phase+' '+r.indication).toLowerCase()))score+=3;
    return {r,score};
  }).sort((a,b)=>b.score-a.score);
  return scores[0]?.score>0?scores[0].r:null;
}
function isUuidValue(v){return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(v||''))}
function matcherKey(d){return compactEvidenceSearch(d?.generic_name||d?.display_name||'')}
async function prepareMatcherDrugs(){
  let cloudRows=Array.isArray(cloudDrugRows)?cloudDrugRows.filter(d=>d&&d.active!==false):[];
  matcherLoadStatus={cloudQuery:cloudRows.length?'loaded during refresh':'retrying',cloudError:null,cloudCount:cloudRows.length,appCount:0,combinedCount:0};
  if(!cloudRows.length && token()){
    try{
      cloudRows=await api('/rest/v1/drugs?select=id,generic_name,display_name,active&active=eq.true&order=generic_name.asc');
      cloudDrugRows=cloudRows||[];
      matcherLoadStatus.cloudQuery='direct query OK';
      matcherLoadStatus.cloudCount=cloudRows.length;
    }catch(e){
      matcherLoadStatus.cloudQuery='direct query failed';
      matcherLoadStatus.cloudError=e.message||String(e);
    }
  }
  let appRows=[];
  try{appRows=window.getEvidenceMatcherDrugs?.()||[]}catch(e){matcherLoadStatus.appError=e.message||String(e)}
  matcherLoadStatus.appCount=appRows.length;
  const merged=new Map();
  for(const d of appRows){const k=matcherKey(d);if(k)merged.set(k,d)}
  for(const d of cloudRows){const k=matcherKey(d);if(k)merged.set(k,{...d,source:'cloud'})}
  const rows=[...merged.values()];
  matcherLoadStatus.combinedCount=rows.length;
  return rows;
}


function canonicalEvidencePhase(ctx){
  let s=normalizedSearch(ctx||'');
  if(/rapid sequence|rsi/.test(s))return 'induction';
  if(/induction|loading|initial bolus|bolus dose|นำสลบ/.test(s))return 'induction';
  if(/maintenance|continuous infusion|infusion rate|ต่อเนื่อง|หยด/.test(s))return 'maintenance';
  if(/emergency|crisis|resuscitation|cardiac arrest|ฉุกเฉิน/.test(s))return 'emergency';
  if(/sedation|procedural|monitored anesthesia/.test(s))return 'sedation';
  if(/reversal|antagonism|neuromuscular reversal/.test(s))return 'reversal';
  return 'unspecified';
}
function doseRowPhase(row){
  return canonicalEvidencePhase(`${row?.phase||''} ${row?.indication||''}`);
}
function evidenceDrugKey(d){
  return compactEvidenceSearch(d?.generic_name||d?.display_name||'');
}
function loadAppEvidenceDoses(){
  try{appEvidenceDoseRows=window.getEvidenceMatcherDoseRecords?.()||[]}
  catch(e){appEvidenceDoseRows=[];matcherLoadStatus.appDoseError=e.message||String(e)}
  return appEvidenceDoseRows;
}
function localDoseCandidatesFor(drug,ctx){
  let key=evidenceDrugKey(drug),phase=canonicalEvidencePhase(ctx);
  let rows=(appEvidenceDoseRows||[]).filter(r=>compactEvidenceSearch(r.generic_name)===key);
  let exact=rows.filter(r=>doseRowPhase(r)===phase);
  return exact.length?exact:rows;
}
function localDoseMatch(drug,excerpt,ctx){
  let rows=localDoseCandidatesFor(drug,ctx);
  if(!rows.length)return null;
  let phase=canonicalEvidencePhase(ctx),s=normalizedSearch(excerpt||'');
  let scored=rows.map(r=>{
    let score=0;
    if(doseRowPhase(r)===phase&&phase!=='unspecified')score+=8;
    for(let t of [r.indication,r.route,r.population].filter(Boolean)){
      for(let w of normalizedSearch(t).split(' ').filter(x=>x.length>3))if(s.includes(w))score++;
    }
    return {r,score};
  }).sort((a,b)=>b.score-a.score);
  return scored[0].r;
}
function currentDoseSnapshot(row){
  if(!row)return null;
  return {
    source:row.source||'unknown',
    phase:row.phase||null,
    indication:row.indication||null,
    dose_min:row.dose_min??null,
    dose_default:row.dose_default??null,
    dose_max:row.dose_max??null,
    dose_unit:row.dose_unit||null,
    dosing_weight:row.dosing_weight||'TBW',
    dosing_weight_formula:row.dosing_weight_formula||null,
    stock_concentration:row.stock_concentration??null,
    stock_unit:row.stock_unit||null,
    app_drug_id:row.app_drug_id||null,
    cloud_drug_id:row.cloud_drug_id||null,
    cloud_dose_id:row.cloud_dose_id||null
  };
}
function evidenceConfidence(f){
  let score=0;
  if(f.drug)score+=25;
  if(canonicalEvidencePhase(f.evidenceContext)!=='unspecified')score+=20;
  if(f.proposed?.dose_unit)score+=20;
  if(f.proposed?.dosing_weight)score+=15;
  if(f.dose)score+=20;
  else if(f.localDose)score+=10;
  return Math.min(100,score);
}
function proposedVariantKey(v){
  return JSON.stringify({
    phase:v.phase||'',
    dose_min:v.dose_min??null,dose_default:v.dose_default??null,dose_max:v.dose_max??null,
    dose_unit:v.dose_unit||null,dosing_weight:v.dosing_weight||null
  });
}

function cloudDrugForMatcherDrug(d){
  if(isUuidValue(d?.id))return d;
  let key=matcherKey(d);
  return (cloudDrugRows||[]).find(x=>matcherKey(x)===key)||null;
}
async function ensureCloudDoseMap(){
  matcherLoadStatus.cloudDrugError=null;
  matcherLoadStatus.cloudDoseError=null;

  try{
    let drugs=await api('/rest/v1/drugs?select=id,generic_name,display_name,active&order=generic_name.asc');
    if(Array.isArray(drugs)){
      cloudDrugRows=drugs;
      matcherLoadStatus.cloudCount=drugs.length;
      matcherLoadStatus.cloudDrugQuery='OK';
    }
  }catch(e){
    matcherLoadStatus.cloudDrugQuery='FAILED';
    matcherLoadStatus.cloudDrugError=e.message||String(e);
  }

  try{
    let doses=await api('/rest/v1/dose_records?select=*&order=created_at.asc');
    if(Array.isArray(doses)){
      cloudDoseRows=doses;
      matcherLoadStatus.cloudDoseCount=doses.length;
      matcherLoadStatus.cloudDoseQuery='OK';
    }
  }catch(e){
    matcherLoadStatus.cloudDoseQuery='FAILED';
    matcherLoadStatus.cloudDoseError=e.message||String(e);
  }

  if((cloudDrugRows||[]).length===0 && (cloudDoseRows||[]).length){
    let ids=[...new Set(cloudDoseRows.map(r=>r.drug_id).filter(Boolean))];
    if(ids.length){
      try{
        let drugs=await api(`/rest/v1/drugs?select=id,generic_name,display_name,active&id=in.(${ids.join(',')})`);
        if(Array.isArray(drugs)){
          cloudDrugRows=drugs;
          matcherLoadStatus.cloudCount=drugs.length;
          matcherLoadStatus.cloudDrugRecovery='dose_record_ids';
        }
      }catch(e){
        matcherLoadStatus.cloudDrugRecoveryError=e.message||String(e);
      }
    }
  }
}
function tableAnchors(page){
  let a={induction:null,maintenance:null};
  for(let row of page.lineRows||[])for(let it of row.items||[]){
    let s=normalizedSearch(it.s);
    if(a.induction==null&&/induction|bolus|นำสลบ/.test(s))a.induction=it.x;
    if(a.maintenance==null&&/maintenance|infusion|ต่อเนื่อง|หยด/.test(s))a.maintenance=it.x;
  }
  return a;
}
function nearbyDrugRows(page,idx,allDrugLines){
  let rows=page.lineRows||[];
  let starts=[...new Set((allDrugLines||[]).filter(Number.isInteger))].sort((a,b)=>a-b);
  let next=starts.find(x=>x>idx);
  let hardEnd=next!=null?next:rows.length;
  let softEnd=hardEnd;

  for(let i=idx+1;i<hardEnd;i++){
    let s=normalizedSearch(rows[i]?.text||'');
    if(/^(?:induction agents|neuromuscular|opioids|analgesics|reversal|local anesthetics|maintenance|sedation|emergency)\b/.test(s)){
      softEnd=i;break;
    }
  }

  return rows.slice(idx,Math.max(idx+1,Math.min(softEnd,idx+3)));
}
function contextBefore(page,idx){
  for(let i=Math.max(0,idx-8);i<=idx;i++){
    let s=normalizedSearch(page.lines?.[i]||'');
    if(/induction|bolus|นำสลบ/.test(s))return 'Induction / Bolus';
    if(/maintenance|infusion|ต่อเนื่อง|หยด/.test(s))return 'Maintenance / Infusion';
    if(/emergency|crisis|resuscitation|ฉุกเฉิน/.test(s))return 'Emergency';
  }
  return '';
}
function candidatesInCell(text,ctx){
  let out=[],doses=extractDoseCandidates(text),weights=detectWeightBases(text);
  if(doses.length)for(let d of doses){
    let w=weightNearest(text,d.idx),p={dose_min:d.dose_min,dose_default:d.dose_default,dose_max:d.dose_max,dose_unit:d.dose_unit};
    if(w){p.dosing_weight=w.basis;p.dosing_weight_formula=w.formula}
    out.push({proposed:p,ctx:ctx||inferEvidenceContext(text,d.idx),raw:d.raw,text});
  }
  else for(let w of weights)out.push({proposed:{dosing_weight:w.basis,dosing_weight_formula:w.formula},ctx:ctx||inferEvidenceContext(text,w.idx),raw:w.basis,text});
  return out;
}
function samePhysicalRowCandidates(page,hit){
  if(!Number.isInteger(hit.lineIndex))return [];
  let row=(page.lineRows||[])[hit.lineIndex];
  if(!row)return [];
  let a=tableAnchors(page),items=row.items||[],out=[];

  if(a.induction!=null&&a.maintenance!=null&&a.maintenance>a.induction){
    let induction=[],maintenance=[];
    for(let it of items){
      if(it.x>=a.maintenance-10)maintenance.push(it.s);
      else if(it.x>=a.induction-10)induction.push(it.s);
    }
    for(let c of candidatesInCell(induction.join(' '),'Induction / Bolus'))out.push(c);
    for(let c of candidatesInCell(maintenance.join(' '),'Maintenance / Infusion'))out.push(c);
  }

  if(!out.length)out=candidatesInCell(row.text||'',contextBefore(page,hit.lineIndex));
  return out;
}
function filterImplausibleCandidates(list){
  return (list||[]).filter(c=>{
    let p=c.proposed||{};
    if(p.dose_min!=null&&Math.abs(Number(p.dose_min))>50000)return false;
    if(p.dose_max!=null&&Math.abs(Number(p.dose_max))>50000)return false;
    return p.dose_min!=null||p.dose_default!=null||p.dose_max!=null||p.dosing_weight;
  });
}
function parseDrugTableRow(page,hit,allDrugLines){
  if(!Number.isInteger(hit.lineIndex))return [];

  let out=filterImplausibleCandidates(samePhysicalRowCandidates(page,hit));
  if(out.length)return out;

  let rows=nearbyDrugRows(page,hit.lineIndex,allDrugLines),a=tableAnchors(page);
  if(!rows.length)return [];

  if(a.induction!=null&&a.maintenance!=null&&a.maintenance>a.induction){
    let induction=[],maintenance=[];
    for(let row of rows){
      for(let it of row.items||[]){
        if(it.x>=a.maintenance-10)maintenance.push(it.s);
        else if(it.x>=a.induction-10)induction.push(it.s);
      }
    }
    out=[];
    for(let c of candidatesInCell(induction.join(' '),'Induction / Bolus'))out.push(c);
    for(let c of candidatesInCell(maintenance.join(' '),'Maintenance / Infusion'))out.push(c);
    out=filterImplausibleCandidates(out);
    if(out.length)return out;
  }

  return filterImplausibleCandidates(
    candidatesInCell(rows.map(r=>r.text).join(' | '),contextBefore(page,hit.lineIndex))
  );
}
function matchSpecificDose(drug,excerpt,ctx){
  let cd=cloudDrugForMatcherDrug(drug);
  if(!cd)return null;

  let rs=(cloudDoseRows||[]).filter(r=>r.drug_id===cd.id);
  if(!rs.length)return null;

  let c=canonicalEvidencePhase(ctx),s=normalizedSearch(excerpt||'');
  let scored=rs.map(r=>{
    let rp=canonicalEvidencePhase(`${r.phase||''} ${r.indication||''}`);
    let score=0;
    if(c!=='unspecified'&&rp===c)score+=10;
    else if(c!=='unspecified'&&rp!=='unspecified'&&rp!==c)score-=10;

    for(let t of [r.indication,r.route,r.population].filter(Boolean)){
      for(let w of normalizedSearch(t).split(' ').filter(x=>x.length>3)){
        if(s.includes(w))score++;
      }
    }
    return {r,score};
  }).sort((a,b)=>b.score-a.score);

  return scored[0]?.score>=4?scored[0].r:null;
}
function shortExcerpt(name,ctx,text,raw){
  let s=normalizeEvidenceText(text),pos=s.toLowerCase().indexOf(String(raw||name||'').toLowerCase());
  if(pos<0)pos=0;
  return s.slice(Math.max(0,pos-80),Math.min(s.length,pos+420));
}
function mergeClinicalFindings(rows){
  let map=new Map();
  for(let f of rows){
    let phase=canonicalEvidencePhase(f.evidenceContext);
    let k=`${matcherKey(f.drug)}|${phase}`;
    if(!map.has(k))map.set(k,{
      ...f,
      evidenceContext:phase==='unspecified'?(f.evidenceContext||'Unspecified'):phase[0].toUpperCase()+phase.slice(1),
      variants:[],pages:new Set(),excerpts:[]
    });
    let g=map.get(k);
    let variant={...f.proposed,phase:g.evidenceContext,page:f.page};
    let sig=proposedVariantKey(variant);
    if(!g.variants.some(v=>proposedVariantKey(v)===sig))g.variants.push(variant);
    if(f.page!=null)g.pages.add(String(f.page));
    if(f.excerpt&&!g.excerpts.includes(f.excerpt))g.excerpts.push(f.excerpt);
    if(!g.dose&&f.dose)g.dose=f.dose;
    if(!g.localDose&&f.localDose)g.localDose=f.localDose;
  }
  return [...map.values()].map(g=>{
    let unique=g.variants;
    g.page=[...g.pages].sort((a,b)=>Number(a)-Number(b)).join(', ');
    g.excerpt=g.excerpts.slice(0,3).join(' … ');
    if(unique.length===1)g.proposed=unique[0];
    else{
      g.proposed={evidence_context:g.evidenceContext,variants:unique};
      g.multiVariant=true;
    }
    g.confidence=evidenceConfidence(g);
    return g;
  }).sort((a,b)=>matcherKey(a.drug).localeCompare(matcherKey(b.drug))||
    canonicalEvidencePhase(a.evidenceContext).localeCompare(canonicalEvidencePhase(b.evidenceContext)));
}

function analyzePages(pages,matcherDrugs){
  let findings=[],foundNames=new Set(),matchedTerms=new Set(),drugs=matcherDrugs||[];
  let charCount=pages.reduce((n,p)=>n+(p.text||'').length,0);
  for(let pg of pages){
    let hits=[];
    for(let d of drugs){
      let m=findDrugMentions(pg,d);
      for(let h of m.hits)hits.push({drug:d,hit:h});
    }
    let drugLines=[...new Set(hits.map(x=>x.hit.lineIndex).filter(Number.isInteger))].sort((a,b)=>a-b);
    for(let x of hits){
      foundNames.add(x.drug.generic_name||x.drug.display_name);
      matchedTerms.add(x.hit.term);
      let cs=parseDrugTableRow(pg,x.hit,drugLines);
      if(!cs.length){
        let t=contextForDrugHit(pg,x.hit,1,3);
        cs=candidatesInCell(t,contextBefore(pg,x.hit.lineIndex||0));
      }
      for(let c of cs){
        let dose=matchSpecificDose(x.drug,c.text,c.ctx);
        let localDose=localDoseMatch(x.drug,c.text,c.ctx);
        findings.push({
          drug:x.drug,dose,localDose,page:pg.page,evidenceContext:c.ctx,
          proposed:{...c.proposed,phase:canonicalEvidencePhase(c.ctx)},
          excerpt:shortExcerpt(x.drug.generic_name||x.drug.display_name,c.ctx,c.text,c.raw),
          matchedTerm:x.hit.term,matchMode:x.hit.mode
        });
      }
    }
  }
  findings=mergeClinicalFindings(findings).slice(0,120);
  return {
    findings,charCount,foundDrugNames:[...foundNames].filter(Boolean).sort(),
    matchedTerms:[...matchedTerms].sort(),cloudDrugCount:matcherLoadStatus.cloudCount,
    appDrugCount:matcherLoadStatus.appCount,combinedDrugCount:drugs.length,
    cloudQueryStatus:matcherLoadStatus.cloudQuery,cloudQueryError:matcherLoadStatus.cloudError,
    doseJoinError:matcherLoadStatus.doseJoinError,
    textPreview:pages.map(p=>p.text||'').join(' ').replace(/\s+/g,' ').slice(0,700)
  };
}
function showExtractionDiagnostic(stats){
  let el=$c('reconcileDiagnostic'); if(!el)return;
  let base=el.innerHTML||'';
  let names=stats.foundDrugNames?.length?stats.foundDrugNames.slice(0,25).join(', '):'none';
  let terms=stats.matchedTerms?.length?stats.matchedTerms.slice(0,25).join(', '):'none';
  let preview=stats.textPreview||'';
  el.innerHTML=base+
    `<div class="extractDiagDivider"></div>
     <div><b>Text extraction / matcher</b></div>
     <div>Extracted text: <b>${Number(stats.charCount||0).toLocaleString()} characters</b></div>
     <div>Cloud medication query: <b>${esc(stats.cloudQueryStatus||'unknown')}</b></div>
     ${stats.cloudQueryError?`<div class="diagError">Cloud query error: <b>${esc(stats.cloudQueryError)}</b></div>`:''}${stats.doseJoinError?`<div class="diagError">Dose-record join error: <b>${esc(stats.doseJoinError)}</b></div>`:''}
     <div>Cloud drugs available: <b>${Number(stats.cloudDrugCount||0).toLocaleString()}</b></div>
     <div>Cloud dose records available: <b>${Number(matcherLoadStatus.cloudDoseCount||0).toLocaleString()}</b></div>
     <div>Cloud drug query: <b>${esc(matcherLoadStatus.cloudDrugQuery||'not attempted')}</b></div>
     <div>Cloud dose query: <b>${esc(matcherLoadStatus.cloudDoseQuery||'not attempted')}</b></div>
     ${matcherLoadStatus.cloudDrugError?`<div class="diagError">Cloud drug error: <b>${esc(matcherLoadStatus.cloudDrugError)}</b></div>`:''}
     ${matcherLoadStatus.cloudDoseError?`<div class="diagError">Cloud dose error: <b>${esc(matcherLoadStatus.cloudDoseError)}</b></div>`:''}
     <div>Built-in/local fallback drugs: <b>${Number(stats.appDrugCount||0).toLocaleString()}</b></div>
     <div>Built-in/local dose records available: <b>${Number(appEvidenceDoseRows.length||0).toLocaleString()}</b></div>
     <div>Total unique matcher drugs: <b>${Number(stats.combinedDrugCount||0).toLocaleString()}</b></div>
     <div>Drug names found: <b>${esc(names)}</b></div>
     <div>Matched terms: <b>${esc(terms)}</b></div>
     <div>Structured candidates: <b>${stats.findings?.length||0}</b></div>
     <details class="extractPreview"><summary>Show extracted-text preview</summary><pre>${esc(preview)}</pre></details>`;
}

async function createReconciliationRows(fileRow,findings){
  // Re-running extraction replaces only unreviewed machine-generated rows for this file.
  // Approved/rejected history remains untouched.
  try{
    await api(`/rest/v1/evidence_reconciliations?reference_file_id=eq.${encodeURIComponent(fileRow.id)}&status=in.(uploaded,extracted,review_required)`,{method:'DELETE'});
  }catch(e){console.warn('Could not clear old pending reconciliation rows',e)}

  let rows=findings.map(f=>{
    let local=currentDoseSnapshot(f.localDose);
    let confidence=f.confidence??evidenceConfidence(f);
    let p={
      ...f.proposed,
      evidence_context:f.evidenceContext||undefined,
      confidence_score:confidence,
      confidence:confidence>=80?'high':confidence>=60?'moderate':'manual_review',
      current_local_record:local||undefined,
      requires_cloud_mapping:!f.dose
    };
    return {
      reference_id:fileRow.reference_id,
      reference_file_id:fileRow.id,
      drug_id:isUuidValue(f.drug.id)?f.drug.id:(local?.cloud_drug_id||null),
      dose_record_id:f.dose?.id||(local?.cloud_dose_id||null),
      matched_drug_name:f.drug.generic_name||f.drug.display_name||null,
      status:(f.dose&&!f.multiVariant&&confidence>=80)?'review_required':'extracted',
      evidence_excerpt:f.excerpt,
      page_reference:String(f.page||''),
      proposed_changes:p,
      extracted_by:session.user.id
    };
  });
  if(!rows.length)return [];
  return await api('/rest/v1/evidence_reconciliations',{
    method:'POST',headers:{'Prefer':'return=representation'},body:JSON.stringify(rows)
  });
}

async function analyzeEvidence(){
  if(!token())return alert('Sign in first.');
  let id=$c('reconcileFileSelect')?.value;
  let fileRow=(cloudEvidenceFiles||[]).find(f=>f.id===id);
  if(!fileRow)return alert('Choose an evidence file.');
  try{
    $c('reconcileAnalyzeResult').textContent='Downloading and extracting evidence…';
    let blob=await fetchEvidenceFile(fileRow);
    let diagnostic=await inspectEvidenceBlob(fileRow,blob); showEvidenceDiagnostic(diagnostic);
    if(!diagnostic.ready)throw new Error(diagnostic.isPdf?'Downloaded object is not a valid PDF.':'Downloaded evidence is not ready for extraction.');
    let filename=(fileRow.original_filename||'').toLowerCase(),pages;
    if(filename.endsWith('.pdf')||fileRow.mime_type==='application/pdf')pages=await extractPdfText(blob);
    else if(/\.(xlsx|xls|csv)$/.test(filename))pages=await extractXlsxText(blob);
    else {
      let text=await blob.text();
      pages=[{page:1,text}];
    }
    await ensureCloudDoseMap();
    loadAppEvidenceDoses();
    let matcherDrugs=await prepareMatcherDrugs();
    let analysis=analyzePages(pages,matcherDrugs);
    showExtractionDiagnostic(analysis);
    let findings=analysis.findings;
    if(!findings.length){
      let found=analysis.foundDrugNames.length?` Drug names detected: ${analysis.foundDrugNames.join(', ')}.`:'';
      let sourceNote=analysis.combinedDrugCount?'' :' No medication-name source was available for matching.';
      $c('reconcileAnalyzeResult').textContent=`Text extraction completed (${analysis.charCount.toLocaleString()} characters), but no structured drug/dose/weight-basis candidate was found.${found}${sourceNote} Evidence remains stored; review manually.`;
      return;
    }
    let created=await createReconciliationRows(fileRow,findings);
    $c('reconcileAnalyzeResult').textContent=`Extracted ${created.length} candidate statement(s) from ${analysis.charCount.toLocaleString()} characters. Review each item before approval.`;
    await refresh();
    openCloudTab('reconcile');
  }catch(e){
    $c('reconcileAnalyzeResult').textContent='Analysis failed: '+e.message;
  }
}

window.cloudOpenEvidenceById=async id=>{
  let f=(cloudEvidenceFiles||[]).find(x=>x.id===id);
  if(!f)return alert('Evidence file not found.');
  return window.cloudOpenEvidence(f.storage_path,f.original_filename||'evidence');
};

function compatibleChange(current,proposed){
  // Only fields explicitly extracted are changed.
  let allowed=['dose_min','dose_default','dose_max','dose_unit','dosing_weight','dosing_weight_formula','stock_concentration','stock_unit'];
  let out={};
  for(let k of allowed)if(proposed?.[k]!==undefined&&proposed[k]!==null&&proposed[k]!=='')out[k]=proposed[k];
  return out;
}
window.cloudApproveReconciliation=async id=>{
  if(!token())return alert('Sign in first.');
  let r=(cloudReconciliations||[]).find(x=>x.id===id);
  try{
    let done=await applyReconciliationRecord(r);
    if(done){selectedEvidenceIds.delete(id);await refresh()}
  }catch(e){alert('Approve failed: '+e.message)}
};
window.cloudRejectReconciliation=async id=>{
  if(!token())return alert('Sign in first.');

  let r=(cloudReconciliations||[]).find(x=>x.id===id);
  if(!r)return alert('Reconciliation item not found.');

  let drug=r.matched_drug_name||'this evidence item';
  let phase=r.proposed_changes?.evidence_context||r.proposed_changes?.phase||'unspecified phase';

  // Important: confirmation happens before any UI or database mutation.
  let confirmed=confirm(
    `Reject evidence candidate?\n\n${drug} — ${phase}\n\n` +
    `This will mark only this reconciliation candidate as rejected. ` +
    `It will not delete the evidence file or change the medication dose record.`
  );
  if(!confirmed)return;

  try{
    await api(`/rest/v1/evidence_reconciliations?id=eq.${encodeURIComponent(id)}`,{
      method:'PATCH',
      body:JSON.stringify({
        status:'rejected',
        reviewed_by:session.user.id,
        reviewed_at:new Date().toISOString(),
        review_notes:'Rejected by clinician in v0.57.'
      })
    });

    selectedEvidenceIds?.delete?.(id);
    await refresh();
  }catch(e){
    alert('Reject failed: '+e.message);
  }
};
window.cloudOpenEvidence=async(path,name)=>{if(!token())return alert('Sign in first.');try{let b=await fetchEvidenceFile({storage_path:path,original_filename:name});let u=URL.createObjectURL(b);window.open(u,'_blank');setTimeout(()=>URL.revokeObjectURL(u),60000)}catch(e){alert('Open evidence failed: '+e.message)}};
window.cloudDeleteEvidence=async id=>{
  if(!token())return alert('Sign in first.');
  let f=(cloudEvidenceFiles||[]).find(x=>x.id===id); if(!f)return alert('Evidence file not found.');
  if(!confirm(`Delete evidence file?\n\n${f.original_filename||'Evidence file'}\n\nThis removes the stored file and its file record. The Reference itself is kept.`))return;
  try{
    let path=String(f.storage_path||'').split('/').map(encodeURIComponent).join('/');
    let r=await fetch(`${SUPABASE_URL}/storage/v1/object/reference-files/${path}`,{method:'DELETE',headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${token()}`}});
    if(!r.ok&&r.status!==404)throw new Error('Storage delete failed: '+await r.text());
    await api(`/rest/v1/reference_files?id=eq.${encodeURIComponent(id)}`,{method:'DELETE'});
    await refresh();
  }catch(e){alert('Delete evidence failed: '+e.message)}
};
function openCloudTab(tab){document.querySelector('[data-tab="cloud"]')?.click();document.querySelectorAll('.cloudTabs button').forEach(b=>b.classList.toggle('active',b.dataset.cloudtab===tab));document.querySelectorAll('.cloudPane').forEach(p=>p.classList.toggle('active',p.id===`cloudPane-${tab}`))}
window.cloudDoseAction=(action,doseId,drugName)=>{selectedDoseId=doseId||null;selectedDrugName=drugName||'';let msg=selectedDoseId?`${selectedDrugName} • dose record ${selectedDoseId}`:`${selectedDrugName}: this is not yet a Cloud dose record. Add/reference evidence can be stored, but dose-linked verification requires a Cloud dose record.`;$c('cloudDoseContext').textContent=msg;$c('verificationDoseContext').textContent=msg;if(action==='addref')openCloudTab('references');else if(action==='verify'||action==='history')openCloudTab('verifications');else openCloudTab('files');refresh()};
document.querySelectorAll('.cloudTabs button').forEach(b=>b.onclick=()=>openCloudTab(b.dataset.cloudtab));$c('cloudSignIn').onclick=signIn;$c('cloudSignUp').onclick=signUp;$c('cloudSignOut').onclick=signOut;$c('cloudRefresh').onclick=refresh;$c('saveReferenceCloud').onclick=saveReference;

$c('analyzeEvidenceBtn').onclick=analyzeEvidence;
$c('refreshReconciliation').onclick=refresh;
$c('createPendingVerification').onclick=createPending;authUI();if(token())refresh();
})();


// v0.42 archive / restore
window.cloudSetDrugActive=async function(id,active){
  if(!window.supabaseClient) throw new Error("Supabase client not initialized");
  const {data,error}=await window.supabaseClient.from("drugs")
    .update({active:!!active,updated_at:new Date().toISOString()})
    .eq("id",id).select("id,active").single();
  if(error) throw error;
  return data;
};


/* v0.58 Evidence Intake Hub */
let intakeRows=[],intakeHeaders=[],intakeCandidates=[];

function intakeShowMode(mode){
  document.querySelectorAll('[data-intakemode]').forEach(b=>b.classList.toggle('active',b.dataset.intakemode===mode));
  document.querySelectorAll('[data-intakepanel]').forEach(p=>p.hidden=p.dataset.intakepanel!==mode);
}
document.addEventListener('click',e=>{
  let b=e.target.closest?.('[data-intakemode]');
  if(b)intakeShowMode(b.dataset.intakemode);
});
$c('openManualDrugAdd')?.addEventListener('click',()=>{
  document.querySelector('[data-tab="library"]')?.click();
  window.scrollTo({top:0,behavior:'smooth'});
});

function parseCsvLine(line){
  let out=[],cur='',q=false;
  for(let i=0;i<line.length;i++){
    let ch=line[i];
    if(ch==='"'){
      if(q&&line[i+1]==='"'){cur+='"';i++}else q=!q;
    }else if(ch===','&&!q){out.push(cur);cur=''}else cur+=ch;
  }
  out.push(cur);return out;
}
function parseCsvText(text){
  let lines=String(text||'').replace(/\r/g,'').split('\n').filter(x=>x.trim());
  if(!lines.length)return {headers:[],rows:[]};
  let headers=parseCsvLine(lines[0]).map(x=>x.trim());
  let rows=lines.slice(1).map(line=>{
    let vals=parseCsvLine(line),o={};headers.forEach((h,i)=>o[h]=vals[i]??'');return o;
  });
  return {headers,rows};
}
function intakeFieldOptions(){
  return [['','Ignore'],['generic_name','Generic name'],['display_name','Display name'],
  ['primary_category','Primary category'],['drug_class','Drug class'],['phase','Phase'],
  ['indication','Indication'],['route','Route'],['population','Population'],
  ['dose_min','Dose min'],['dose_default','Dose default'],['dose_max','Dose max'],
  ['dose_unit','Dose unit'],['max_dose','Maximum dose'],['max_dose_unit','Maximum dose unit'],
  ['stock_concentration','Stock concentration'],['stock_unit','Stock unit'],
  ['dosing_weight','Dosing weight'],['dosing_weight_formula','Weight formula'],
  ['dilution_note','Dilution note'],['administration_note','Administration note'],
  ['reference','Reference / source']];
}
function guessIntakeField(h){
  h=String(h||'').toLowerCase().replace(/[^a-z0-9ก-๙]+/g,' ');
  let tests=[['generic_name',/generic|drug name|medication|ชื่อสามัญ/],['display_name',/display|brand|trade|ชื่อการค้า/],
  ['primary_category',/category|หมวด/],['drug_class',/drug class|class|กลุ่มยา/],['phase',/phase|ช่วง/],
  ['indication',/indication|context|ข้อบ่งใช้/],['route',/route|ทางให้ยา/],['population',/population|ประชากร/],
  ['dose_min',/dose min|min dose/],['dose_default',/dose default|usual dose/],['dose_max',/dose max|max dose range/],
  ['dose_unit',/dose unit|unit/],['max_dose',/^max dose$|maximum dose/],['max_dose_unit',/max dose unit/],
  ['stock_concentration',/stock concentration|concentration|ความเข้มข้น/],['stock_unit',/stock unit/],
  ['dosing_weight',/dosing weight|weight basis/],['dosing_weight_formula',/weight formula|formula/],
  ['dilution_note',/dilution|เจือจาง/],['administration_note',/administration|วิธีให้ยา/],
  ['reference',/reference|source|guideline|เอกสารอ้างอิง/]];
  return tests.find(x=>x[1].test(h))?.[0]||'';
}
function renderIntakeMap(){
  let el=$c('intakeColumnMap'),opts=intakeFieldOptions();if(!el)return;
  el.innerHTML=intakeHeaders.map((h,i)=>`<label><span>${esc(h)}</span><select data-intakemap="${i}">${opts.map(([v,l])=>`<option value="${v}" ${v===guessIntakeField(h)?'selected':''}>${l}</option>`).join('')}</select></label>`).join('');
}
function renderIntakeSheetPreview(){
  let el=$c('intakeSheetPreview');if(!el)return;
  if(!intakeRows.length){el.textContent='No rows found.';return}
  let rows=intakeRows.slice(0,8);
  el.innerHTML=`<div class="sheetScroll"><table><thead><tr>${intakeHeaders.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${intakeHeaders.map(h=>`<td>${esc(r[h]??'')}</td>`).join('')}</tr>`).join('')}</tbody></table></div><small>${intakeRows.length} total row(s)</small>`;
}
async function intakeLoadSheetJs(){
  if(window.XLSX)return true;
  return await new Promise(resolve=>{
    let s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
    s.onload=()=>resolve(true);s.onerror=()=>resolve(false);document.head.appendChild(s);
  });
}
async function readIntakeSheet(file){
  let ext=(file.name.split('.').pop()||'').toLowerCase();
  if(ext==='csv')return parseCsvText(await file.text());
  if(!await intakeLoadSheetJs())throw new Error('Excel parser could not load. Save as CSV and retry.');
  let wb=XLSX.read(await file.arrayBuffer(),{type:'array'}),ws=wb.Sheets[wb.SheetNames[0]];
  let a=XLSX.utils.sheet_to_json(ws,{header:1,defval:''});
  if(!a.length)return {headers:[],rows:[]};
  let headers=a[0].map(x=>String(x).trim());
  let rows=a.slice(1).filter(r=>r.some(x=>String(x).trim())).map(vals=>{let o={};headers.forEach((h,i)=>o[h]=vals[i]??'');return o});
  return {headers,rows};
}
$c('intakeSheetFile')?.addEventListener('change',async e=>{
  let file=e.target.files?.[0],status=$c('intakeSheetStatus');if(!file)return;
  try{
    status.textContent='Reading spreadsheet…';
    let parsed=await readIntakeSheet(file);intakeHeaders=parsed.headers;intakeRows=parsed.rows;
    renderIntakeMap();renderIntakeSheetPreview();status.textContent=`Loaded ${intakeRows.length} row(s).`;
  }catch(err){status.textContent='Import failed: '+err.message}
});

function intakeMapping(){
  let map={};document.querySelectorAll('[data-intakemap]').forEach(s=>{if(s.value)map[intakeHeaders[Number(s.dataset.intakemap)]]=s.value});return map;
}
function normalizeIntakeRow(row,map){
  let out={};
  for(let [src,target] of Object.entries(map)){
    let v=row[src];
    if(['dose_min','dose_default','dose_max','max_dose','stock_concentration'].includes(target)){
      let n=Number(String(v).replace(/,/g,'').trim());out[target]=Number.isFinite(n)?n:null;
    }else out[target]=String(v??'').trim()||null;
  }
  return out;
}
function intakeDrugs(){try{return window.getEvidenceMatcherDrugs?.()||[]}catch(e){return []}}
function classifyIntake(c){
  let drugs=intakeDrugs(),key=compactEvidenceSearch(c.generic_name||c.display_name||'');
  if(!key)return {classification:'insufficient_evidence',reason:'Drug name is missing.'};
  let exact=drugs.find(d=>compactEvidenceSearch(d.generic_name||d.display_name||d.name||'')===key);
  if(exact){
    let phase=canonicalEvidencePhase(`${c.phase||''} ${c.indication||''}`);
    let rows=(window.getEvidenceMatcherDoseRecords?.()||[]).filter(r=>compactEvidenceSearch(r.generic_name)===key&&(phase==='unspecified'||doseRowPhase(r)===phase));
    if(rows.length){
      let conflict=rows.some(r=>(c.dose_unit&&r.dose_unit&&normUnit(c.dose_unit)!==normUnit(r.dose_unit))||(c.dosing_weight&&r.dosing_weight&&String(c.dosing_weight).toUpperCase()!==String(r.dosing_weight).toUpperCase()));
      return {classification:conflict?'conflict':'exact_match',reason:conflict?'Existing record differs in unit or weight basis.':'Existing drug and phase found.'};
    }
    return {classification:'new_dose_record',reason:'Drug exists but this phase or indication appears new.'};
  }
  let probable=drugs.find(d=>{let k=compactEvidenceSearch(d.generic_name||d.display_name||d.name||'');return k&&(k.includes(key)||key.includes(k))});
  if(probable)return {classification:'probable_match',reason:'Similar medication name found; synonym review required.'};
  return {classification:'new_drug',reason:'No matching drug found.'};
}
$c('buildSpreadsheetCandidates')?.addEventListener('click',()=>{
  let map=intakeMapping();
  intakeCandidates=intakeRows.map((r,i)=>{let candidate=normalizeIntakeRow(r,map);return {id:`sheet-${Date.now()}-${i}`,source:'spreadsheet',candidate,...classifyIntake(candidate)}});
  renderIntakeQueue();$c('intakeSheetStatus').textContent=`Created ${intakeCandidates.length} review candidate(s). Nothing was applied.`;
});

function intakeExtractStatements(text){
  let t=normalizeEvidenceText(text||''),out=[];
  for(let d of intakeDrugs()){
    let name=d.generic_name||d.display_name||d.name;if(!name)continue;
    let idx=normalizedSearch(t).indexOf(normalizedSearch(name));if(idx<0)continue;
    let excerpt=t.slice(Math.max(0,idx-150),Math.min(t.length,idx+650));
    let doses=extractDoseCandidates(excerpt),weights=detectWeightBases(excerpt);
    if(doses.length)for(let dose of doses){
      let w=weightNearest(excerpt,dose.idx);
      out.push({generic_name:name,phase:canonicalEvidencePhase(excerpt),dose_min:dose.dose_min,dose_default:dose.dose_default,dose_max:dose.dose_max,dose_unit:dose.dose_unit,dosing_weight:w?.basis||null,dosing_weight_formula:w?.formula||null,evidence_excerpt:excerpt});
    }else if(weights.length)out.push({generic_name:name,phase:canonicalEvidencePhase(excerpt),dosing_weight:weights[0].basis,evidence_excerpt:excerpt});
  }
  return out;
}
function intakeCandidatesFromText(text,source,meta={}){
  return intakeExtractStatements(text).map((candidate,i)=>({id:`${source}-${Date.now()}-${i}`,source,candidate:{...candidate,...meta},...classifyIntake(candidate)}));
}
$c('analyzePastedClinicalText')?.addEventListener('click',()=>{
  let text=$c('intakePasteText').value,status=$c('intakePasteStatus');
  if(!text.trim()){status.textContent='Paste clinical text first.';return}
  let items=intakeCandidatesFromText(text,'pasted_text',{reference:$c('intakePasteTitle').value||null,page_reference:$c('intakePastePage').value||null});
  intakeCandidates.push(...items);renderIntakeQueue();status.textContent=items.length?`Created ${items.length} candidate(s).`:'No structured medication statement found.';
});
async function loadMammoth(){
  if(window.mammoth)return true;
  return await new Promise(resolve=>{let s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/mammoth@1.8.0/mammoth.browser.min.js';s.onload=()=>resolve(true);s.onerror=()=>resolve(false);document.head.appendChild(s)});
}
async function textFromIntakeFile(file){
  let ext=(file.name.split('.').pop()||'').toLowerCase();
  if(ext==='txt'||ext==='csv')return await file.text();
  if(ext==='pdf'){let pages=await extractPdfText(new Uint8Array(await file.arrayBuffer()));return pages.map(p=>p.text||'').join('\n')}
  if(ext==='docx'){
    if(!await loadMammoth())throw new Error('Word parser could not load. Convert to PDF or paste text.');
    return (await mammoth.extractRawText({arrayBuffer:await file.arrayBuffer()})).value||'';
  }
  if(['png','jpg','jpeg','webp'].includes(ext))throw new Error('Image OCR is not enabled. Store the image as evidence and paste verified text, or use a searchable PDF.');
  throw new Error('Unsupported file type.');
}
$c('analyzeIntakeDocument')?.addEventListener('click',async()=>{
  let file=$c('intakeEvidenceFile').files?.[0],status=$c('intakeDocumentStatus');if(!file){status.textContent='Choose a file first.';return}
  try{
    status.textContent='Reading file…';
    let text=await textFromIntakeFile(file),items=intakeCandidatesFromText(text,'document',{original_filename:file.name,reference:$c('intakeDocumentNotes').value||null});
    intakeCandidates.push(...items);renderIntakeQueue();status.textContent=items.length?`Created ${items.length} candidate(s) from ${file.name}.`:'File read, but no structured medication statement was found.';
  }catch(err){status.textContent='Analysis unavailable: '+err.message}
});

function intakeClassLabel(x){return ({exact_match:'Exact match',probable_match:'Probable match',new_dose_record:'New dose record',conflict:'Conflict',new_drug:'New drug',insufficient_evidence:'Insufficient evidence'})[x]||x}
function intakeSummary(c){
  let a=[];if(c.phase)a.push(c.phase);
  if(c.dose_min!=null||c.dose_max!=null)a.push(`${c.dose_min??'—'}–${c.dose_max??'—'} ${c.dose_unit||''}`.trim());
  else if(c.dose_default!=null)a.push(`${c.dose_default} ${c.dose_unit||''}`.trim());
  if(c.dosing_weight)a.push(c.dosing_weight);return a.join(' • ')||'No complete dose statement';
}
function renderIntakeQueue(){
  let el=$c('intakeReviewQueue');if(!el)return;
  if(!intakeCandidates.length){el.textContent='No intake candidates yet.';return}
  el.innerHTML=intakeCandidates.map(item=>{
    let c=item.candidate;
    return `<div class="intakeCandidate ${item.classification}">
      <div class="intakeCandidateTitle"><b>${esc(c.generic_name||c.display_name||'Unnamed medication')}</b><span>${esc(intakeClassLabel(item.classification))}</span></div>
      <div class="intakeCandidateMeta">${esc(item.source)} • ${esc(intakeSummary(c))}</div>
      <p>${esc(item.reason||'')}</p>
      ${c.evidence_excerpt?`<details><summary>Evidence excerpt</summary><blockquote>${esc(c.evidence_excerpt)}</blockquote></details>`:''}
      <div class="intakeCandidateActions"><button type="button" onclick="alert('Review candidate, then map it through Manual Add or Reconciliation. v0.58 intentionally does not silently merge data.')">Review / map</button><button class="rejectBtn" type="button" onclick="intakeCandidates=intakeCandidates.filter(x=>x.id!=='${item.id}');renderIntakeQueue()">Remove</button></div>
    </div>`;
  }).join('');
}
$c('clearIntakeQueue')?.addEventListener('click',()=>{
  if(intakeCandidates.length&&!confirm('Clear the intake queue? No Drug Library data has been applied.'))return;
  intakeCandidates=[];renderIntakeQueue();
});
