// Basic state
const ICONS = {
  Barbarian:'assets/class_icons/Barbarian.svg', Bard:'assets/class_icons/Bard.svg', Cleric:'assets/class_icons/Cleric.svg',
  Druid:'assets/class_icons/Druid.svg', Fighter:'assets/class_icons/Fighter.svg', Monk:'assets/class_icons/Monk.svg',
  Paladin:'assets/class_icons/Paladin.svg', Ranger:'assets/class_icons/Ranger.svg', Rogue:'assets/class_icons/Rogue.svg',
  Sorcerer:'assets/class_icons/Sorcerer.svg', Warlock:'assets/class_icons/Warlock.svg', Wizard:'assets/class_icons/Wizard.svg',
};

let state = JSON.parse(localStorage.getItem('tp_dm_lite_v1')||'null') || {
  route:'home',
  party:[
    {id:'p1',name:'Aria',cls:'Rogue',level:1,ac:15,hp:{cur:10,max:10},avatar:ICONS.Rogue},
    {id:'p2',name:'Bronn',cls:'Fighter',level:1,ac:17,hp:{cur:13,max:13},avatar:ICONS.Fighter},
  ],
  npcs:[{id:'n1',name:'Innkeeper',note:'Helpful',avatar:null}],
  encounters:[{id:'enc1',name:'Roadside Ambush', foes:[{name:'Bandit',ac:12,hp:{cur:11,max:11}},{name:'Bandit',ac:12,hp:{cur:11,max:11}}]}],
  initiative:{order:[],round:1,active:0},
  dice:{expr:'d20',last:'—',log:[]},
  notes:'',
  dialog:{activeKind:'npc',activeId:null,log:[],snippets:['Greetings!','Any rumors?','We come in peace.']},
};
let __saveTimer=null;
function save(){ clearTimeout(__saveTimer); __saveTimer=setTimeout(()=>localStorage.setItem('tp_dm_lite_v1', JSON.stringify(state)), 600); }
function nav(route){ state.route=route; save(); render(); setActive(); }
function setActive(){ ['home','initiative','party','npcs','encounters','dice','notes','dialogue','save'].forEach(id=>{ const b=document.getElementById('nav-'+id); if(b) b.classList.toggle('active', state.route===id); }); }
function esc(s){ return (''+s).replace(/[&<>]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[m])); }

// Dice
let diceTimer=null;
function rollExpr(expr){ const m=(expr||'').match(/^(\d+)?d(\d+)([+\-]\d+)?$/i); if(!m) return {ok:false}; const n=+((m[1]||1)),s=+(m[2]),mod=+(m[3]||0); let parts=[],sum=0; for(let i=0;i<n;i++){const r=1+Math.floor(Math.random()*s); parts.push(r); sum+=r;} return {ok:true,total:sum+mod,parts,mod}; }
function rollVisual(expr){ const box=document.getElementById('dice-box'), out=document.getElementById('dice-result'); if(!box) return; let t=0; clearInterval(diceTimer); box.classList.add('roll'); diceTimer=setInterval(()=>{ box.textContent=1+Math.floor(Math.random()*20); t++; if(t>12){ clearInterval(diceTimer); const r=rollExpr(expr); box.textContent=r.ok?r.total:'×'; if(r.ok){ out&&(out.textContent=r.total); state.dice.last=r.total; state.dice.log.unshift({expr,total:r.total,parts:r.parts,mod:r.mod||0, t:Date.now()}); state.dice.log=state.dice.log.slice(0,50); save(); render(); } box.classList.remove('roll'); } }, 50); }

// Party
function addParty(){ state.party.push({id:'p'+Math.random().toString(36).slice(2,7),name:'New Hero',cls:'Rogue',level:1,ac:15,hp:{cur:10,max:10},avatar:ICONS.Rogue}); save(); render(); }
function setClass(pid, cls){ const p=state.party.find(x=>x.id===pid); if(!p) return; p.cls=cls; p.avatar=ICONS[cls]; save(); render(); }
function heal(pid, amt){ const p=state.party.find(x=>x.id===pid); if(!p) return; p.hp.cur = Math.min(p.hp.max, p.hp.cur + amt); save(); render(); }
function harm(pid, amt){ const p=state.party.find(x=>x.id===pid); if(!p) return; p.hp.cur = Math.max(0, p.hp.cur - amt); save(); render(); }

// Initiative tracker
function buildInitiativeList(){
  const foes = (state.encounters[0]?.foes||[]).map((f,i)=>({id:'f'+i,name:f.name,kind:'foe'}));
  const npcs = state.npcs.map(n=>({id:n.id,name:n.name,kind:'npc'}));
  const pcs  = state.party.map(p=>({id:p.id,name:p.name,kind:'pc'}));
  const mix = [...pcs,...npcs,...foes].map(x=>({...x,roll:1+Math.floor(Math.random()*20)}));
  mix.sort((a,b)=>b.roll-a.roll);
  state.initiative.order = mix;
  state.initiative.round = 1;
  state.initiative.active = 0;
  save(); render();
}
function nextTurn(){ if(!state.initiative.order.length) return; state.initiative.active = (state.initiative.active+1)%state.initiative.order.length; if(state.initiative.active===0) state.initiative.round++; save(); render(); }
function prevTurn(){ if(!state.initiative.order.length) return; state.initiative.active = (state.initiative.active-1+state.initiative.order.length)%state.initiative.order.length; save(); render(); }

// NPCs
function addNPC(){ state.npcs.push({id:'n'+Math.random().toString(36).slice(2,7),name:'New NPC',note:'',avatar:null}); save(); render(); }
function setNPCPortrait(id, files){ const n=state.npcs.find(x=>x.id===id); if(!n) return; const f=files[0]; if(!f) return; const r=new FileReader(); r.onload=e=>{ n.avatar=e.target.result; save(); render(); }; r.readAsDataURL(f); }

// Encounters
function addEncounter(){ state.encounters.push({id:'enc'+Math.random().toString(36).slice(2,7),name:'New Encounter',foes:[]}); save(); render(); }
function addFoe(encId){ const enc=state.encounters.find(e=>e.id===encId); if(!enc) return; enc.foes.push({name:'Goblin',ac:13,hp:{cur:7,max:7}}); save(); render(); }
function harmFoe(encId, idx, amt){ const f=state.encounters.find(e=>e.id===encId)?.foes[idx]; if(!f) return; f.hp.cur=Math.max(0,f.hp.cur-amt); save(); render(); }
function healFoe(encId, idx, amt){ const f=state.encounters.find(e=>e.id===encId)?.foes[idx]; if(!f) return; f.hp.cur=Math.min(f.hp.max,f.hp.cur+amt); save(); render(); }

// Dialogue
function allEntities(){ return { pcs: state.party.map(p=>({id:p.id,name:p.name,kind:'pc',avatar:p.avatar})), npcs: state.npcs.map(n=>({id:n.id,name:n.name,kind:'npc',avatar:n.avatar})) }; }
function sayLine(text, who){ if(!text.trim()) return; state.dialog.log.push({who,text, t:Date.now()}); if(state.dialog.log.length>200) state.dialog.log.shift(); save(); render(); }

// Views
function Home(){
  return `<div class="panel"><h2>Dashboard</h2>
  <div class="grid-3">
    <div class="panel"><h3>Quick Actions</h3>
      <button class="btn" onclick="nav('initiative')">Roll Initiative</button>
      <button class="btn" onclick="nav('encounters')">Build Encounter</button>
      <button class="btn" onclick="nav('dialogue')">Open Dialogue</button>
    </div>
    <div class="panel"><h3>Last Roll</h3><div class="dice" id="dice-box">—</div><div class="small" style="margin-top:6px">Result: <b id="dice-result">${state.dice.last}</b></div>
      <div style="margin-top:6px"><input id="dice-expr" value="${esc(state.dice.expr)}" style="width:100px"/> <button class="btn active" onclick="rollVisual(document.getElementById('dice-expr').value)">Roll</button></div>
    </div>
    <div class="panel"><h3>Notes</h3><textarea style="width:100%;height:120px" oninput="state.notes=this.value; save();">${esc(state.notes)}</textarea></div>
  </div></div>`;
}

function Party(){
  return `<div class="panel"><h2>Party</h2>
  <div class="list">
    ${state.party.map(p=>`<div class="item">
      <div style="display:flex;align-items:center;gap:8px">
        <div class="token"><img src="${esc(p.avatar)}" onerror="this.onerror=null;this.src='${ICONS[p.cls]}'"/></div>
        <div><div style="font-weight:600">${esc(p.name)}</div><div class="small">${esc(p.cls)} • L${p.level} • AC ${p.ac}</div></div>
      </div>
      <div class="small">HP ${p.hp.cur}/${p.hp.max}</div>
      <div>
        <button class="btn" onclick="harm('${p.id}',1)">-1</button>
        <button class="btn" onclick="heal('${p.id}',1)">+1</button>
        <select onchange="setClass('${p.id}', this.value)">
          ${Object.keys(ICONS).map(c=>`<option ${p.cls===c?'selected':''}>${c}</option>`).join('')}
        </select>
      </div>
    </div>`).join('')}
    <button class="btn" onclick="addParty()">+ Add Party Member</button>
  </div></div>`;
}

function NPCs(){
  return `<div class="panel"><h2>NPCs</h2>
    <div class="list">
      ${state.npcs.map(n=>`<div class="item">
        <div style="display:flex;align-items:center;gap:8px">
          ${n.avatar? `<div class="token"><img src="${esc(n.avatar)}"/></div>` : '<div class="token"></div>'}
          <div><div style="font-weight:600">${esc(n.name)}</div><div class="small">${esc(n.note||'')}</div></div>
        </div>
        <div class="small">
          <label class="btn"><input type="file" accept="image/*" style="display:none" onchange="setNPCPortrait('${n.id}', this.files)">Upload Portrait</label>
        </div>
      </div>`).join('')}
      <button class="btn" onclick="addNPC()">+ Add NPC</button>
    </div>
  </div>`;
}

function Encounters(){
  return `<div class="panel"><h2>Encounters</h2>
    <div class="list">
      ${state.encounters.map(enc=>`<div class="item">
        <div><div style="font-weight:600">${esc(enc.name)}</div><div class="small">${enc.foes.length} foes</div></div>
        <div>
          <button class="btn" onclick="addFoe('${enc.id}')">+ Add Foe</button>
        </div>
      </div>
      <div class="panel">
        ${enc.foes.map((f,i)=>`<div class="item">
          <div>${esc(f.name)} • AC ${f.ac} • HP ${f.hp.cur}/${f.hp.max}</div>
          <div>
            <button class="btn" onclick="harmFoe('${enc.id}',${i},1)">-1</button>
            <button class="btn" onclick="healFoe('${enc.id}',${i},1)">+1</button>
          </div>
        </div>`).join('') || '<div class="small">No foes yet.</div>'}
      </div>`).join('')}
      <button class="btn" onclick="addEncounter()">+ New Encounter</button>
    </div>
  </div>`;
}

function Initiative(){
  const o=state.initiative;
  return `<div class="panel"><h2>Initiative</h2>
    <div class="small">Click "Build Order" to roll 1d20 for all PCs, NPCs, and the first encounter's foes.</div>
    <div style="margin:8px 0">
      <button class="btn" onclick="buildInitiativeList()">Build Order (1d20 all)</button>
      <button class="btn" onclick="prevTurn()">Prev</button>
      <button class="btn active" onclick="nextTurn()">Next</button>
      <span class="small">Round ${o.round}</span>
    </div>
    <div class="list">
      ${o.order.map((x,i)=>`<div class="item" style="${i===o.active?'box-shadow:0 0 0 2px var(--accent) inset':''}">
        <div>${i+1}. ${esc(x.name)} <span class="small">(${x.kind})</span></div>
        <div class="small">Init: ${x.roll}</div>
      </div>`).join('') || '<div class="small">No initiative yet.</div>'}
    </div>
  </div>`;
}

function Dice(){
  return `<div class="panel"><h2>Dice Roller</h2>
    <div style="display:flex;gap:12px;align-items:center">
      <div id="dice-box" class="dice">—</div>
      <div>
        <div class="small">Common dice:</div>
        ${['d20','d12','d10','d8','d6','d4'].map(d=>`<button class="btn" onclick="document.getElementById('dice-expr').value='${d}'; this.classList.add('active'); setTimeout(()=>this.classList.remove('active'),200)">${d}</button>`).join(' ')}
        <div style="margin-top:8px">
          <input id="dice-expr" value="${esc(state.dice.expr)}" placeholder="2d6+3" style="width:120px"/>
          <button class="btn active" onclick="rollVisual(document.getElementById('dice-expr').value)">Roll</button>
          <span class="small">Result: <b id="dice-result">${state.dice.last}</b></span>
        </div>
      </div>
    </div>
    <div class="panel" style="margin-top:10px;background:#0f1115"><div class="small"><b>Log</b></div>
      <div class="small">${state.dice.log.map(l=>`[${new Date(l.t).toLocaleTimeString()}] ${esc(l.expr)} → <b>${l.total}</b> [${l.parts.join(', ')}${l.mod? (l.mod>0? ' + '+l.mod : ' - '+Math.abs(l.mod)) : ''}]`).join('<br/>')||'No rolls yet.'}</div>
    </div>
  </div>`;
}

function Notes(){
  return `<div class="panel"><h2>Notes</h2>
    <textarea style="width:100%;height:300px" oninput="state.notes=this.value; save();">${esc(state.notes)}</textarea>
  </div>`;
}

function Dialogue(){
  const ents = allEntities();
  return `<div class="panel"><h2>Dialogue</h2>
    <div class="grid-2">
      <div class="panel">
        <h3>Speak</h3>
        <div class="small">Choose a speaker:</div>
        <div style="margin:6px 0">
          ${ents.pcs.map(p=>`<button class="btn" onclick="sayLine(prompt('What does ${p.name} say?')||'', {name:'${p.name}',kind:'PC',avatar:'${p.avatar}'})">${p.name}</button>`).join(' ')}
          ${ents.npcs.map(n=>`<button class="btn" onclick="sayLine(prompt('What does ${n.name} say?')||'', {name:'${n.name}',kind:'NPC',avatar:'${n.avatar||''}'})">${n.name}</button>`).join(' ')}
        </div>
        <div class="small">Snippets:</div>
        <div style="margin:6px 0">
          ${state.dialog.snippets.map((s,i)=>`<button class="btn" onclick="sayLine('${s.replace(/'/g,\"\\'\")}', {name:'DM',kind:'DM',avatar:''})">${s}</button>`).join(' ')}
        </div>
      </div>
      <div class="panel">
        <h3>Log</h3>
        <div class="chat">
          ${state.dialog.log.map(m=>`<div class="msg">
            <div class="who">${m.who.avatar? `<img src="${m.who.avatar}" style="width:48px;height:48px;object-fit:contain"/>` : ''}</div>
            <div class="bubble"><div class="small" style="opacity:.8">${m.who.name} (${m.who.kind})</div><div>${m.text}</div></div>
          </div>`).join('') || '<div class="small">No dialogue yet.</div>'}
        </div>
        <div style="text-align:right;margin-top:6px"><button class="btn" onclick="if(confirm('Clear dialogue?')){ state.dialog.log=[]; save(); render(); }">Clear</button></div>
      </div>
    </div>
  </div>`;
}

function SavePanel(){
  return `<div class="panel"><h2>Save / Export</h2>
    <button class="btn" onclick="const data=JSON.stringify(state,null,2); const blob=new Blob([data],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='tp-dm-lite-session.json'; a.click();">Export (.json)</button>
    <label class="btn"><input type="file" accept="application/json" style="display:none" onchange="const r=new FileReader(); r.onload=e=>{ try{ state=JSON.parse(e.target.result); save(); render(); }catch(err){ alert('Invalid JSON'); } }; r.readAsText(this.files[0]);">Import</label>
    <button class="btn" onclick="if(confirm('Reset all data?')){ localStorage.removeItem('tp_dm_lite_v1'); location.reload(); }">Reset</button>
  </div>`;
}

function routeView(){
  switch(state.route){
    case 'home': return Home();
    case 'initiative': return Initiative();
    case 'party': return Party();
    case 'npcs': return NPCs();
    case 'encounters': return Encounters();
    case 'dice': return Dice();
    case 'notes': return Notes();
    case 'dialogue': return Dialogue();
    case 'save': return SavePanel();
    default: return Home();
  }
}
function render(){ document.getElementById('app').innerHTML = routeView(); }
render(); setActive();
