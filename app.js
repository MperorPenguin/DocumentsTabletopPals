/* DMToolkit v2.2.0 | app.js (toast lifecycle, DM map selector, compact quick dice) */

const GRID_COLS = 26;
const GRID_ROWS = 26;

// Maps list is loaded from assets/maps/index.json
let MAPS = []; // replaced by JSON at runtime
const TRY_FETCH_JSON_INDEX = true;

// Simple environment rules (with traits)
const ENVIRONMENTS = ['Forest','Cavern','Open Field','Urban','Swamp','Desert'];
const ENV_RULES = {
  Forest: {  advIfClass:['Rogue'],  disIfTrait:['Heavy Armor'], advIfTrait:['Stealthy'] },
  Cavern: {  advIfTrait:['Darkvision','Burrower','Undead'], disIfTrait:['Stealthy'] },
  'Open Field': { advIfTrait:['Mounted'], disIfTrait:['Stealthy'] },
  Urban: {   advIfTrait:['Stealthy'], disIfClass:['Enemy'] },
  Swamp: {   advIfTrait:['Amphibious'], disIfTrait:['Heavy Armor'] },
  Desert: {  advIfTrait:['Survivalist'], disIfTrait:['Heavy Armor'] }
};

// State
const state = load() || {
  route: 'home',
  boardBg: null,
  tokens: {
    pc: [
      {id:'p1', name:'Aria',   cls:'Rogue',   traits:['Stealthy','Light Armor'], hp:[10,10], pos:[2,3]},
      {id:'p2', name:'Bronn',  cls:'Fighter', traits:['Heavy Armor','Brute'],     hp:[13,13], pos:[4,4]},
    ],
    npc: [{id:'n1', name:'Elder Bran', cls:'NPC', traits:['Civilian'], hp:[6,6], pos:[7,6]}],
    enemy: [{id:'e1', name:'Skeleton A', cls:'Enemy', traits:['Undead','Darkvision'], hp:[13,13], pos:[23,1]}]
  },
  selected: null,
  notes: '',
  ui: { dmOpen:false, dmTab:'party', environment:null },
  mapIndex: 0
};

// Broadcast for viewer
const chan = new BroadcastChannel('board-sync');
function broadcastState(){ chan.postMessage({type:'state', payload:state}); }

// Persistence
function save(){ localStorage.setItem('tp_state_v22', JSON.stringify(state)); broadcastState(); }
function load(){ try{ return JSON.parse(localStorage.getItem('tp_state_v22')); }catch(e){ return null; } }

// Prevent default drag behavior
window.addEventListener('dragover', e => e.preventDefault());
window.addEventListener('drop',     e => e.preventDefault());

// Routing
function nav(route){
  state.route = route; save();
  const views = ['home','board','dice','notes'];
  views.forEach(v=>{
    const main = document.getElementById('view-'+v);
    const btn  = document.getElementById('nav-'+v);
    if(!main||!btn) return;
    if(v===route){ main.classList.remove('hidden'); btn.classList.add('active'); }
    else{ main.classList.add('hidden'); btn.classList.remove('active'); }
  });
  render();
}

// Board sizing
const boardEl = () => document.getElementById('board');
function fitBoard(){
  const el = boardEl(); if(!el) return;
  const vpH = Math.min(window.innerHeight, (window.visualViewport?.height || window.innerHeight));
  const vpW = Math.min(window.innerWidth,  (window.visualViewport?.width  || window.innerWidth));
  const SAFE_H_PAD = 140, SAFE_W_PAD = 24;
  const availH = Math.max(240, vpH - SAFE_H_PAD);
  const availW = Math.max(240, vpW - SAFE_W_PAD);
  const maxSquare = Math.floor(Math.min(availW, availH));
  const grid = Math.max(GRID_COLS, GRID_ROWS);
  const cell = Math.max(16, Math.floor(maxSquare / grid));
  const boardSize = cell * grid;
  el.style.setProperty('--cell', cell + 'px');
  el.style.setProperty('--boardSize', boardSize + 'px');
}
window.addEventListener('resize', ()=>{ fitBoard(); renderBoard(); });
document.addEventListener('fullscreenchange', ()=>{ fitBoard(); renderBoard(); });

function cellsz(){
  const cs = getComputedStyle(boardEl()).getPropertyValue('--cell').trim();
  return parseInt(cs.replace('px','')) || 42;
}

function boardClick(ev){
  const el = boardEl(); if(!el) return;
  const rect = el.getBoundingClientRect();
  const x = Math.max(0, Math.min(GRID_COLS-1, Math.floor((ev.clientX - rect.left) / cellsz())));
  const y = Math.max(0, Math.min(GRID_ROWS-1, Math.floor((ev.clientY - rect.top)  / cellsz())));
  if(!state.selected) return;
  const list = state.tokens[state.selected.kind];
  const t = list.find(z=>z.id===state.selected.id);
  if(!t) return;
  t.pos = [x,y];
  save(); renderBoard();
}

function selectTokenDom(kind,id){
  state.selected = {kind,id}; save(); renderBoard();
}

// Render board
function renderBoard(){
  const el = boardEl(); if(!el) return;
  fitBoard();
  el.style.backgroundImage = state.boardBg ? `url("${state.boardBg}")` : 'linear-gradient(#1b2436,#0f1524)';
  const size = cellsz();
  el.innerHTML = '';
  ['pc','npc','enemy'].forEach(kind=>{
    (state.tokens[kind] || []).forEach(t=>{
      const tok = document.createElement('div');
      tok.className = `token ${kind}` + (state.selected && state.selected.id===t.id && state.selected.kind===kind ? ' selected':'');
      tok.dataset.id = t.id; tok.dataset.kind = kind; tok.title = t.name;
      tok.style.left = (t.pos[0]*size + 2) + 'px';
      tok.style.top  = (t.pos[1]*size + 2) + 'px';
      tok.style.width = (size-6) + 'px';
      tok.style.height= (size-6) + 'px';
      tok.onclick = (e)=>{ e.stopPropagation(); selectTokenDom(kind,t.id); };
      const img = document.createElement('img');
      img.loading='lazy'; img.src = `assets/class_icons/${t.cls}.svg`;
      tok.appendChild(img); el.appendChild(tok);
    });
  });
  updateDmFab();
}

// Fullscreen / Viewer
function toggleBoardFullscreen(){
  const el = boardEl(); if(!el) return;
  if(!document.fullscreenElement){ el.requestFullscreen?.(); }
  else { document.exitFullscreen?.(); }
}

let viewerWin = null;
function openBoardViewer(){
  if(viewerWin && !viewerWin.closed){ viewerWin.focus(); broadcastState(); return; }
  viewerWin = window.open('', 'BoardViewer', 'width=900,height=900');
  if(!viewerWin) return;
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Board Viewer</title>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<style>
  :root{ --cell: 42px; --boardSize: 546px; }
  html,body{ height:100%; margin:0; background:#0f1115; color:#e6e9f2; font:14px system-ui,Segoe UI,Roboto,Arial }
  .board{ position:relative; width:var(--boardSize); height:var(--boardSize); margin:20px auto;
    border:1px solid #23283a; border-radius:12px; overflow:hidden; background:#0f141f; background-size:cover; background-position:center; }
  .board::after{ content:""; position:absolute; inset:0;
     background-image:linear-gradient(to right,rgba(255,255,255,.06) 1px,transparent 1px),
                      linear-gradient(to bottom,rgba(255,255,255,.06) 1px,transparent 1px);
     background-size: var(--cell) var(--cell); pointer-events:none; }
  .token{ position:absolute; border-radius:6px; border:2px solid rgba(255,255,255,.25); display:flex; align-items:center; justify-content:center; overflow:hidden; background:#0f1115 }
  .token img{ width:100%; height:100%; object-fit:contain; }
  .pc{ background:#0ea5e9aa } .npc{ background:#22c55eaa } .enemy{ background:#ef4444aa }
</style>
</head><body>
  <div id="viewerBoard" class="board"></div>
<script>
  const GRID_COLS=${GRID_COLS}, GRID_ROWS=${GRID_ROWS};
  const chan = new BroadcastChannel('board-sync');
  chan.onmessage = (e)=>{ if(!e?.data) return; if(e.data.type==='state'){ window.__STATE = e.data.payload; renderViewer(); } };
  window.addEventListener('resize', fit);
  function fit(){
    const el = document.getElementById('viewerBoard');
    const vpH = Math.min(window.innerHeight, (window.visualViewport?.height || window.innerHeight));
    const vpW = Math.min(window.innerWidth,  (window.visualViewport?.width  || window.innerWidth));
    const avail = Math.min(vpW-40, vpH-40);
    const grid = Math.max(GRID_COLS, GRID_ROWS);
    const cell = Math.max(14, Math.floor(avail / grid));
    const size = cell * grid;
    el.style.setProperty('--cell', cell+'px');
    el.style.setProperty('--boardSize', size+'px');
  }
  function renderViewer(){
    const s = window.__STATE; if(!s) return;
    const el = document.getElementById('viewerBoard'); if(!el) return;
    fit();
    el.style.backgroundImage = s.boardBg ? 'url('+JSON.stringify(s.boardBg)+')' : 'linear-gradient(#1b2436,#0f1524)';
    const cell = parseInt(getComputedStyle(el).getPropertyValue('--cell'))||42;
    el.innerHTML = '';
    ['pc','npc','enemy'].forEach(kind=>{
      (s.tokens[kind]||[]).forEach(t=>{
        const d = document.createElement('div');
        d.className = 'token '+kind;
        d.style.left = (t.pos[0]*cell + 2) + 'px';
        d.style.top  = (t.pos[1]*cell + 2) + 'px';
        d.style.width = (cell-6) + 'px';
        d.style.height= (cell-6) + 'px';
        const img = document.createElement('img'); img.src='assets/class_icons/'+t.cls+'.svg'; img.loading='lazy';
        d.appendChild(img); el.appendChild(d);
      });
    });
  }
  chan.postMessage({type:'ping'});
</script></body></html>`;
  viewerWin.document.open(); viewerWin.document.write(html); viewerWin.document.close();
  chan.onmessage = (e)=>{ if(e?.data?.type==='ping'){ broadcastState(); } };
  broadcastState();
}

// =========== DM Panel ===========

function maximizeDmPanel(){
  state.ui.dmOpen = true; save(); renderDmPanel(); updateDmFab();
}
function minimizeDmPanel(){
  state.ui.dmOpen = false; save(); renderDmPanel(); updateDmFab();
  // Also close any toasts when panel is closed
  closeAllToasts();
}
function toggleDmPanel(){
  state.ui.dmOpen = !state.ui.dmOpen; save(); renderDmPanel(); updateDmFab();
  if(!state.ui.dmOpen) closeAllToasts();
}
document.addEventListener('keydown', (e)=>{ if(e.shiftKey && (e.key==='D'||e.key==='d')){ e.preventDefault(); toggleDmPanel(); } });

function updateDmFab(){
  const fab = document.getElementById('dm-fab');
  const count = document.getElementById('dm-fab-count');
  if(!fab||!count) return;
  const total = (state.tokens.pc?.length||0)+(state.tokens.npc?.length||0)+(state.tokens.enemy?.length||0);
  count.textContent = total;
  fab.classList.remove('hidden');
}

function dmTabButton(id,label,active){ return `<button class="dm-tab ${active?'active':''}" onclick="setDmTab('${id}')">${label}</button>`; }
function setDmTab(id){ state.ui.dmTab=id; save(); renderDmPanel(); }

function tokenCard(kind,t){
  const sel = state.selected && state.selected.kind===kind && state.selected.id===t.id;
  return `
    <div class="dm-character-box">
      <div class="dm-card ${sel?'selected':''}" onclick="selectFromPanel('${kind}','${t.id}')">
        <div class="avatar"><img src="assets/class_icons/${t.cls}.svg" alt=""></div>
        <div class="name">${escapeHtml(t.name)}</div>
        <div class="badges">
          <span class="badge">${escapeHtml(t.cls)}</span>
          <span class="badge">HP ${t.hp[0]}/${t.hp[1]}</span>
          ${(Array.isArray(t.traits)?t.traits:[]).map(x=>`<span class="badge">${escapeHtml(x)}</span>`).join('')}
        </div>
      </div>
      <div class="dm-actions">
        <button class="dm-title-btn short adv" title="Advantage" onclick="quickAdvFor('${kind}','${t.id}')">A</button>
        <button class="dm-title-btn short dis" title="Disadvantage" onclick="quickDisFor('${kind}','${t.id}')">D</button>
      </div>
    </div>`;
}

function selectFromPanel(kind,id){ state.selected = {kind,id}; save(); renderDmPanel(); if(state.route!=='board') nav('board'); else renderBoard(); }

function setEnvironment(env){
  state.ui.environment = env; save();
  renderDmPanel();
}

function computeEnvironmentEffects(){
  const env = state.ui.environment;
  if(!env) return { lines:[], adv:[], dis:[] };
  const rule = ENV_RULES[env] || {};
  const aClass = new Set(rule.advIfClass || []);
  const dClass = new Set(rule.disIfClass || []);
  const aTrait = new Set(rule.advIfTrait || []);
  const dTrait = new Set(rule.disIfTrait || []);

  const all = ['pc','npc','enemy'].flatMap(k => (state.tokens[k]||[]).map(t=>({...t, kind:k})));
  const lines = all.map(t=>{
    const cls = t.cls || '';
    const traits = Array.isArray(t.traits) ? t.traits : [];
    const hasAdvClass = aClass.has(cls);
    const hasDisClass = dClass.has(cls);
    const hasAdvTrait = traits.some(tr => aTrait.has(tr));
    const hasDisTrait = traits.some(tr => dTrait.has(tr));
    const adv = hasAdvClass || hasAdvTrait;
    const dis = hasDisClass || hasDisTrait;

    if(adv && !dis) return `${t.name} (${cls}): Advantage`;
    if(dis && !adv) return `${t.name} (${cls}): Disadvantage`;
    if(adv && dis)  return `${t.name} (${cls}): Mixed (check DM ruling)`;
    return `${t.name} (${cls}): —`;
  });

  const advIds = [];
  const disIds = [];
  all.forEach(t=>{
    const cls = t.cls || '';
    const traits = Array.isArray(t.traits) ? t.traits : [];
    const adv = aClass.has(cls) || traits.some(tr => aTrait.has(tr));
    const dis = dClass.has(cls) || traits.some(tr => dTrait.has(tr));
    if(adv && !dis) advIds.push(t.id);
    if(dis && !adv) disIds.push(t.id);
  });

  return { lines, adv: advIds, dis: disIds };
}

function renderDmPanel(){
  const panel=document.getElementById('dm-panel'); if(!panel) return;
  if(!state.ui.dmOpen){ panel.classList.add('hidden'); return; }
  panel.classList.remove('hidden');

  const pcs = state.tokens.pc||[];
  const npcs= state.tokens.npc||[];
  const enemies = state.tokens.enemy||[];
  const tab= state.ui.dmTab||'party';

  const tabsHtml=`<div class="dm-tabs">
    ${dmTabButton('party','Party',tab==='party')}
    ${dmTabButton('npcs','NPCs',tab==='npcs')}
    ${dmTabButton('enemies','Enemies',tab==='enemies')}
    ${dmTabButton('notes','Notes',tab==='notes')}
    ${dmTabButton('tools','Tools',tab==='tools')}
  </div>`;

  let body='';
  if(tab==='party'){ body+=`<div class="dm-grid3">${pcs.map(p=>tokenCard('pc',p)).join('')||'<div class="small">No PCs yet.</div>'}</div>`; }
  if(tab==='npcs'){ body+=`<div class="dm-grid3">${npcs.map(n=>tokenCard('npc',n)).join('')||'<div class="small">No NPCs yet.</div>'}</div>`; }
  if(tab==='enemies'){ body+=`<div class="dm-grid3">${enemies.map(e=>tokenCard('enemy',e)).join('')||'<div class="small">No Enemies yet.</div>'}</div>`; }

  if(tab==='notes'){
    body+=`
      <div class="dm-section">
        <div class="dm-sec-head"><span>DM Notes</span></div>
        <textarea id="dm-notes" rows="8" style="width:100%">${escapeHtml(state.notes||'')}</textarea>
      </div>`;
  }

  if(tab==='tools'){
    const env = state.ui.environment;
    const effects = computeEnvironmentEffects();

    // Map selector (buttons from MAPS)
    const mapButtons = (MAPS||[]).map((m,i)=>`
      <button class="map-pill ${state.mapIndex===i?'active':''}" onclick="setMapByIndex(${i})">${escapeHtml(m.name || (m.src.split('/').pop()))}</button>
    `).join('');

    const quickRow = `
      <div class="quick-dice-row">
        ${['d4','d6','d8','d10','d12','d20'].map(s=>`
          <button class="quick-die-btn" onclick="rollQuick('${s}')">
            <span class="die-icon">${polyIcon(s)}</span>${s.toUpperCase()}
          </button>`).join('')}
      </div>`;

    body+=`
      <div class="dm-section">
        <div class="dm-sec-head"><span>Environment / Terrain</span></div>
        <div class="env-grid">
          ${ENVIRONMENTS.map(e=>`<div class="env-pill ${env===e?'active':''}" onclick="setEnvironment('${e}')">${e}</div>`).join('')}
        </div>
        <div class="dm-detail" style="margin-top:8px">
          ${env ? `<strong>Selected:</strong> ${env}` : 'Select an environment to see advantages/disadvantages.'}
          ${effects.lines.length ? `<div style="margin-top:6px">${effects.lines.map(l=>`• ${escapeHtml(l)}`).join('<br>')}</div>` : ''}
        </div>
      </div>

      <div class="dm-section" style="margin-top:10px">
        <div class="dm-sec-head"><span>Maps</span></div>
        <div class="map-list">
          ${mapButtons || '<div class="small">No maps yet. Add PNG/SVG files and rebuild assets/maps/index.json.</div>'}
        </div>
        <div class="dm-detail" style="margin-top:8px">
          Current map: ${state.boardBg ? escapeHtml(MAPS[state.mapIndex]?.name || MAPS[state.mapIndex]?.src || 'Loaded') : 'None'}
          <div style="margin-top:8px; display:flex; gap:8px; flex-wrap:wrap;">
            <button class="btn tiny" onclick="clearMap()">Clear Map</button>
            <button class="btn tiny" onclick="reloadMaps()">Reload Maps</button>
          </div>
        </div>
      </div>

      <div class="dm-section" style="margin-top:10px">
        <div class="dm-sec-head"><span>Quick Dice</span></div>
        ${quickRow}
        <div class="dm-quick-bar">
  <button class="dm-title-btn big" onclick="quickD20()">Roll d20</button>
  <div id="dm-last-roll" class="dm-detail">—</div>
</div>
      </div>`;
  }

  panel.innerHTML = `
    <div class="dm-head">
      <h3>DM Panel</h3>
      <div><button class="btn tiny" onclick="minimizeDmPanel()">Close</button></div>
    </div>
    ${tabsHtml}
    ${body}
  `;

  const notesEl=document.getElementById('dm-notes');
  if(notesEl){
    notesEl.addEventListener('input', ()=>{
      state.notes=notesEl.value; save();
      const n=document.getElementById('notes'); if(n) n.value=state.notes;
    });
  }
}

function clearMap(){ state.boardBg=null; save(); renderBoard(); }

// Rolls & Toast
let activeToast = null;
function closeAllToasts(){
  document.querySelectorAll('.dm-toast').forEach(t=>t.remove());
  activeToast = null;
}
function showToast(title,msg,hint){
  closeAllToasts();
  const div=document.createElement('div');
  div.className='dm-toast fade';
  div.innerHTML=`
    <div class="close" onclick="this.parentElement.remove()">×</div>
    <h4>${escapeHtml(title)}</h4>
    <div>${escapeHtml(msg)}</div>
    ${hint ? `<div class="hint">${escapeHtml(hint)}</div>` : ``}
  `;
  document.body.appendChild(div);
  activeToast = div;
  // Auto-dismiss after 4.5s
  setTimeout(()=>{ if(div===activeToast){ div.remove(); activeToast=null; } }, 4500);
}
// Click outside toast → dismiss
document.addEventListener('click', (e)=>{
  if(!activeToast) return;
  const insideToast = activeToast.contains(e.target);
  const insidePanel = document.getElementById('dm-panel')?.contains(e.target);
  if(!insideToast && !insidePanel){ closeAllToasts(); }
});

function quickD20(){
  const v=1+Math.floor(Math.random()*20);
  const box=document.getElementById('dm-last-roll'); if(box) box.textContent=`d20 → ${v}`;
  showToast('Quick d20', `→ ${v}`, 'Instruction: roll 1d20; apply modifiers as usual.');
}
function quickAdvFor(kind,id){
  const a=1+Math.floor(Math.random()*20), b=1+Math.floor(Math.random()*20), res=Math.max(a,b);
  const list=state.tokens[kind]||[]; const name=(list.find(x=>x.id===id)?.name)||kind.toUpperCase();
  const box=document.getElementById('dm-last-roll'); if(box) box.textContent=`Adv: ${a} vs ${b} ⇒ ${res}`;
  showToast(name, `Advantage → ${res} (${a} vs ${b})`, 'Instruction: roll 2d20, keep highest; then add relevant modifiers.');
}
function quickDisFor(kind,id){
  const a=1+Math.floor(Math.random()*20), b=1+Math.floor(Math.random()*20), res=Math.min(a,b);
  const list=state.tokens[kind]||[]; const name=(list.find(x=>x.id===id)?.name)||kind.toUpperCase();
  const box=document.getElementById('dm-last-roll'); if(box) box.textContent=`Dis: ${a} vs ${b} ⇒ ${res}`;
  showToast(name, `Disadvantage → ${res} (${a} vs ${b})`, 'Instruction: roll 2d20, keep lowest; then add relevant modifiers.');
}

// Quick dice inside DM Tools
function rollQuick(tag){
  const n=parseInt(tag.replace('d',''),10)||6;
  const v=1+Math.floor(Math.random()*n);
  const box=document.getElementById('dm-last-roll'); if(box) box.textContent=`${tag.toUpperCase()} → ${v}`;
  showToast('Quick Dice', `${tag.toUpperCase()} → ${v}`, 'Instruction: roll the selected die; apply modifiers as needed.');
}

// Dice (page)
const dice=['d4','d6','d8','d10','d12','d20']; let selectedDice=[];
function renderDiceButtons(){
  const row=document.getElementById('dice-buttons'); if(!row) return;
  row.innerHTML=dice.map(s=>`
    <button class="die-btn" onclick="addDie('${s}')">
      <span class="die-icon">${polyIcon(s)}</span>${s.toUpperCase()}
    </button>`).join('');
}
function addDie(s){ selectedDice.push(s); updateDiceSelection(); shakeOutput(); }
function clearDice(){ selectedDice=[]; updateDiceSelection(); document.getElementById('dice-output').innerHTML=''; }
function updateDiceSelection(){
  const el=document.getElementById('dice-selection'); if(!el) return;
  el.textContent= selectedDice.length? selectedDice.join(' + '):'No dice selected';
}
function polyIcon(s){
  const map={d4:3,d6:4,d8:6,d10:7,d12:8,d20:10};
  const sides=map[s]||6;
  return `<svg width="26" height="26" viewBox="0 0 24 24" fill="none">
    <polygon points="${regularPoly(12,12,9,sides)}" stroke="currentColor" stroke-width="2" fill="none"/>
  </svg>`;
}
function regularPoly(cx,cy,r,n){
  const pts=[];
  for(let i=0;i<n;i++){
    const a=(Math.PI*2*(i/n))-Math.PI/2;
    pts.push((cx+r*Math.cos(a)).toFixed(1)+','+(cy+r*Math.sin(a)).toFixed(1));
  }
  return pts.join(' ');
}
function rollAll(){
  if(!selectedDice.length) return;
  const rolls=selectedDice.map(tag=>roll(tag));
  const total=rolls.reduce((a,b)=>a+b,0);
  const out=document.getElementById('dice-output');
  out.innerHTML=`<div class="roll-card">
    <div class="roll-total">Total: ${total}</div>
    <div class="roll-breakdown">${selectedDice.map((s,i)=>`${s} [${rolls[i]}]`).join(' + ')}</div>
  </div>`;
  selectedDice=[]; updateDiceSelection();
}
function roll(tag){ const n=parseInt(tag.replace('d',''),10)||6; return 1+Math.floor(Math.random()*n); }
function shakeOutput(){ const out=document.getElementById('dice-output'); out.classList.remove('shake'); void out.offsetWidth; out.classList.add('shake'); }

// Utils & boot
function escapeHtml(s){ return (s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

function render(){
  if(state.route==='board'){ renderBoard(); }
  if(state.route==='dice'){ renderDiceButtons(); updateDiceSelection(); }
  const notes=document.getElementById('notes'); if(notes) notes.value=state.notes||'';
  updateDmFab();
  renderDmPanel();
}

document.addEventListener('DOMContentLoaded', async ()=>{
  try{
    nav(state.route || 'home');
    fitBoard();
    await reloadMaps();                 // Loads assets/maps/index.json (PNG/SVG supported)
    if(!state.boardBg && (MAPS[0]?.src)) setMapByIndex(0);
  }catch(err){ console.error('boot error', err); }
});

// Map loading (index.json)
function setMapByIndex(idx){
  if(!MAPS[idx]) return;
  state.mapIndex = idx;
  state.boardBg  = MAPS[idx].src;
  save(); renderBoard(); renderDmPanel();
}
function nextMap(){ if(!MAPS.length) return; setMapByIndex((state.mapIndex+1)%MAPS.length); }
function prevMap(){ if(!MAPS.length) return; setMapByIndex((state.mapIndex-1+MAPS.length)%MAPS.length); }
async function reloadMaps(){
  if(!TRY_FETCH_JSON_INDEX){ return; }
  try{
    const res = await fetch('assets/maps/index.json', {cache:'no-store'});
    if(!res.ok) throw new Error('index.json not found');
    const list = await res.json();
    if(Array.isArray(list)){
      MAPS = list;
      // Preserve current selection if possible
      const cur = state.boardBg;
      const found = MAPS.findIndex(m => m.src === cur);
      state.mapIndex = found >= 0 ? found : 0;
      if(!cur && MAPS[0]) state.boardBg = MAPS[0].src;
      save();
    }
  }catch(e){
    console.warn('No index.json found or error reading it.', e);
  }finally{
    renderDmPanel(); renderBoard();
  }
}

// Expose
window.boardClick=boardClick;
window.nav=nav;
window.openBoardViewer=openBoardViewer;
window.toggleBoardFullscreen=toggleBoardFullscreen;
window.selectFromPanel=selectFromPanel;
window.quickD20=quickD20;
window.quickAdvFor=quickAdvFor;
window.quickDisFor=quickDisFor;
window.maximizeDmPanel=maximizeDmPanel;
window.minimizeDmPanel=minimizeDmPanel;
window.setDmTab=setDmTab;
window.prevMap=prevMap;
window.nextMap=nextMap;
window.reloadMaps=reloadMaps;
window.setEnvironment=setEnvironment;
window.setMapByIndex=setMapByIndex;
window.clearMap=clearMap;
window.rollQuick=rollQuick;
