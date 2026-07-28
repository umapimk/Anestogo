/* Anesthculator v0.39 Cloud — evidence/verification data only; no patient fields are sent. */
(()=>{
const SUPABASE_URL='https://uktfoqvmkxfpczbbmepy.supabase.co';
const SUPABASE_KEY='sb_publishable_A2NLYpy1dt1D30lwa_S3bg_656DfnPH';
const SESSION_KEY='anesthCloudSessionV033';
const $c=id=>document.getElementById(id); let session=JSON.parse(localStorage.getItem(SESSION_KEY)||'null'); let selectedDoseId=null,selectedDrugName='';
const token=()=>session?.access_token||null;

let cloudDrugRows=[], cloudDoseRows=[], cloudReferences=[], cloudEvidenceFiles=[], cloudReconciliations=[], cloudProfiles=[];
let matcherLoadStatus={cloudQuery:'not attempted',cloudError:null,cloudCount:0,appCount:0,combinedCount:0};

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
  let p=r.proposed_changes||{};
  let a=[];
  if(p.dose_min!=null||p.dose_max!=null){
    let range=(p.dose_min!=null&&p.dose_max!=null)?`${p.dose_min}–${p.dose_max}`:(p.dose_default??p.dose_min??p.dose_max);
    a.push(`Dose ${range}${p.dose_unit?' '+p.dose_unit:''}`);
  } else if(p.dose_default!=null) a.push(`Dose ${p.dose_default}${p.dose_unit?' '+p.dose_unit:''}`);
  if(p.dosing_weight)a.push(`Weight basis ${p.dosing_weight}`);
  if(p.stock_concentration!=null)a.push(`Stock ${p.stock_concentration}${p.stock_unit?' '+p.stock_unit:''}`);
  return a.join(' • ')||'No structured change extracted';
}

function renderReconciliations(rows,refs,files){
  let el=$c('cloudReconciliationList'); if(!el)return;
  let refName=Object.fromEntries((refs||[]).map(x=>[x.id,x.title]));
  let fileName=Object.fromEntries((files||[]).map(x=>[x.id,x.original_filename]));
  el.innerHTML=rows.length?rows.map(r=>{
    let dose=(cloudDoseRows||[]).find(d=>d.id===r.dose_record_id);
    let drug=(cloudDrugRows||[]).find(d=>d.id===(dose?.drug_id||r.drug_id));
    let current=dose?[
      dose.dose_min!=null||dose.dose_max!=null?`Dose ${dose.dose_min??'—'}–${dose.dose_max??'—'} ${dose.dose_unit||''}`:'',
      `Weight ${dose.dosing_weight||'TBW'}`,
      dose.stock_concentration!=null?`Stock ${dose.stock_concentration} ${dose.stock_unit||''}`:''
    ].filter(Boolean).join(' • '):'Not matched to a specific dose record';

    return `<div class="cloudRow reconcileRow">
      <div class="reconcileRowTitle"><b>${esc(drug?.generic_name||r.matched_drug_name||'Unmatched evidence')}</b>${statusBadge(r.status)}</div>
      <span>${esc(refName[r.reference_id]||'Reference')} • ${esc(fileName[r.reference_file_id]||'Evidence file')}</span>
      <small><b>Current:</b> ${esc(current)}</small>
      <small><b>Extracted:</b> ${esc(proposedSummary(r))}</small>
      ${r.evidence_excerpt?`<blockquote>${esc(r.evidence_excerpt)}</blockquote>`:''}
      ${r.page_reference?`<small>Page ${esc(r.page_reference)}</small>`:''}
      <div class="reconcileActions">
        ${r.reference_file_id?`<button type="button" onclick="cloudOpenEvidenceById('${r.reference_file_id}')">📎 Evidence</button>`:''}
        ${(r.status==='review_required'||r.status==='extracted')&&r.dose_record_id?
          `<button class="approveBtn" type="button" onclick="cloudApproveReconciliation('${r.id}')">✓ Approve update</button>
           <button class="rejectBtn" type="button" onclick="cloudRejectReconciliation('${r.id}')">✕ Reject</button>`:''}
      </div>
    </div>`;
  }).join(''):'No reconciliation items yet.';
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
    let lines=rows.map(r=>r.items.sort((a,b)=>a.x-b.x).map(x=>x.s).join('  ').replace(/\s+/g,' ').trim()).filter(Boolean);
    let text=normalizeEvidenceText(lines.join('\n'));
    pages.push({page:i,text,lines:text.split(/\n+/).filter(Boolean)});
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
function analyzePages(pages,matcherDrugs){
  let findings=[],drugs=(matcherDrugs||[]),foundNames=new Set(),matchedTerms=new Set();
  let charCount=pages.reduce((n,p)=>n+(p.text||'').length,0);

  for(let pg of pages){
    for(let d of drugs){
      let match=findDrugMentions(pg,d);
      if(!match.hits.length)continue;
      foundNames.add(d.generic_name||d.display_name||'Unnamed drug');
      match.matchedTerms.forEach(x=>matchedTerms.add(x));

      for(let hit of match.hits){
        let excerpt=contextForDrugHit(pg,hit,3,9);
        let doses=extractDoseCandidates(excerpt),weights=detectWeightBases(excerpt);
        if(!doses.length && !weights.length)continue;

        if(doses.length){
          for(let dose of doses){
            let weight=weightNearest(excerpt,dose.idx);
            let ctx=inferEvidenceContext(excerpt,dose.idx);
            let matched=inferDoseRecord(d.id,excerpt,ctx);
            let proposed={
              dose_min:dose.dose_min,
              dose_default:dose.dose_default,
              dose_max:dose.dose_max,
              dose_unit:dose.dose_unit
            };
            if(weight){
              proposed.dosing_weight=weight.basis;
              proposed.dosing_weight_formula=weight.formula;
            }
            findings.push({
              drug:d,dose:matched,page:pg.page,
              excerpt:excerpt.slice(0,1400),
              proposed,evidenceContext:ctx,
              matchedTerm:hit.term,matchMode:hit.mode
            });
          }
        }else{
          for(let weight of weights){
            let ctx=inferEvidenceContext(excerpt,weight.idx);
            let matched=inferDoseRecord(d.id,excerpt,ctx);
            findings.push({
              drug:d,dose:matched,page:pg.page,
              excerpt:excerpt.slice(0,1400),
              proposed:{dosing_weight:weight.basis,dosing_weight_formula:weight.formula},
              evidenceContext:ctx,matchedTerm:hit.term,matchMode:hit.mode
            });
          }
        }
      }
    }
  }

  let seen=new Set();
  findings=findings.filter(f=>{
    let k=`${f.drug.id}|${f.dose?.id||''}|${f.page}|${JSON.stringify(f.proposed)}`;
    if(seen.has(k))return false;
    seen.add(k);return true;
  }).slice(0,120);

  let preview=(pages.map(p=>p.text||'').join('\n').replace(/\s+/g,' ').trim()).slice(0,700);
  return {
    findings,
    charCount,
    foundDrugNames:[...foundNames].sort(),
    matchedTerms:[...matchedTerms].sort(),
    cloudDrugCount:matcherLoadStatus.cloudCount,
    appDrugCount:matcherLoadStatus.appCount,
    combinedDrugCount:drugs.length,
    cloudQueryStatus:matcherLoadStatus.cloudQuery,
    cloudQueryError:matcherLoadStatus.cloudError,
    textPreview:preview
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
     ${stats.cloudQueryError?`<div class="diagError">Cloud query error: <b>${esc(stats.cloudQueryError)}</b></div>`:''}
     <div>Cloud drugs available: <b>${Number(stats.cloudDrugCount||0).toLocaleString()}</b></div>
     <div>Built-in/local fallback drugs: <b>${Number(stats.appDrugCount||0).toLocaleString()}</b></div>
     <div>Total unique matcher drugs: <b>${Number(stats.combinedDrugCount||0).toLocaleString()}</b></div>
     <div>Drug names found: <b>${esc(names)}</b></div>
     <div>Matched terms: <b>${esc(terms)}</b></div>
     <div>Structured candidates: <b>${stats.findings?.length||0}</b></div>
     <details class="extractPreview"><summary>Show extracted-text preview</summary><pre>${esc(preview)}</pre></details>`;
}

async function createReconciliationRows(fileRow,findings){
  let rows=findings.map(f=>({
    reference_id:fileRow.reference_id,
    reference_file_id:fileRow.id,
    drug_id:isUuidValue(f.drug.id)?f.drug.id:null,
    dose_record_id:f.dose?.id||null,
    matched_drug_name:f.drug.generic_name||f.drug.display_name||null,
    status:f.dose?'review_required':'extracted',
    evidence_excerpt:f.excerpt,
    page_reference:String(f.page),
    proposed_changes:{...f.proposed,evidence_context:f.evidenceContext||undefined},
    extracted_by:session.user.id
  }));
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
  if(!r?.dose_record_id)return alert('This evidence is not matched to a specific dose record.');
  let dose=(cloudDoseRows||[]).find(x=>x.id===r.dose_record_id);
  if(!dose)return alert('Dose record not found.');
  let changes=compatibleChange(dose,r.proposed_changes||{});
  if(!Object.keys(changes).length)return alert('No structured medication field is available to apply.');

  let summary=Object.entries(changes).map(([k,v])=>`${k}: ${dose[k]??'—'} → ${v}`).join('\n');
  if(!confirm(`Approve evidence update?\n\n${summary}\n\nThis will update the Cloud dose record and create verification history.`))return;

  try{
    await api(`/rest/v1/dose_records?id=eq.${encodeURIComponent(r.dose_record_id)}`,{
      method:'PATCH',headers:{'Prefer':'return=representation'},body:JSON.stringify({...changes,updated_at:new Date().toISOString()})
    });
    await api('/rest/v1/verifications',{
      method:'POST',body:JSON.stringify({
        dose_record_id:r.dose_record_id,
        reference_id:r.reference_id,
        verification_type:'source_verified',
        decision:'verified',
        verified_dose_min:changes.dose_min??dose.dose_min,
        verified_dose_default:changes.dose_default??dose.dose_default,
        verified_dose_max:changes.dose_max??dose.dose_max,
        verified_dose_unit:changes.dose_unit??dose.dose_unit,
        verified_stock_concentration:changes.stock_concentration??dose.stock_concentration,
        verified_stock_unit:changes.stock_unit??dose.stock_unit,
        notes:`Approved from evidence reconciliation ${r.id}`,
        verified_by:session.user.id,
        verified_at:new Date().toISOString()
      })
    });
    await api(`/rest/v1/evidence_reconciliations?id=eq.${encodeURIComponent(id)}`,{
      method:'PATCH',body:JSON.stringify({status:'approved',reviewed_by:session.user.id,reviewed_at:new Date().toISOString(),applied_changes:changes})
    });
    await refresh();
  }catch(e){alert('Approve failed: '+e.message)}
};
window.cloudRejectReconciliation=async id=>{
  if(!token())return alert('Sign in first.');
  let reason=prompt('Reason for rejection (optional):')||null;
  try{
    await api(`/rest/v1/evidence_reconciliations?id=eq.${encodeURIComponent(id)}`,{
      method:'PATCH',body:JSON.stringify({status:'rejected',reviewed_by:session.user.id,reviewed_at:new Date().toISOString(),review_notes:reason})
    });
    await refresh();
  }catch(e){alert('Reject failed: '+e.message)}
};

async function refresh(){
  if(!token()){setMsg('Sign in first.');return}
  try{
    setMsg('Syncing…');
    let [drugs,doses,refs,files,vs,profiles,recs]=await Promise.all([
      api('/rest/v1/drugs?select=*&order=generic_name.asc'),
      api('/rest/v1/dose_records?select=*&order=created_at.asc'),
      api('/rest/v1/references?select=*&order=created_at.desc'),
      api('/rest/v1/reference_files?select=*&order=created_at.desc'),
      api('/rest/v1/verifications?select=*&order=created_at.desc'),
      api('/rest/v1/profiles?select=id,display_name,role&order=created_at.asc'),
      api('/rest/v1/evidence_reconciliations?select=*&order=created_at.desc')
    ]);
    cloudDrugRows=drugs||[]; cloudDoseRows=doses||[]; cloudReferences=refs||[];
    cloudEvidenceFiles=files||[]; cloudReconciliations=recs||[]; cloudProfiles=profiles||[];
    window.setCloudLibrary?.(mapCloud((drugs||[]).filter(d=>d.active!==false),doses));
    renderRefs(refs); renderFiles(files,refs); renderVerifications(vs,refs); renderUsers(profiles);
    fillReconcileFileSelect(files,refs);
    renderReconciliations(recs,refs,files);
    let me=profiles.find(x=>x.id===session.user.id),role=me?.role||'viewer';
    $c('cloudStatus').textContent='Connected • '+role;
    $c('cloudUserText').textContent=`${session.user.email} • ${role}`;
    setMsg(`Cloud ready: ${(drugs||[]).filter(d=>d.active!==false).length} active drugs • ${(refs||[]).length} references • ${(files||[]).length} files • ${(recs||[]).length} reconciliation items.`);
  }catch(e){
    setMsg('Sync failed: '+e.message);
    if(String(e.message).includes('evidence_reconciliations'))setMsg('Cloud schema needs the v0.43/v0.44 reconciliation SQL migration before reconciliation can run.');
  }
}

function fmtBytes(n){
  n=Number(n||0);
  if(n<1024)return `${n} B`;
  if(n<1024*1024)return `${(n/1024).toFixed(1)} KB`;
  return `${(n/1024/1024).toFixed(2)} MB`;
}
function showUploadDiagnostic(info){
  let el=$c('uploadDiagnostic'); if(!el)return;
  let rows=[
    ['Selected file',fmtBytes(info.selected)],
    ['Binary payload',fmtBytes(info.payload)],
    ['Storage path',info.path||'—'],
    ['Upload response',info.uploadStatus||'—'],
    ['Downloaded verification',info.downloaded==null?'—':fmtBytes(info.downloaded)],
    ['Verification',info.ok?'PASS ✓':'NOT COMPLETE']
  ];
  el.innerHTML='<b>Evidence upload diagnostic</b>'+rows.map(x=>`<div><span>${esc(x[0])}</span><strong>${esc(x[1])}</strong></div>`).join('');
  el.hidden=false;
}
async function uploadEvidenceBinary(file,path){
  let ab=await file.arrayBuffer();
  if(!ab.byteLength)throw new Error('The selected file produced an empty binary payload. Re-select the original file from Files/Downloads, not a placeholder.');
  if(file.size && ab.byteLength!==file.size)throw new Error(`Browser file-size mismatch: selected ${file.size} bytes but readable payload is ${ab.byteLength} bytes.`);

  const encoded=String(path).split('/').map(encodeURIComponent).join('/');
  let r=await fetch(`${SUPABASE_URL}/storage/v1/object/reference-files/${encoded}`,{
    method:'POST',
    headers:{
      apikey:SUPABASE_KEY,
      Authorization:`Bearer ${token()}`,
      'Content-Type':file.type||'application/octet-stream',
      'x-upsert':'false',
      'cache-control':'3600'
    },
    body:ab
  });
  let responseText=await r.text();
  if(!r.ok)throw new Error(`Evidence upload failed (${r.status}): ${responseText}`);
  return {payloadBytes:ab.byteLength,status:r.status,responseText};
}

async function saveReference(){
  if(!token()){alert('Sign in first.');return}
  let title=$c('refTitle').value.trim(); if(!title){alert('Reference title is required.');return}
  let file=$c('refFile').files?.[0], fileHash=null;
  let diag={selected:file?.size||0,payload:0,path:'',uploadStatus:'',downloaded:null,ok:false};
  if($c('uploadDiagnostic'))$c('uploadDiagnostic').hidden=true;
  try{
    $c('refCloudResult').textContent='Validating selected evidence…';
    if(file){
      if(!file.size)throw new Error('Selected evidence file is 0 bytes. Choose the original file again.');
      // Force the browser to read the bytes now. This catches iCloud/File-provider placeholders before creating Reference metadata.
      let probe=await file.arrayBuffer();
      diag.payload=probe.byteLength;
      showUploadDiagnostic(diag);
      if(!probe.byteLength)throw new Error('The selected evidence file has a name/metadata but no readable bytes. Download the PDF fully to the device, then choose it again.');
      if(probe.byteLength!==file.size)throw new Error(`Selected file reports ${file.size} bytes but Safari provided ${probe.byteLength} bytes.`);
      fileHash=await sha256Hex(new Blob([probe],{type:file.type||'application/octet-stream'}));
      let dup=await api(`/rest/v1/reference_files?select=id,original_filename,file_size_bytes,reference_id&file_hash=eq.${encodeURIComponent(fileHash)}&limit=1`);
      if(dup?.length)throw new Error(`This exact evidence file is already stored (${dup[0].original_filename||'evidence'}). Duplicate upload was blocked.`);
    }

    $c('refCloudResult').textContent='Saving reference…';
    let body={title,organization:$c('refOrg').value||null,edition:$c('refEdition').value||null,publication_date:$c('refDate').value||null,page_reference:$c('refPage').value||null,table_reference:$c('refTable').value||null,section_reference:$c('refSection').value||null,url:$c('refUrl').value||null,notes:$c('refNotes').value||null,source_type:$c('refType').value,created_by:session.user.id};
    let refs=await api('/rest/v1/references',{method:'POST',headers:{'Prefer':'return=representation'},body:JSON.stringify(body)}),ref=refs[0];

    if(file){
      let safe=(file.name||'evidence').replace(/[^a-zA-Z0-9._-]/g,'_');
      let path=`${ref.id}/${crypto.randomUUID()}-${safe}`;
      diag.path=path;
      $c('refCloudResult').textContent='Uploading evidence bytes…';
      let up=await uploadEvidenceBinary(file,path);
      diag.payload=up.payloadBytes; diag.uploadStatus=String(up.status); showUploadDiagnostic(diag);

      $c('refCloudResult').textContent='Verifying uploaded object…';
      let verifyRow={storage_path:path,file_size_bytes:file.size,mime_type:file.type||null,original_filename:file.name};
      let downloaded=await fetchEvidenceFile(verifyRow);
      diag.downloaded=downloaded.size;
      if(downloaded.size!==up.payloadBytes){
        showUploadDiagnostic(diag);
        // Best-effort cleanup: do not leave a broken object + misleading metadata.
        try{
          let encoded=path.split('/').map(encodeURIComponent).join('/');
          await fetch(`${SUPABASE_URL}/storage/v1/object/reference-files/${encoded}`,{method:'DELETE',headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${token()}`}});
        }catch{}
        throw new Error(`Upload verification failed: binary payload ${up.payloadBytes} bytes, downloaded ${downloaded.size} bytes. Broken Storage object was not registered as Evidence.`);
      }
      let first=new Uint8Array(await downloaded.slice(0,5).arrayBuffer());
      let header=String.fromCharCode(...first);
      if((file.type==='application/pdf'||/\.pdf$/i.test(file.name)) && header!=='%PDF-'){
        showUploadDiagnostic(diag);
        throw new Error(`Uploaded object is not a valid PDF header (received ${JSON.stringify(header)}).`);
      }
      diag.ok=true; showUploadDiagnostic(diag);
      await api('/rest/v1/reference_files',{method:'POST',body:JSON.stringify({reference_id:ref.id,storage_path:path,original_filename:file.name,mime_type:file.type||null,uploaded_by:session.user.id,file_size_bytes:downloaded.size,file_hash:fileHash})});
    }

    if(selectedDoseId)await api('/rest/v1/verifications',{method:'POST',body:JSON.stringify({dose_record_id:selectedDoseId,reference_id:ref.id,verification_type:'source_verified',decision:'pending',notes:'Reference linked; clinical verification pending.'})});
    $c('refCloudResult').textContent=file
      ? 'Saved. Binary upload and download verification passed. Next: Reconciliation → Extract & Compare.'
      : 'Reference saved. No evidence file was attached.';
    await refresh();
  }catch(e){
    showUploadDiagnostic(diag);
    $c('refCloudResult').textContent='Save failed: '+e.message;
  }
}
async function createPending(){if(!selectedDoseId){alert('Open a cloud dose record in Drug Library and tap Verify first.');return}try{await api('/rest/v1/verifications',{method:'POST',body:JSON.stringify({dose_record_id:selectedDoseId,verification_type:'local_verified',decision:'pending',notes:'Pending clinician/institution review.'})});await refresh()}catch(e){alert('Could not create verification: '+e.message)}}
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
