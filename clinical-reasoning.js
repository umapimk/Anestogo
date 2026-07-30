(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  root.AnesthReasoning=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const HYPOTENSION_MODEL={
    id:'hypotension-v071',
    version:'0.71.0',
    diagnoses:[
      {id:'hypovolemia',label:'Hypovolemia / hemorrhage',base:1,actions:['Check surgical field and concealed loss','Assess preload/fluid responsiveness','Prepare blood products when indicated']},
      {id:'vasodilation',label:'Vasodilation / low SVR',base:1,actions:['Review anesthetic depth and recent drugs','Consider neuraxial sympathectomy or vasoplegia','Use physiology-directed vasopressor per local protocol']},
      {id:'anaphylaxis',label:'Perioperative anaphylaxis',base:0.5,actions:['Stop suspected trigger and call for help','Treat immediately per approved anaphylaxis protocol','Reassess airway pressure, skin and perfusion']},
      {id:'pump-failure',label:'Pump failure / ischemia',base:0.5,actions:['Check ECG and rhythm','Use focused cardiac ultrasound when available','Support contractility according to physiology']},
      {id:'obstruction',label:'Obstructive physiology',base:0.3,actions:['Review ETCO₂, SpO₂ and airway pressure trend','Consider tension pneumothorax, embolism or tamponade','Correct reversible cause urgently']},
      {id:'arrhythmia',label:'Rate / rhythm problem',base:0.4,actions:['Confirm rhythm and pulse','Assess hemodynamic instability','Treat rhythm-specific reversible causes']},
      {id:'measurement',label:'Measurement / delivery error',base:0.7,actions:['Repeat NIBP or verify arterial waveform/level','Check IV patency and drug delivery','Correlate with pulse and perfusion']}
    ],
    clues:[
      {id:'bleeding',label:'Bleeding / low preload',weights:{hypovolemia:5,vasodilation:-1,measurement:-1}},
      {id:'recent-drug',label:'Recent drug / antibiotic',weights:{anaphylaxis:4,vasodilation:2}},
      {id:'rash-wheeze',label:'Rash, wheeze or high airway pressure',weights:{anaphylaxis:6,obstruction:1}},
      {id:'ecg-change',label:'ECG change / poor contractility',weights:{'pump-failure':5,arrhythmia:2}},
      {id:'irregular-rhythm',label:'AF / irregular or extreme rate',weights:{arrhythmia:6,'pump-failure':1}},
      {id:'etco2-drop',label:'Sudden ETCO₂ drop / desaturation',weights:{obstruction:5,'pump-failure':2,hypovolemia:1}},
      {id:'ppv-high',label:'High PPV / preload responsive pattern',weights:{hypovolemia:4,vasodilation:-1}},
      {id:'dbp-low',label:'Disproportionately low DBP',weights:{vasodilation:4,anaphylaxis:2}},
      {id:'poor-signal',label:'Monitor or IV reliability concern',weights:{measurement:6}}
    ]
  };

  function clamp(n,min,max){return Math.max(min,Math.min(max,n));}
  function confidenceFromScore(score){return clamp(Math.round(35+score*8),5,95);}

  function evaluate(model,observations){
    const selected=new Set(observations?.clues||[]);
    const scores={};
    model.diagnoses.forEach(d=>scores[d.id]=d.base||0);
    model.clues.forEach(c=>{
      if(!selected.has(c.id)) return;
      Object.entries(c.weights||{}).forEach(([id,w])=>{scores[id]=(scores[id]||0)+w;});
    });
    const ranked=model.diagnoses.map(d=>({...d,score:Number((scores[d.id]||0).toFixed(1)),confidence:confidenceFromScore(scores[d.id]||0)}))
      .sort((a,b)=>b.score-a.score);
    const unanswered=model.clues.filter(c=>!selected.has(c.id));
    let nextQuestion=null,bestGain=-Infinity;
    unanswered.forEach(c=>{
      const vals=Object.values(c.weights||{}).map(Math.abs);
      const gain=(vals.length?Math.max(...vals):0)+(vals.reduce((a,b)=>a+b,0)/10);
      if(gain>bestGain){bestGain=gain;nextQuestion=c;}
    });
    return {
      modelId:model.id,
      generatedAt:new Date().toISOString(),
      observations:{clues:[...selected]},
      ranked,
      top:ranked[0]||null,
      nextQuestion,
      immediateActions:[
        'Verify the blood pressure and correlate with pulse/perfusion',
        'Call for help and stabilize airway, oxygenation and circulation in parallel',
        ...(ranked[0]?.actions||[])
      ].slice(0,5)
    };
  }

  function createCase(overrides={}){
    return {
      id:overrides.id||('case-'+Date.now()),
      createdAt:new Date().toISOString(),
      patientProfile:overrides.patientProfile||{},
      procedureContext:overrides.procedureContext||{},
      timeline:[],
      observations:{clues:[]},
      actions:[]
    };
  }

  function recordAction(caseData,action,response){
    const item={id:'event-'+Date.now(),time:new Date().toISOString(),action,response:response||null};
    caseData.actions.push(item);
    caseData.timeline.push({type:'action-response',...item});
    return caseData;
  }

  return {HYPOTENSION_MODEL,evaluate,createCase,recordAction};
});
