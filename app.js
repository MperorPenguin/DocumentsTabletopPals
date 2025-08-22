// ---------- Icons ----------
const ICONS = {
  Barbarian:'assets/class_icons/Barbarian.svg', Bard:'assets/class_icons/Bard.svg', Cleric:'assets/class_icons/Cleric.svg',
  Druid:'assets/class_icons/Druid.svg', Fighter:'assets/class_icons/Fighter.svg', Monk:'assets/class_icons/Monk.svg',
  Paladin:'assets/class_icons/Paladin.svg', Ranger:'assets/class_icons/Ranger.svg', Rogue:'assets/class_icons/Rogue.svg',
  Sorcerer:'assets/class_icons/Sorcerer.svg', Warlock:'assets/class_icons/Warlock.svg', Wizard:'assets/class_icons/Wizard.svg',
};
const CLASS_COLORS = {
  Barbarian:'#f97316', Bard:'#22c55e', Cleric:'#eab308', Druid:'#84cc16', Fighter:'#60a5fa', Monk:'#14b8a6',
  Paladin:'#f59e0b', Ranger:'#10b981', Rogue:'#a1a1aa', Sorcerer:'#e879f9', Warlock:'#8b5cf6', Wizard:'#a78bfa'
};
function dataIcon(label, color){
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'>
    <rect rx='8' width='64' height='64' fill='#111623'/>
    <circle cx='32' cy='32' r='22' fill='${color}'/>
    <text x='32' y='40' font-family='Segoe UI,Roboto,Arial' font-size='28' text-anchor='middle' fill='#0f1115' font-weight='700'>${label}</text>
  </svg>`;
  return 'data:image/svg+xml;utf8,'+encodeURIComponent(svg);
}
function classFallback(cls){ return dataIcon((cls?.[0]||'?').toUpperCase(), CLASS_COLORS[cls]||'#94a3b8'); }
function iconSrc(obj){ return obj.avatar || (obj.cls && ICONS[obj.cls]) || classFallback(obj.cls); }

// Traits inference so A/D chips don’t go blank
const CLASS_TRAITS = {
  Rogue:   { armor:'light', wants:['stealth','ranged'],  modes:['walk'] },
  Ranger:  { armor:'medium',wants:['ranged','stealth'],  modes:['walk'] },
  Fighter: { armor:'heavy', wants:['melee'],             modes:['walk'] },
  Barbarian:{armor:'medium',wants:['melee'],             modes:['walk'] },
  Monk:    { armor:'none',   wants:['melee'],            modes:['walk'] },
  Wizard:  { armor:'none',   wants:['ranged'],           modes:['walk'] },
  Sorcerer:{ armor:'none',   wants:['ranged'],           modes:['walk'] },
  Warlock: { armor:'light',  wants:['ranged'],           modes:['walk'] },
  Cleric:  { armor:'medium', wants:['melee'],            modes:['walk'] },
  Paladin: { armor:'heavy',  wants:['melee'],            modes:['walk'] },
  Druid:   { armor:'light',  wants:['stealth'],          modes:['walk','swim'] },
};

// SRD-ish static data (for future builder extension)
const SRD = {
  classes: Object.keys(ICONS),
  races: ['Human','Elf','Dwarf','Halfling','Gnome','Half-Orc','Tiefling','Dragonborn'],
  backgrounds: ['Acolyte','Criminal','Folk Hero','Noble','Outlander','Sage','Soldier','Urchin'],
  alignments: ['LG','NG','CG','LN','N','CN','LE','NE','CE'],
};

// Terrain rules with “why”
const TERRAIN = {
  Forest: {
    tips:['Undergrowth (difficult)','Cover available'],
    adv:[{want:'stealth', why:'Brush and shadows aid stealth.'},{tag:'beast', why:'Native beasts thrive here.'}],
    dis:[{armor:'heavy', why:'Heavy armor snags on undergrowth.'}]
  },
  Swamp: {
    tips:['Mud & water (difficult)'],
    adv:[{mode:'swim', why:'Swimming speed bypasses boggy ground.'}],
    dis:[{armor:'heavy', why:'Heavy armor sinks and clogs.'},{want:'stealth', why:'Ripples and mud prints betray you.'}]
  },
  Desert: {
    tips:['Heat & mirage','Open sightlines'],
    adv:[{want:'ranged', why:'Open terrain favors ranged combatants.'}],
    dis:[{want:'stealth', why:'Few places to hide in open sands.'}]
  },
  Mountain: {
    tips:['Steep slopes','High winds'],
    adv:[{mode:'fly', why:'Flight bypasses treacherous climbs.'}],
    dis:[{armor:'heavy', why:'Heavy armor hinders climbing and balance.'}]
  },
  Urban: {
    tips:['Tight alleys','Guards nearby'],
    adv:[{want:'stealth', why:'Corners/crowds create hiding spots.'}],
    dis:[]
  },
  Dungeon: {
    tips:['Tight corridors','Darkness common'],
    adv:[{want:'darkvision', why:'Darkvision is valuable here.'}],
    dis:[{armor:'heavy', why:'Heavy armor is clumsy in tight spaces.'}]
  },
  Arctic: {
    tips:['Ice & snow','Extreme cold'],
    adv:[{mode:'walk', why:'Sure‑footed creatures handle ice.'}],
    dis:[{armor:'heavy', why:'Cold seeps through metal; movement suffers.'}]
  },
  Coastal: {
    tips:['Slippery rocks'],
    adv:[{mode:'swim', why:'Aquatic movement is a big edge.'}],
    dis:[{armor:'heavy', why:'Slick rocks + heavy armor = slips.'}]
  },
};

// ---------- App state ----------
let state = JSON.parse(localStorage.getItem('tp_dm_lite_v2_1')||'null') || {
  route:'home', terrain:'Forest',
  players:[
    {id:'p1',name:'Aria',cls:'Rogue',race:'Human',bg:'Urchin',align:'CG',level:1,ac:15,abilities:{Str:10,Dex:15,Con:12,Int:12,Wis:11,Cha:10},skills:['Stealth (Dex)'],hp:{cur:10,max:10},pp:13,token:{x:2,y:3},avatar:ICONS.Rogue,tags:{armor:'light',modes:['walk'],wants:['stealth','ranged']}},
    {id:'p2',name:'Bronn',cls:'Fighter',race:'Human',bg:'Soldier',align:'LN',level:1,ac:17,abilities:{Str:16,Dex:12,Con:14,Int:10,Wis:10,Cha:10},skills:['Athletics (Str)'],hp:{cur:13,max:13},pp:11,token:{x:4,y:4},avatar:ICONS.Fighter,tags:{armor:'heavy',modes:['walk'],wants:['melee']}},
  ],
  npcs:[{id:'n1',name:'Elder Bran',role:'Quest Giver',token:{x:8,y:6},avatar:null}],
  enemies:[{id:'e1',name:'Skeleton A',ac:13,hp:{cur:13,max:13},token:{x:10,y:6},avatar:ICONS.Wizard, type:'undead'}],
  map:{w:24,h:18,size:48,bg:null},
  dice:{expr:'d20',last:'—',log:[], builder:{terms:{}, mod:0}},
  library:[],
  notes:'',
  selectedToken:null,
  ui:{ terrainFocus:null, dmMin:false, focusEntity:null, noteText:'' }
};

// ---------- Utils ----------
let __saveTimer=null;
function save(){ clearTimeout(__saveTimer); __saveTimer=setTimeout(()=>{ try{ localStorage.setItem('tp_dm_lite_v2_1', JSON.stringify(state)); }catch(e){} }, 300); }
function nav(route){ state.route=route; save(); render(); setActive(); }
function setActive(){ ['home','board','chars','npcs','enemies','dice','dialogue','notes','save'].forEach(id=>{ const b=document.getElementById('nav-'+id); if(b) b.classList.toggle('active', state.route===id); }); }
function esc(s){ return (''+s).replace(/[&<>]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[m])); }

// ---------- Dice ----------
let diceTimer=null;
function parseAny(expr){
  const tokens = (expr||'').replace(/\s+/g,'').match(/(\d*d\d+|\+|-|\d+)/gi);
  if(!tokens) return null;
  let total=0, parts=[], mod=0, sign=+1;
  for(const t of tokens){
    if(t==='+'){ sign=+1; continue; }
    if(t==='-'){ sign=-1; continue; }
    const m=t.match(/^(\d*)d(\d+)$/i);
    if(m){
      const cnt=+(m[1]||1), sides=+m[2];
      for(let j=0;j<cnt;j++){ const r=1+Math.floor(Math.random()*sides); parts.push(r); total+=sign*r; }
    }else{ const val=+t; mod+=sign*val; total+=sign*val; }
  }
  return {total, parts, mod};
}
function rollVisual(expr){
  const box=document.getElementById('dice-box'), out=document.getElementById('dice-result');
  if(!box) return;
  let t=0; clearInterval(diceTimer);
  box.classList.add('roll');
  diceTimer=setInterval(()=>{
    box.textContent=1+Math.floor(Math.random()*20); t++;
    if(t>12){
      clearInterval(diceTimer);
      const r = parseAny(document.getElementById('dice-expr')?.value || expr || state.dice.expr);
      if(r){
        box.textContent=r.total; if(out) out.textContent=r.total;
        state.dice.last=r.total;
        const exprNow = document.getElementById('dice-expr')?.value || state.dice.expr;
        state.dice.log.unshift({expr:exprNow,total:r.total,parts:r.parts,mod:r.mod,t:Date.now()});
        state.dice.log = state.dice.log.slice(0,50);
        save(); render();
      } else box.textContent='×';
      box.classList.remove('roll');
    }
  }, 50);
}
function ensureBuilder(){ if(!state.dice) state.dice = {expr:'d20',last:'—',log:[], builder:{terms:{},mod:0}}; if(!state.dice.builder) state.dice.builder={terms:{},mod:0}; }
function rebuildExprFromBuilder(){
  ensureBuilder();
  const parts=[];
  Object.entries(state.dice.builder.terms).forEach(([sides,count])=>{ if(count>0) parts.push(`${count}d${sides}`); });
  if(state.dice.builder.mod){ parts.push((state.dice.builder.mod>0?'+':'')+state.dice.builder.mod); }
  state.dice.expr = parts.join('+') || 'd20'; save();
}
function addDie(s){ ensureBuilder(); const k=String(s); state.dice.builder.terms[k]=(state.dice.builder.terms[k]||0)+1; rebuildExprFromBuilder(); renderDice(); }
function decDie(s){ ensureBuilder(); const k=String(s); state.dice.builder.terms[k]=Math.max(0,(state.dice.builder.terms[k]||0)-1); rebuildExprFromBuilder(); renderDice(); }
function addMod(v){ ensureBuilder(); state.dice.builder.mod=(state.dice.builder.mod||0)+v; rebuildExprFromBuilder(); renderDice(); }
function clearBuilder(){ state.dice.builder={terms:{},mod:0}; rebuildExprFromBuilder(); renderDice(); }
function renderDiceBreakdownPreview(){ const e=state.dice.expr||''; return esc(e.replace(/\+/g,' + ')); }

// ---------- Board ----------
function gridSize(){ return state.map.size; }
function tokenEl(kind,id){ return document.querySelector(`.board .token[data-kind="${kind}"][data-id="${id}"]`); }
function selectTokenDom(kind,id){ document.querySelectorAll('.board .token.selected').forEach(n=>n.classList.remove('selected')); const el=tokenEl(kind,id); if(el) el.classList.add('selected'); }
function moveTokenDom(kind,id,x,y){ const el=tokenEl(kind,id); if(el){ const size=gridSize(); el.style.left=(x*size+2)+'px'; el.style.top=(y*size+2)+'px'; } }
function renderBoard(){
  const board=document.querySelector('.board'); if(!board) return;
  board.style.backgroundImage = state.map.bg ? `url('${state.map.bg}')` : 'linear-gradient(180deg,#1b2436,#0f1524)';
  board.querySelectorAll('.token').forEach(n=>n.remove());
  const size=gridSize();
  const all=[...state.players.map(p=>({...p,kind:'pc'})), ...state.npcs.map(n=>({...n,kind:'npc'})), ...state.enemies.map(e=>({...e,kind:'enemy'}))];
  all.forEach(obj=>{
    const d=document.createElement('div'); d.className='token '+obj.kind; d.dataset.id=obj.id; d.dataset.kind=obj.kind;
    if(state.selectedToken && state.selectedToken.id===obj.id && state.selectedToken.kind===obj.kind) d.classList.add('selected');
    d.style.left=(obj.token.x*size+2)+'px'; d.style.top=(obj.token.y*size+2)+'px';
    const img=document.createElement('img'); img.loading="lazy";
    img.src = iconSrc(obj);
    img.onerror = ()=>{ img.onerror=null; img.src=classFallback(obj.cls); };
    d.appendChild(img);
    d.title = obj.name;
    d.onclick = (ev)=>{ ev.stopPropagation(); state.selectedToken={id:obj.id,kind:obj.kind}; save(); selectTokenDom(obj.kind,obj.id); };
    board.appendChild(d);
  });
}
function boardClick(e){
  const board=e.currentTarget, rect=board.getBoundingClientRect(), size=gridSize();
  if(!state.selectedToken) return;
  const gx=Math.max(0,Math.min(state.map.w-1,Math.floor((e.clientX-rect.left)/size)));
  const gy=Math.max(0,Math.min(state.map.h-1,Math.floor((e.clientY-rect.top)/size)));
  const list = state.selectedToken.kind==='pc'?state.players:state.selectedToken.kind==='npc'?state.npcs:state.enemies;
  const obj = list.find(o=>o.id===state.selectedToken.id); if(!obj) return;
  obj.token.x=gx; obj.token.y=gy; moveTokenDom(state.selectedToken.kind,state.selectedToken.id,gx,gy); save();
}

// Upload scene/library
function handleUpload(files, type, after){
  [...files].forEach(file=>{
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = ()=>{
        const maxW=1280, scale=Math.min(1, maxW/img.width);
        const w=Math.round(img.width*scale), h=Math.round(img.height*scale);
        const canvas=document.createElement('canvas'); canvas.width=w; canvas.height=h;
        const ctx=canvas.getContext('2d'); ctx.drawImage(img,0,0,w,h);
        canvas.toBlob(blob=>{
          const fr=new FileReader(); fr.onload=e2=>{
            const id='img'+Math.random().toString(36).slice(2,7);
            state.library.push({id,type,name:file.name,dataUrl:e2.target.result});
            save(); render();
            if(typeof after==='function'){ after(id); }
          }; fr.readAsDataURL(blob);
        }, 'image/webp', 0.85);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });
}
function uploadSceneAndSetBg(files){ handleUpload(files,'scene',(id)=>useAsScene(id)); }
function useAsScene(id){ const it=state.library.find(x=>x.id===id); if(!it) return; state.map.bg=it.dataUrl; save(); nav('board'); }

// ---------- Terrain helpers ----------
function inferTags(obj){
  const inferred = CLASS_TRAITS[obj.cls] || {};
  const t = {...inferred, ...(obj.tags||{})};
  t.wants = Array.from(new Set([...(inferred.wants||[]), ...((obj.tags&&obj.tags.wants)||[])]));
  t.modes = Array.from(new Set([...(inferred.modes||[]), ...((obj.tags&&obj.tags.modes)||[])]));
  return t;
}
function terrainMatches(obj, q){
  const tags = inferTags(obj);
  if(q.armor && tags.armor === q.armor) return true;
  if(q.mode && (tags.modes||[]).includes(q.mode)) return true;
  if(q.want && (tags.wants||[]).includes(q.want)) return true;
  if(q.tag && (obj.type === q.tag || tags.type === q.tag)) return true;
  if(q.cls && obj.cls === q.cls) return true;
  return false;
}
function terrainFocusForEntity(entity){
  const cfg = TERRAIN[state.terrain] || {tips:[],adv:[],dis:[]};
  const res = { adv:[], dis:[] };
  if(!entity) return res;
  (cfg.adv||[]).forEach(q => { if(terrainMatches(entity,q)) res.adv.push(q); });
  (cfg.dis||[]).forEach(q => { if(terrainMatches(entity,q)) res.dis.push(q); });
  return res;
}

// ---------- DM Panel minimize / restore ----------
function minimizeDmPanel(){ state.ui.dmMin = true; save(); renderDmPanel(); renderDmFab(); }
function restoreDmPanel(){ state.ui.dmMin = false; save(); renderDmPanel(); renderDmFab(); }
window.minimizeDmPanel = minimizeDmPanel;
window.restoreDmPanel  = restoreDmPanel;

function renderDmFab(){
  let fab = document.getElementById('dm-fab');
  if(!fab){
    fab = document.createElement('button');
    fab.id = 'dm-fab';
    fab.className = 'dm-fab btn hidden';
    fab.type = 'button';
    document.body.appendChild(fab);
  }
  if(state.route !== 'board' || !state.ui.dmMin){
    fab.classList.add('hidden'); return;
  }
  const hints = (TERRAIN[state.terrain]?.tips?.length || 0);
  fab.innerHTML = `<span class="dm-fab-dot"></span><span class="dm-fab-label">DM Panel</span><span class="dm-fab-count">${hints}</span>`;
  fab.onclick = window.restoreDmPanel;
  fab.classList.remove('hidden');
}
window.renderDmFab = renderDmFab;

// ---------- Build one 3×3 “cell” (card + advantages + disadvantages) ----------
function buildCell(obj, kind){
  const selected = state.selectedToken && state.selectedToken.id===obj.id && state.selectedToken.kind===kind;
  const onSelect = `state.selectedToken={id:'${obj.id}',kind:'${kind}'}; state.ui.focusEntity={id:'${obj.id}',kind:'${kind}'}; save(); render();`;

  const F = terrainFocusForEntity(obj);
  const chip = (a, cls) => {
    const label = a.want ? (cls==='adv' ? `Favor: ${a.want}` : `Weak: ${a.want}`) :
                  a.mode ? `Mode: ${a.mode}` :
                  a.tag  ? `Tag: ${a.tag}`  :
                  a.armor? `Armor: ${a.armor}` :
                           (cls==='adv'?'Advantage':'Disadvantage');
    const why = esc(a.why || (cls==='adv'?'Advantage in this terrain.':'Disadvantage in this terrain.'));
    return `<span class="dm-chip ${cls}" title="${why}"
             onclick="event.stopPropagation(); state.ui.noteText='${why}'; save(); renderDmPanel();">${label}</span>`;
  };
  const advChips = (F.adv.length ? F.adv.map(a=>chip(a,'adv')).join(' ') : `<span class="dm-chip adv" style="opacity:.65;cursor:default">—</span>`);
  const disChips = (F.dis.length ? F.dis.map(a=>chip(a,'dis')).join(' ') : `<span class="dm-chip dis" style="opacity:.65;cursor:default">—</span>`);

  return `
  <div class="dm-cell">
    <div class="dm-card ${selected?'selected':''}" onclick="(function(){ ${onSelect} })()">
      <div class="name">${esc(obj.name || obj.role || 'Unknown')}</div>
      <div class="avatar"><img width="40" height="40" src="${iconSrc(obj)}"
        onerror="this.onerror=null; this.src='${classFallback(obj.cls)}'"/></div>
      <div class="badges">
        <span class="badge">${kind==='pc' ? 'Lvl '+(obj.level||1) : (kind==='enemy' ? ('AC '+(obj.ac??'—')) : (obj.role||'NPC'))}</span>
        <span class="badge">HP ${(obj.hp?.cur??'—')}/${(obj.hp?.max??'—')}</span>
      </div>
      <div class="actions" style="margin-top:4px">
        <button class="btn tiny" onclick="event.stopPropagation(); ${onSelect}">Select</button>
      </div>
    </div>
    <div class="dm-adv">
      <div class="dm-adv-title">Advantages</div>
      <div class="dm-chips">${advChips}</div>
    </div>
    <div class="dm-dis">
      <div class="dm-dis-title">Disadvantages</div>
      <div class="dm-chips">${disChips}</div>
    </div>
  </div>`;
}

// ---------- Render DM Panel (3 columns per row) ----------
function renderDmPanel(){
  const hud = document.getElementById('dm-panel'); if(!hud) return;

  if(state.route !== 'board'){ hud.classList.add('hidden'); hud.innerHTML=''; renderDmFab(); return; }
  if(state.ui.dmMin){ hud.classList.add('hidden'); hud.innerHTML=''; renderDmFab(); return; }

  renderDmFab(); hud.classList.remove('hidden');

  const tips = (TERRAIN[state.terrain]?.tips || []).map(t=>`
    <div class="terr-card"><span class="dot"></span><span class="label">${esc(t)}</span></div>`).join('');

  const pcs  = state.players.map(p => buildCell(p,'pc')).join('');
  const npcs = state.npcs.map(n => buildCell(n,'npc')).join('');
  const foes = state.enemies.map(e => buildCell(e,'enemy')).join('');

  hud.innerHTML = `
    <div class="dm-head">
      <h3>DM Panel</h3>
      <button class="btn dm-fab mini" type="button" title="Minimize" onclick="minimizeDmPanel()">
        <span class="dm-fab-dot"></span><span class="dm-fab-label">Minimize</span>
      </button>
    </div>

    <div class="dm-section">
      <div class="small">Terrain</div>
      <select style="width:100%;margin-top:6px"
              onchange="state.terrain=this.value; state.ui.noteText=''; save(); render();">
        ${Object.keys(TERRAIN).map(t=>`<option ${state.terrain===t?'selected':''}>${t}</option>`).join('')}
      </select>
      ${tips ? `<div class="terr-wrap" style="margin-top:8px"><div class="terr-head">Environment Notes</div><div class="terr-grid">${tips}</div></div>` : ''}
    </div>

    <div class="dm-section">
      <div class="dm-sec-head pc"><span>Characters (PC)</span><span class="count">${state.players.length}</span></div>
      <div class="dm-grid3">${pcs || '<div class="small">No party yet.</div>'}</div>
    </div>

    <div class="dm-section">
      <div class="dm-sec-head npc"><span>NPCs</span><span class="count">${state.npcs.length}</span></div>
      <div class="dm-grid3">${npcs || '<div class="small">No NPCs yet.</div>'}</div>
    </div>

    <div class="dm-section">
      <div class="dm-sec-head enemy"><span>Enemies</span><span class="count">${state.enemies.length}</span></div>
      <div class="dm-grid3">${foes || '<div class="small">No enemies yet.</div>'}</div>
    </div>

    ${state.ui.noteText ? `<div class="dm-detail">${esc(state.ui.noteText)}</div>` : ''}
  `;
}

// ---------- Views ----------
function Home(){
  const tiles=[
    {t:'Board', c:'var(--yellow)', d:'2D grid + tokens + terrain', a:"nav('board')"},
    {t:'Characters', c:'var(--blue)', d:'Roster (basic) + icons', a:"nav('chars')"},
    {t:'NPCs', c:'var(--teal)', d:'List + portraits', a:"nav('npcs')"},
    {t:'Enemies', c:'var(--red)', d:'Quick foes', a:"nav('enemies')"},
    {t:'Dice', c:'var(--purple)', d:'Visual calculator + log', a:"nav('dice')"},
    {t:'Dialogue', c:'var(--sage)', d:'Roleplay log', a:"nav('dialogue')"},
    {t:'Notes', c:'var(--blue)', d:'Autosave notes', a:"nav('notes')"},
    {t:'Save', c:'var(--yellow)', d:'Import/Export JSON', a:"nav('save')"},
  ];
  return `<h1 style="margin:16px 0 6px 0">Welcome back, DM!</h1>
    <div class="small" style="margin-bottom:10px">Board + floating DM HUD • Terrain intel • Icons.</div>
    <div class="grid-3">
      ${tiles.map(t=>`
        <div class="panel tile" role="button" tabindex="0" aria-label="Open ${t.t}"
             onclick="${t.a}" onkeydown="if(event.key==='Enter'||event.key===' '){ ${t.a}; }">
          <div class="row"><div>
            <div style="font-weight:600">${t.t} <span class="chip" style="background:${t.c}">Open</span></div>
            <div class="small" style="margin-top:6px">${t.d}</div>
          </div></div>
        </div>`).join('')}
    </div>`;
}
function Board(){
  return `<div class="grid-2">
    <div class="panel">
      <div class="row" style="display:flex;justify-content:space-between;align-items:center;gap:8px">
        <h3>Scene Board</h3>
        <div class="row" style="display:flex;gap:8px">
          <label class="btn alt"><input type="file" accept="image/*" style="display:none" onchange="uploadSceneAndSetBg(this.files)">Upload Scene</label>
          <button class="btn" onclick="state.selectedToken=null; save(); render();">Deselect</button>
        </div>
      </div>
      <div class="board" style="margin-top:10px" onclick="boardClick(event)"></div>
      <div class="small" style="margin-top:8px">Click a token to select it, then click a grid cell to move.</div>
    </div>
    <div class="panel"><h3>Tips</h3><div class="small">Use the floating DM panel (bottom‑right) for terrain & quick selects.</div></div>
  </div>`;
}
function Characters(){ return `<div class="panel"><h3>Characters</h3><div class="small">Roster view.</div></div>`; }
function NPCs(){ return `<div class="panel"><h3>NPCs</h3><div class="small">List view.</div></div>`; }
function Enemies(){ return `<div class="panel"><h3>Enemies</h3><div class="small">List view.</div></div>`; }
function Dice(){ return `<div class="panel"><h2>Dice Roller</h2><div id="dice-roller"></div></div>`; }
function Dialogue(){ return `<div class="panel"><h3>Dialogue</h3><div class="small">Roleplay log coming next pass.</div></div>`; }
function Notes(){ return `<div class="panel"><h2>Notes</h2><textarea style="width:100%;height:300px" oninput="state.notes=this.value; save();">${esc(state.notes)}</textarea></div>`; }
function SavePanel(){
  return `<div class="panel"><h2>Save / Export</h2>
    <button class="btn" onclick="const data=JSON.stringify(state,null,2); const blob=new Blob([data],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='tp-dm_lite_v2_1-session.json'; a.click();">Export (.json)</button>
    <label class="btn"><input type="file" accept="application/json" style="display:none" onchange="const r=new FileReader(); r.onload=e=>{ try{ state=JSON.parse(e.target.result); save(); render(); }catch(err){ alert('Invalid JSON'); } }; r.readAsText(this.files[0]);">Import</label>
    <button class="btn" onclick="if(confirm('Reset all data?')){ localStorage.removeItem('tp_dm_lite_v2_1'); location.reload(); }">Reset</button>
  </div>`;
}

// ---------- Dice render ----------
function renderDice(){
  ensureBuilder();
  const wrap = document.getElementById('dice-roller'); if(!wrap) return;
  const termChips = Object.entries(state.dice.builder.terms).filter(([,c])=>c>0)
    .map(([sides,count])=>`<span class="pill">${count}&times; d${sides}<button class="pill-btn" title="remove one" onclick="decDie(${sides})">−</button></span>`).join('')
    || '<span class="small" style="opacity:.75">No dice added yet</span>';
  const modChip = state.dice.builder.mod ? `<span class="pill ${state.dice.builder.mod>0?'pos':'neg'}">${state.dice.builder.mod>0?'+':''}${state.dice.builder.mod}<button class="pill-btn" title="±1" onclick="addMod(${state.dice.builder.mod>0?-1:+1})">±</button></span>` : '';
  wrap.innerHTML = `
    <div class="calc">
      <div class="calc-main">
        <div class="dice" id="dice-box">—</div>
        <div class="calc-panel">
          <div class="small">Build roll</div>
          <div class="row-wrap" style="margin:6px 0">${termChips} ${modChip}</div>
          <div class="calc-row">${[20,12,10,8,6,4].map(s=>`<button class="btn alt" onclick="addDie(${s})">+ d${s}</button>`).join(' ')}</div>
          <div class="calc-row">
            <button class="btn alt" onclick="addMod(+1)">+1</button><button class="btn alt" onclick="addMod(-1)">−1</button>
            <button class="btn alt" onclick="addMod(+2)">+2</button><button class="btn alt" onclick="addMod(+5)">+5</button>
            <button class="btn" style="margin-left:auto" onclick="clearBuilder()">Clear</button>
          </div>
          <div class="calc-row">
            <input id="dice-expr" value="${esc(state.dice.expr)}" style="width:180px" oninput="state.dice.expr=this.value; save();" />
            <button class="btn active" onclick="rollVisual(document.getElementById('dice-expr').value)">Roll</button>
            <span class="small">= <b id="dice-result">${state.dice.last}</b></span>
          </div>
        </div>
      </div>
      <div class="panel" style="margin-top:10px;background:#0f1115"><div class="small"><b>Breakdown</b></div><div class="small" id="dice-break">${renderDiceBreakdownPreview()}</div></div>
      <div class="panel" style="margin-top:10px;background:#0f1115"><div class="small"><b>Log</b></div><div class="small">${state.dice.log.map(l=>`[${new Date(l.t).toLocaleTimeString()}] ${esc(l.expr)} → <b>${l.total}</b> [${l.parts.join(', ')}${l.mod? (l.mod>0? ' + '+l.mod : ' - '+Math.abs(l.mod)) : ''}]`).join('<br/>')||'No rolls yet.'}</div></div>
    </div>`;
}

// ---------- Router / render ----------
function routeView(){
  switch(state.route){
    case 'home': return Home();
    case 'board': return Board();
    case 'chars': return Characters();
    case 'npcs': return NPCs();
    case 'enemies': return Enemies();
    case 'dice': return Dice();
    case 'dialogue': return Dialogue();
    case 'notes': return Notes();
    case 'save': return SavePanel();
    default: return Home();
  }
}
function render(){
  document.getElementById('app').innerHTML = routeView();
  if(state.route==='board'){
    const b=document.querySelector('.board'); if(b){ renderBoard(); b.addEventListener('click', boardClick); }
  }
  if(state.route==='dice'){ renderDice(); }
  renderDmPanel();
  renderDmFab();
  setActive();
}
render();
