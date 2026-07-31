/* Anesthculator v0.72.0 Senior Mentor Mode
 * Built as a conservative extension of v0.71.0.
 * UX/reasoning prototype only — not clinically validated.
 */
(function(){
  'use strict';

  const STORE='anesthSeniorMentorV072';
  const Q={
    bleeding:{label:'Active bleeding',prompt:'ดู surgical field ก่อนครับ — มี active bleeding หรือ major volume loss หรือไม่?',options:['yes','no','unknown']},
    rash:{label:'Rash / angioedema',prompt:'มองผู้ป่วยและใต้ผ้าคลุม — มี rash, flushing หรือ angioedema หรือไม่?',options:['yes','no','unknown']},
    airway:{label:'Peak airway pressure',prompt:'ดู ventilator — peak airway pressure สูงขึ้นอย่างฉับพลันหรือไม่?',options:['yes','no','unknown']},
    rhythmChange:{label:'Rhythm / HR change',prompt:'ดู ECG และ HR trend — มี rhythm หรือ heart-rate change ที่สำคัญหรือไม่?',options:['yes','no','unknown']},
    rhythmType:{label:'Rhythm type',prompt:'ตอนนี้ rhythm เป็นแบบใด?',options:['AF','sinus tachycardia','SVT regular','wide-complex tachycardia','bradyarrhythmia','uncertain']},
    afOnset:{label:'AF onset',prompt:'AF นี้เป็น new onset หรือเป็น pre-existing AF?',options:['new onset','pre-existing','unknown']},
    afStability:{label:'AF hemodynamic impact',prompt:'มีหลักฐานว่า AF ทำให้ผู้ป่วย unstable หรือไม่?',options:['unstable','stable','uncertain']},
    afRate:{label:'Ventricular rate',prompt:'Ventricular rate โดยประมาณอยู่ช่วงใด?',options:['<110','110–150','>150','uncertain']},
    afTrigger:{label:'Likely AF trigger',prompt:'มี reversible trigger ใดเด่นที่สุดในตอนนี้?',options:['hypovolemia','hypoxia / ventilation','anesthetic / drug effect','electrolyte / metabolic','pain / stimulation','none clear']},
    etco2:{label:'ETCO₂ fall',prompt:'ETCO₂ ลดลงฉับพลันโดยอธิบายจาก ventilation ไม่ได้หรือไม่?',options:['yes','no','unknown']}
  };

  const defaultState=()=>({
    answers:{},actions:{},intervention:null,responses:[],timeline:[],edit:null
  });
  let S=defaultState();
  try{S=Object.assign(defaultState(),JSON.parse(localStorage.getItem(STORE)||'{}'))}catch(_){ }

  function save(){localStorage.setItem(STORE,JSON.stringify(S));}
  function stamp(){return new Date().toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit',second:'2-digit'});}
  function log(text){S.timeline.unshift({time:stamp(),text});save();}
  function esc(s){return String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}

  function questionSequence(){
    const out=['bleeding','rash','airway','rhythmChange'];
    if(S.answers.rhythmChange==='yes')out.push('rhythmType');
    if(S.answers.rhythmType==='AF')out.push('afOnset','afStability','afRate','afTrigger');
    out.push('etco2');
    return out;
  }
  function nextQuestion(){return questionSequence().find(id=>!S.answers[id])||null;}

  function scores(){
    const r={vasodilation:48,hypovolemia:38,arrhythmia:22,obstruction:16,anaphylaxis:14};
    const a=S.answers;
    if(a.bleeding==='yes'){r.hypovolemia+=48;r.vasodilation-=10;} if(a.bleeding==='no'){r.hypovolemia-=22;r.vasodilation+=7;}
    if(a.rash==='yes'){r.anaphylaxis+=58;} if(a.rash==='no')r.anaphylaxis-=20;
    if(a.airway==='yes'){r.anaphylaxis+=18;r.obstruction+=20;} if(a.airway==='no'){r.anaphylaxis-=5;r.obstruction-=7;}
    if(a.rhythmChange==='yes')r.arrhythmia+=32; if(a.rhythmChange==='no')r.arrhythmia-=12;
    if(a.rhythmType==='AF')r.arrhythmia+=28;
    if(a.rhythmType==='wide-complex tachycardia')r.arrhythmia+=48;
    if(a.afStability==='unstable')r.arrhythmia+=18;
    if(a.afRate==='>150')r.arrhythmia+=18; else if(a.afRate==='110–150')r.arrhythmia+=8; else if(a.afRate==='<110')r.arrhythmia-=5;
    if(a.afTrigger==='hypovolemia')r.hypovolemia+=20;
    if(a.afTrigger==='anesthetic / drug effect')r.vasodilation+=18;
    if(a.afTrigger==='hypoxia / ventilation')r.obstruction+=8;
    if(a.etco2==='yes'){r.obstruction+=32;r.arrhythmia+=10;} if(a.etco2==='no')r.obstruction-=11;
    const last=S.responses[0]?.id;
    if(last==='hr_down_map_low'){r.arrhythmia-=20;r.vasodilation+=18;r.hypovolemia+=12;}
    if(last==='map_hr_improved')r.arrhythmia+=10;
    if(last==='no_change'){r.arrhythmia-=6;r.vasodilation+=8;r.hypovolemia+=8;}
    if(last==='worse'){r.obstruction+=10;r.hypovolemia+=10;r.arrhythmia+=6;}
    Object.keys(r).forEach(k=>r[k]=Math.max(1,Math.min(99,r[k])));
    return r;
  }
  const causeNames={vasodilation:'Vasodilation / anesthetic effect',hypovolemia:'Hemorrhage / hypovolemia',arrhythmia:'Pump failure / arrhythmia',obstruction:'Obstructive cause',anaphylaxis:'Anaphylaxis'};

  function priority(){
    const last=S.responses[0]?.id;
    if(last==='hr_down_map_low')return ['Reassess volume status and vasodilation','HR improved but MAP remains low. AF may be a contributor rather than the sole cause.'];
    if(last==='worse')return ['Escalate immediately and re-check reversible causes','The patient worsened after intervention. Confirm pulse/rhythm, oxygenation, ETCO₂, bleeding and delivery of treatment.'];
    if(last==='map_hr_improved')return ['Continue close monitoring and search for the trigger','The intervention produced a meaningful response; do not stop the diagnostic search.'];
    const top=Object.entries(scores()).sort((a,b)=>b[1]-a[1])[0][0];
    if(top==='arrhythmia')return ['Clarify rhythm and its hemodynamic impact','Treat hypotension in parallel while entering the rhythm-specific branch.'];
    if(top==='hypovolemia')return ['Control volume loss and restore circulation','Look for source, trend and response while continuing stabilization.'];
    if(top==='anaphylaxis')return ['Treat suspected perioperative anaphylaxis urgently','Use the institution crisis protocol and call for additional help.'];
    if(top==='obstruction')return ['Exclude an obstructive cause now','Reassess ventilation, ETCO₂, procedure-related causes and circulation.'];
    return ['Support circulation and reduce reversible vasodilation','Verify the measurement, review anesthetic/drug effects and reassess after every action.'];
  }

  function mentorText(){
    if(S.intervention?.given && !S.responses.length)return 'ทำ intervention แล้ว อย่าเพิ่งจบครับ — response จะบอกเราว่า working diagnosis ถูกทางหรือไม่';
    if(S.answers.rhythmType==='AF' && !S.answers.afStability)return 'พบ AF แล้ว ขั้นต่อไปต้องแยกว่า AF เป็นตัวทำให้ unstable หรือเป็นเพียงสิ่งที่เกิดร่วมกัน';
    const q=nextQuestion();
    if(q)return Q[q].prompt;
    return 'ข้อมูลชุดแรกครบแล้ว เลือก action ที่จะ test/treat แล้วประเมิน response เพื่อเริ่ม reasoning รอบถัดไป';
  }

  function actionCards(){
    const base=[
      ['verify','Verify BP and pulse','Confirm waveform/cuff, trend and perfusion.'],
      ['help','Call for help','Announce instability and assign roles.'],
      ['oxygen','Optimize oxygenation / ventilation','Correct immediately reversible respiratory contributors.'],
      ['review','Review anesthetic depth and recent events','Check drugs, position, stimulation and surgical events.']
    ];
    return base.map(([id,t,d])=>`<button class="mentorAction ${S.actions[id]?'done':''}" data-sm-action="${id}"><b>${t}</b><small>${d}</small></button>`).join('');
  }

  function algorithmHTML(){
    if(S.answers.rhythmType!=='AF')return '';
    const st=S.answers.afStability,rate=S.answers.afRate;
    let actions=[];
    actions.push(['triggers','Treat reversible triggers','Correct hypovolemia, hypoxia/ventilation, metabolic disturbance, pain/stimulation and drug effects.']);
    if(st==='unstable')actions.unshift(['cardioversion','Unstable AF pathway','Prepare synchronized cardioversion according to the local perioperative/ACLS protocol while maintaining resuscitation.']);
    else if(rate==='110–150'||rate==='>150')actions.push(['rate-control','Rate-control pathway','Choose an agent only after considering BP, ventricular function, bronchospasm and local protocol.']);
    actions.push(['support','Continue hemodynamic support','Do not delay treatment of hypotension while clarifying the rhythm.']);
    return `<section class="mentorBlock algorithmBlock"><div class="mentorBlockHead"><span>LINKED ALGORITHM</span><b>Perioperative AF</b></div>
      <div class="mentorSummary">${esc(S.answers.afOnset||'onset not assessed')} · ${esc(st||'stability not assessed')} · rate ${esc(rate||'not assessed')} · trigger ${esc(S.answers.afTrigger||'not assessed')}</div>
      <div class="mentorStack">${actions.map(([id,t,d])=>`<button class="mentorChoice" data-sm-intervention="${id}" data-title="${esc(t)}" data-detail="${esc(d)}"><b>${t}</b><small>${d}</small></button>`).join('')}</div></section>`;
  }

  function interventionHTML(){
    if(!S.intervention)return '';
    return `<section class="mentorBlock interventionBlock"><div class="mentorBlockHead"><span>ACTION TO TEST / TREAT</span><b>${esc(S.intervention.title)}</b></div><p>${esc(S.intervention.detail)}</p>
      <button class="mentorPrimary" data-sm-given>${S.intervention.given?'✓ Given — assess response':'Mark action as completed'}</button></section>`;
  }

  function responseHTML(){
    if(!S.intervention?.given)return '';
    const opts=[
      ['map_hr_improved','MAP and HR improved','Intervention likely addressed an important contributor.'],
      ['hr_down_map_low','HR decreased but MAP remains low','AF may be contributory, but another cause remains active.'],
      ['map_improved_hr_same','MAP improved; HR unchanged','Continue reassessment and investigate persistent tachycardia.'],
      ['no_change','No significant change','Reconsider diagnosis, delivery, adequacy and alternative causes.'],
      ['worse','Worse / increasing instability','Escalate immediately and reassess reversible causes.']
    ];
    return `<section class="mentorBlock responseBlock"><div class="mentorBlockHead"><span>RESPONSE ASSESSMENT</span><b>Reassess now</b></div><div class="mentorQuestion">How is the patient responding?</div><div class="mentorStack">${opts.map(([id,t,d])=>`<button class="mentorChoice" data-sm-response="${id}" data-label="${esc(t)}"><b>${t}</b><small>${d}</small></button>`).join('')}</div></section>`;
  }

  function questionHTML(){
    const id=nextQuestion();
    if(!id)return `<section class="mentorBlock"><div class="mentorBlockHead"><span>NEXT BEST QUESTION</span><b>Core first-pass questions complete</b></div><p class="mentorMuted">Select an action, then use the response to start the next reasoning cycle.</p></section>`;
    const q=Q[id];
    return `<section class="mentorBlock"><div class="mentorBlockHead"><span>NEXT BEST QUESTION</span><b>${esc(q.label)}</b></div><div class="mentorQuestion">${esc(q.prompt)}</div><div class="mentorOptions">${q.options.map(v=>`<button data-sm-answer="${id}" data-value="${esc(v)}">${esc(v)}</button>`).join('')}</div></section>`;
  }

  function rankingHTML(){return Object.entries(scores()).sort((a,b)=>b[1]-a[1]).map(([id,v],i)=>`<div class="mentorRank"><span>${i+1}</span><div><b>${causeNames[id]}</b><div class="mentorBar"><i style="width:${v}%"></i></div></div><strong>${v}</strong></div>`).join('');}
  function answersHTML(){
    const rows=questionSequence().filter(id=>S.answers[id]).map(id=>`<button class="mentorAnswer" data-sm-edit="${id}"><span>${esc(Q[id].label)}</span><b>${esc(S.answers[id])} ›</b></button>`).join('');
    return rows||'<div class="mentorMuted">No answers recorded yet.</div>';
  }
  function timelineHTML(){return S.timeline.map(x=>`<div class="mentorTimeline"><time>${esc(x.time)}</time><span>${esc(x.text)}</span></div>`).join('')||'<div class="mentorMuted">Timeline is created automatically.</div>';}

  function fastReasoningHTML(){
    const p=priority();
    return `<section class="seniorMentor" aria-label="Senior Mentor Mode">
      <div class="mentorTop"><div><span>v0.72 · ACTION–RESPONSE ENGINE</span><h4>Senior Mentor Mode</h4><p>One question → action → response → re-interpretation</p></div><button data-sm-reset>Reset case</button></div>
      <div class="mentorCue"><small>อาจารย์จะพูดว่า</small><b>${esc(mentorText())}</b></div>
      <section class="mentorPriority"><span>CURRENT PRIORITY</span><h4>${esc(p[0])}</h4><p>${esc(p[1])}</p></section>
      <section class="mentorBlock"><div class="mentorBlockHead"><span>DO NOW</span><b>Tap when completed</b></div><div class="mentorActions">${actionCards()}</div></section>
      ${questionHTML()}${algorithmHTML()}${interventionHTML()}${responseHTML()}
      <section class="mentorBlock"><div class="mentorBlockHead"><span>WORKING DIAGNOSIS</span><b>LIVE</b></div>${rankingHTML()}</section>
      <section class="mentorBlock"><div class="mentorBlockHead"><span>ANSWERED / EDITABLE</span><b>Tap to correct</b></div><div class="mentorStack">${answersHTML()}</div></section>
      <section class="mentorBlock"><div class="mentorBlockHead"><span>INTELLIGENT TIMELINE</span><b>${S.timeline.length} events</b></div><div class="mentorTimelineList">${timelineHTML()}</div></section>
    </section>`;
  }

  // Replace only the Hypotension Fast Mode renderer; preserve all v0.71 modules below it.
  window.fastReasoningHTML=fastReasoningHTML;

  function rerender(){save(); if(typeof window.renderHypotension==='function')window.renderHypotension();}
  document.addEventListener('click',function(e){
    let b=e.target.closest('[data-sm-action]');
    if(b){const id=b.dataset.smAction;S.actions[id]=!S.actions[id];log(`${b.textContent.trim()}: ${S.actions[id]?'done':'reopened'}`);rerender();return;}
    b=e.target.closest('[data-sm-answer]');
    if(b){S.answers[b.dataset.smAnswer]=b.dataset.value;log(`${Q[b.dataset.smAnswer].label}: ${b.dataset.value}`);rerender();return;}
    b=e.target.closest('[data-sm-intervention]');
    if(b){S.intervention={id:b.dataset.smIntervention,title:b.dataset.title,detail:b.dataset.detail,given:false};S.responses=[];log(`Action selected: ${S.intervention.title}`);rerender();return;}
    b=e.target.closest('[data-sm-given]');
    if(b&&S.intervention){S.intervention.given=true;log(`Action completed: ${S.intervention.title}`);rerender();return;}
    b=e.target.closest('[data-sm-response]');
    if(b){S.responses.unshift({id:b.dataset.smResponse,label:b.dataset.label,time:stamp()});log(`Response: ${b.dataset.label}`);S.intervention=null;rerender();return;}
    b=e.target.closest('[data-sm-edit]');
    if(b){const id=b.dataset.smEdit,q=Q[id];const value=prompt(`${q.prompt}\n\nChoose exactly one:\n${q.options.join(' | ')}`,S.answers[id]);if(value!==null&&q.options.includes(value)){const old=S.answers[id];S.answers[id]=value;log(`${q.label}: corrected ${old} → ${value}`);rerender();}return;}
    b=e.target.closest('[data-sm-reset]');
    if(b&&confirm('Reset Senior Mentor case?')){S=defaultState();save();rerender();return;}
  },true);

  // The v0.71 renderer has already run before this file loads; refresh it once.
  if(document.getElementById('approachPanel') && typeof window.renderHypotension==='function')window.renderHypotension();
})();
