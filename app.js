/* DM Toolkit — World Map + DM Page + Dice + Live Sync
   Theme: Lime #d6ed17 (actions), Midnight #000e1b (backgrounds)
*/

let MAPS = [];
const IS_FILE = (location.protocol === 'file:');         // Detect local file usage
const TRY_FETCH_JSON_INDEX = !IS_FILE;                    // Skip JSON fetch on file:// to avoid CORS

// Character Manager localStorage key (shared with iframe)
const CHAR_LIB_KEY = 'tp_cc_characters';

// Broadcast channel (for pop-out world viewer sync)
const worldChan = (typeof BroadcastChannel !== 'undefined')
  ? new BroadcastChannel('world-sync')
  : { postMessage: ()=>{} };

/* ========= State ========= */
const defaultState = {
  route: 'home',
  dice: [],
  appDice: [],
  appDiceDisplay: [],
  appDiceTotal: 0,
  worldList: [],
  worldSrc: null,
  worldIndex: 0,

  // Legacy board compatibility
  boardBg: null,
  mapIndex: 0,

  // DM tokens (NPCs/Enemies keep using internal state; PCs now come from Character Manager)
  tokens: {
    pc:   [], // PCs now sourced from Character Manager → inParty
    npc:   [{id:'n1', name:'Elder Bran', cls:'NPC',   traits:['Civilian'], hp:[6,6]}],
    enemy: [{id:'e1', name:'Skeleton A', cls:'Enemy', traits:['Undead','Darkvision'], hp:[13,13]}],
  },
  selected: null,
  notes: '',
  appNotes: '',
  ui: { dmTab:'party', environment:null, worldMode:'fit' }, // worldMode: 'fit' | 'actual'
};

function save(){
  localStorage.setItem('tp_state_v26', JSON.stringify(state));
  try { worldChan.postMessage({type:'world', src: state.worldSrc || ''}); } catch(e){}
}
function load(){
  try { return JSON.parse(localStorage.getItem('tp_state_v26')); }catch(e){ return null; }
}

let state = load() || defaultState;

/* ========= Characters library bridge (from Character Manager) ========= */
function listCharactersLib(){
  try { return JSON.parse(localStorage.getItem(CHAR_LIB_KEY)) || []; }
  catch { return []; }
}
function getPartyTokens(){
  // Map Character Manager models → DM token model
  const party = listCharactersLib().filter(c => !!c.inParty);
  return party.map(c => ({
    id: c.id,
    name: c.name || 'Unnamed',
    cls: c.class || '—',
    // traits: leave empty unless you later add traits in the Character Manager
    traits: Array.isArray(c.traits) ? c.traits : [],
    // extra badges to show (species/background)
    badges: [c.background, c.species].filter(Boolean),
    // hp is optional in the library; if added later, tokenCard will render it
    hp: Array.isArray(c.hp) && c.hp.length >= 2 ? c.hp : null,
  }));
}
// Auto-refresh DM Party when Character Manager updates the library
window.addEventListener('storage', (e)=>{
  if(e.key === CHAR_LIB_KEY){
    if(state.route === 'dm' && state.ui.dmTab === 'party'){
      renderDmPage();
    }
  }
});

/* ========= Routing & View Transitions ========= */
function nav(route){
  state.route = route; save();
  const views = ['home','world','dice','notes','dm','logbook','characters'];
  for(const id of views){
    const el = document.getElementById('view-'+id);
    if(el) el.classList.add('hidden');
  }
  const v = document.getElementById('view-'+route);
  if(v){ v.classList.remove('hidden'); v.classList.add('view-anim'); }

  if(route==='world'){
    reloadMaps().then(()=>{ renderWorld(); renderWorldMapList(); });
  }
  if(route==='dice'){
    renderDice();
  }
  if(route==='dm'){
    renderDmPage();
  }
  if(route==='notes'){
    renderNotes();
  }
  save();
}

/* ========= Util ========= */
function escapeHtml(s){ return String(s||'').replace(/[&<>"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m])); }
function prettyNameFromPath(p){
  if(!p) return '';
  p = String(p).replace(/\\/g, '/');
  const base = p.split('/').pop().replace(/\.[a-z0-9]+$/i, '');
  return base.replace(/[-_]+/g, ' ').replace(/\b\w/g, m=>m.toUpperCase());
}
function normalizeMapSrc(p){
  if(!p) return '';
  p = String(p).replace(/\\/g, '/');
  if(/^https?:\/\//i.test(p) || p.startsWith('/')) return p;
  if(p.startsWith('MapsKit/')) return p;
  if(p.startsWith('assets/')) return 'MapsKit/' + p;
  return 'MapsKit/assets/maps/' + p;
}
function normalizeMapsList(list){
  if(!Array.isArray(list)) return [];
  const out = list.map(m => {
    const src = normalizeMapSrc(m?.src || m || '');
    const name = m?.name || prettyNameFromPath(src);
    return { ...m, src, name };
  });
  out.sort((a,b)=> String(a.name||'').localeCompare(String(b.name||'')));
  return out;
}

/* ========= Script loader for file:// fallback ========= */
function loadScript(src){
  return new Promise((resolve, reject)=>{
    const s = document.createElement('script');
    s.src = src; s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });
}

/* ========= Maps loading ========= */
async function reloadMaps(){
  const jsonUrl = 'MapsKit/assets/maps/index.json';
  const jsUrl   = 'MapsKit/assets/maps/index.js';
  try{
    if(TRY_FETCH_JSON_INDEX){
      const res = await fetch(jsonUrl, { cache: 'no-store' });
      if(res.ok){
        const data = await res.json();
        MAPS = normalizeMapsList(data);
        state.worldList = MAPS; save();
        return MAPS;
      }
    }
  }catch(e){}

  try{
    await loadScript(jsUrl);
    if(Array.isArray(window.MAPS)){
      MAPS = normalizeMapsList(window.MAPS);
      state.worldList = MAPS; save();
      return MAPS;
    }
  }catch(e){}
  MAPS = []; state.worldList = []; save();
  return MAPS;
}

/* ========= World render ========= */
function renderWorld(){
  const mount = document.getElementById('world'); if(!mount) return;
  mount.innerHTML = '';

  const stage = document.createElement('div');
  stage.className = 'world-stage ' + (state.ui.worldMode==='actual' ? 'actual' : 'fit');

  const img = document.createElement('img');
  img.className = 'world-img';
  img.alt = 'World / Region';
  img.src = state.worldSrc || '';

  // Double-click to toggle Fit/Actual
  img.addEventListener('dblclick', ()=>{
    if(stage.classList.contains('fit')){
      stage.classList.remove('fit'); stage.classList.add('actual');
      state.ui.worldMode = 'actual';
    }else{
      stage.classList.remove('actual'); stage.classList.add('fit');
      state.ui.worldMode = 'fit';
    }
    save();
  });

  stage.appendChild(img);
  mount.appendChild(stage);
}
function getWorldStage(){ return document.querySelector('#world .world-stage'); }

function renderWorldMapList(){
  const box = document.getElementById('world-map-list'); if(!box) return;
  box.innerHTML = '';
  const list = state.worldList || MAPS || [];
  if(!list.length){
    box.innerHTML = `<div class="small">No maps yet. Add files to MapsKit/assets/maps and rebuild index.json/index.js.</div>`;
    return;
  }
  const frag = document.createDocumentFragment();
  list.forEach((m,i)=>{
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'map-pill ' + (state.worldIndex===i ? 'active':'');
    b.textContent = m.name || (m.src.split('/').pop());
    b.onclick = ()=> { state.worldIndex=i; state.worldSrc=m.src; save(); renderWorld(); renderWorldMapList(); syncWorldViewer(); };
    frag.appendChild(b);
  });
  box.appendChild(frag);
}

/* ========= Pop-out + live sync ========= */
let worldViewerWin = null;
function syncWorldViewer(){
  try{
    if(worldViewerWin && !worldViewerWin.closed){
      worldViewerWin.postMessage({type:'world', src: state.worldSrc || ''}, '*');
    }
  }catch(e){}
}

function openWorldViewer(){
  if(worldViewerWin && !worldViewerWin.closed){
    worldViewerWin.focus();
    syncWorldViewer();
    worldChan.postMessage({type:'ping'});
    return;
  }
  worldViewerWin = window.open('', 'WorldViewer', 'width=1200,height=800');
  if(!worldViewerWin) return;

  const html = `<!doctype html><html><head><meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>World Viewer</title>
  <link href="https://fonts.googleapis.com/css2?family=Arvo:wght@400;700&display=swap" rel="stylesheet">
  <style>
    html,body{height:100%;margin:0;background:#000e1b;color:#e9ecf1;font:14px "Arvo", Georgia, serif}
    .topbar{position:fixed;top:10px;right:10px;left:10px;display:flex;gap:6px;justify-content:flex-end;z-index:10}
    .btn{appearance:none;background:#d6ed17;border:1px solid transparent;color:#000e1b;border-radius:10px;padding:8px 12px;cursor:pointer;transition:.15s;font-family:"Arvo", Georgia, serif;min-height:40px}
    .btn:hover{background:#c6de10}

    .stage{position:fixed;inset:0;top:50px;overflow:auto;background:#000e1b}
    .canvas{min-width:100%;min-height:100%;display:grid;place-items:center}
    .img{display:block;max-width:100%;height:auto;transform-origin:center center;transition:transform .12s ease-out}
  </style></head>
  <body>
    <div class="topbar">
      <button class="btn" id="btnFit">Fit / Actual</button>
      <button class="btn" id="btnFull">Fullscreen</button>
    </div>
    <div class="stage">
      <div class="canvas">
        <img class="img" id="img" alt="World / Region"/>
      </div>
    </div>
    <script>
      const img = document.getElementById('img');
      let scaleMode='fit';
      function applyScale(){ img.style.maxWidth = (scaleMode==='fit') ? '100%' : 'none'; img.style.maxHeight = (scaleMode==='fit') ? '100vh' : 'none'; }
      applyScale();
      document.getElementById('btnFit').onclick = ()=>{
        scaleMode = (scaleMode==='fit') ? 'actual' : 'fit';
        applyScale();
      };
      document.getElementById('btnFull').onclick = ()=>{ document.documentElement.requestFullscreen?.(); };

      window.addEventListener('message', (e)=>{ if(e?.data?.type==='world'){ img.src = e.data.src || ''; } });
      const chan = new BroadcastChannel('world-sync');
      chan.onmessage = (e)=>{ if(e?.data?.type==='world'){ img.src = e.data.src || ''; } };
      chan.postMessage({type:'ping'});
    </script>
  </body></html>`;

  worldViewerWin.document.open(); worldViewerWin.document.write(html); worldViewerWin.document.close();
  syncWorldViewer();
  worldChan.postMessage({type:'ping'});
}

function toggleWorldFullscreen(){
  const stage = getWorldStage(); if(!stage) return;
  const el = stage;
  const enter = !document.fullscreenElement;
  if(enter){
    stage.classList.remove('fit'); stage.classList.add('actual');
    el.requestFullscreen?.();
  }else{
    document.exitFullscreen?.();
  }
}

/* NEW: explicit Fit/Actual toggle to match the new button in index.html */
function toggleWorldScale(){
  const stage = getWorldStage(); if(!stage) return;
  if(stage.classList.contains('fit')){
    stage.classList.remove('fit'); stage.classList.add('actual');
    state.ui.worldMode = 'actual';
  }else{
    stage.classList.remove('actual'); stage.classList.add('fit');
    state.ui.worldMode = 'fit';
  }
  save();
}

/* ========= Dice (main page) ========= */
let diceSelection = [];
let lastRollDisplayed = false;

function startRollAnimation(){
  const hero = document.querySelector('.dice-hero');
  hero?.classList.remove('settle');
  const out = document.getElementById('dice-output');
  const totalEl = out?.querySelector('.roll-total');
  const breakdownEl = out?.querySelector('.roll-breakdown');

  const tMax = 900;
  const stepTime = 70;
  let t = 0;
  lastRollDisplayed = false;

  const scramble = ()=>{
    if(t >= tMax){
      lastRollDisplayed = true;
      const results = diceSelection.map(n => 1 + Math.floor(Math.random()*n));
      const total = results.reduce((a,b)=>a+b,0);
      updateRollOutput(total, results.join(' + '));
      hero?.classList.add('settle');
      return;
    }
    const temp = diceSelection.map(n => 1 + Math.floor(Math.random()*n));
    const tempTotal = temp.reduce((a,b)=>a+b,0);
    if(totalEl) totalEl.textContent = tempTotal;
    if(breakdownEl) breakdownEl.textContent = temp.join(' + ');
    t += stepTime;
    setTimeout(scramble, stepTime);
  };
  scramble();
}
function updateRollOutput(total, breakdown){
  const out = document.getElementById('dice-output');
  if(!out) return;
  out.querySelector('.roll-total').textContent = total;
  out.querySelector('.roll-breakdown').textContent = breakdown;
}

/* ========= Notes ========= */
function renderNotes(){
  const ta = document.getElementById('app-notes'); if(!ta) return;
  ta.value = state.appNotes || '';
  ta.oninput = ()=>{ state.appNotes = ta.value; save(); };
}

/* ========= Environment rules & helpers ========= */
const ENVIRONMENTS = ['Forest','Cavern','Open Field','Urban','Swamp','Desert'];
const ENV_RULES = {
  Forest:      { advIfClass:['Rogue'],                        disIfTrait:['Heavy Armor'], advIfTrait:['Stealthy'] },
  Cavern:      { advIfTrait:['Darkvision','Burrower','Undead'], disIfTrait:['Stealthy'] },
  'Open Field':{ advIfTrait:['Mounted'],                      disIfTrait:['Stealthy'] },
  Urban:       { advIfTrait:['Stealthy'],                     disIfClass:['Enemy'] },
  Swamp:       { advIfTrait:['Amphibious'],                   disIfTrait:['Heavy Armor'] },
  Desert:      { advIfTrait:['Survivalist'],                  disIfTrait:['Heavy Armor'] }
};

function computeEnvironmentEffects(){
  const env = state.ui.environment;
  if(!env || !ENV_RULES[env]) return { lines:[] };
  const r = ENV_RULES[env];
  const lines = [];
  if(r.advIfClass?.length) lines.push(`Advantage if class: ${r.advIfClass.join(', ')}`);
  if(r.disIfClass?.length) lines.push(`Disadvantage if class: ${r.disIfClass.join(', ')}`);
  if(r.advIfTrait?.length) lines.push(`Advantage if traits: ${r.advIfTrait.join(', ')}`);
  if(r.disIfTrait?.length) lines.push(`Disadvantage if traits: ${r.disIfTrait.join(', ')}`);
  lines.push('');
  lines.push('If you have both, they cancel (roll a single d20).');
  return { lines };
}

/* Token cards & actions */
function tokenCard(kind,t){
  const sel = state.selected && state.selected.kind===kind && state.selected.id===t.id;
  const hpBadge = (Array.isArray(t.hp) && t.hp.length>=2)
    ? `<span class="badge">HP ${t.hp[0]}/${t.hp[1]}</span>`
    : '';
  const extra = []
    .concat(Array.isArray(t.badges)?t.badges:[])
    .concat(Array.isArray(t.traits)?t.traits:[]);
  return `
    <div class="dm-character-box">
      <div class="dm-card ${sel?'selected':''}" onclick="selectFromPanel('${kind}','${t.id}')">
        <div class="avatar"><img src="assets/class_icons/${escapeHtml(t.cls)}.svg" alt=""></div>
        <div class="name">${escapeHtml(t.name)}</div>
        <div class="badges">
          <span class="badge">${escapeHtml(t.cls)}</span>
          ${hpBadge}
          ${extra.map(x=>`<span class="badge">${escapeHtml(x)}</span>`).join('')}
        </div>
      </div>
      <div class="dm-actions">
        <button class="dm-title-btn short adv" title="Advantage" onclick="quickAdvFor('${kind}','${t.id}')">A</button>
        <button class="dm-title-btn short dis" title="Disadvantage" onclick="quickDisFor('${kind}','${t.id}')">D</button>
      </div>
    </div>
  `;
}

function quickAdvFor(kind,id){ showToast('Advantage', `${kind.toUpperCase()} ${id}: roll 2d20, keep highest.`); }
function quickDisFor(kind,id){ showToast('Disadvantage', `${kind.toUpperCase()} ${id}: roll 2d20, keep lowest.`); }

function dmTabButton(id,label,active){
  return `<button class="dm-tab ${active?'active':''}" onclick="setDmTab('${id}')">${label}</button>`;
}

function setEnvironment(env){
  state.ui.environment = env || null;
  save();
  if(state.route==='dm' && state.ui.dmTab==='tools'){ renderDmPage(); }
}

function selectFromPanel(kind,id){
  state.selected = { kind, id };
  save();
  renderDmPage();
}

function renderDmPage(){
  const bodyEl = document.getElementById('dm-body'); if(!bodyEl) return;
  const tab = state.ui.dmTab || 'party';

  const tabsHtml = `
    ${dmTabButton('party','Party',tab==='party')}
    ${dmTabButton('npcs','NPCs',tab==='npcs')}
    ${dmTabButton('enemies','Enemies',tab==='enemies')}
    ${dmTabButton('notes','Notes',tab==='notes')}
    ${dmTabButton('tools','Tools',tab==='tools')}
  `;

  let body = '';

  if(tab==='party'){
    const pcs = getPartyTokens();
    body += `<div class="dm-grid3">${
      pcs.length
        ? pcs.map(p=>tokenCard('pc',p)).join('')
        : `<div class="panel" style="grid-column:1/-1; text-align:center; padding:16px;">
             <h3 style="margin:0 0 8px;">No party members yet</h3>
             <div class="small">Open <strong>Character Manager</strong> and tick “In Party” for the characters you want here.</div>
             <div style="margin-top:10px;"><button class="btn tiny" onclick="nav('characters')">Open Character Manager</button></div>
           </div>`
    }</div>`;
  }

  if(tab==='npcs'){ body+=`<div class="dm-grid3">${state.tokens.npc.map(n=>tokenCard('npc',n)).join('')||'<div class="small">No NPCs yet.</div>'}</div>`; }
  if(tab==='enemies'){ body+=`<div class="dm-grid3">${state.tokens.enemy.map(n=>tokenCard('enemy',n)).join('')||'<div class="small">No Enemies yet.</div>'}</div>`; }

  if(tab==='notes'){
    body+=`
      <div class="dm-section">
        <div class="dm-sec-head"><span>DM Notes</span></div>
        <textarea id="dm-notes" rows="12" style="width:100%">${escapeHtml(state.notes||'')}</textarea>
      </div>`;
  }

  if(tab==='tools'){
    const env = state.ui.environment;
    const effects = computeEnvironmentEffects();
    const mapButtons = (MAPS||[]).map((m,i)=>`
      <button type="button" class="map-pill ${state.worldIndex===i?'active':''}" onclick="(state.worldIndex=${i}), (state.worldSrc='${escapeHtml(m.src)}'), save(), renderWorld(), renderWorldMapList(), syncWorldViewer()">${escapeHtml(m.name || (m.src.split('/').pop()))}</button>
    `).join('');

    body+=`
      <div class="dm-section">
        <div class="dm-sec-head"><span>Environment / Terrain</span></div>
        <div class="env-grid">
          ${ENVIRONMENTS.map(e=>`<button type="button" class="env-pill ${state.ui.environment===e?'active':''}" onclick="setEnvironment('${e}')">${e}</button>`).join('')}
        </div>
        <div class="dm-detail" style="margin-top:8px">
          ${env ? `<strong>Selected:</strong> ${env}` : 'Select an environment to see advantages/disadvantages.'}
          ${effects.lines.length ? `<div style="margin-top:6px">${effects.lines.map(l=>`• ${escapeHtml(l)}`).join('<br>')}</div>` : ''}
        </div>
      </div>

      <div class="dm-section" style="margin-top:10px">
        <div class="dm-sec-head"><span>Maps (World)</span></div>
        <div class="map-list">
          ${mapButtons || '<div class="small">No maps yet. Add files to MapsKit/assets/maps and rebuild index.json/index.js.</div>'}
        </div>
        <div class="dm-detail" style="margin-top:8px">
          Current: ${escapeHtml(state.worldSrc || 'None')}
          <div style="margin-top:8px; display:flex; gap:8px; flex-wrap:wrap;">
            <button class="btn tiny" onclick="openWorldViewer()">Open Pop-out</button>
            <button class="btn tiny" onclick="renderWorld()">Refresh</button>
          </div>
        </div>
      </div>

      <div class="dm-section" style="margin-top:10px">
        <div class="dm-sec-head"><span>Quick Dice</span></div>

        <div class="quick-dice-row">
          ${[4,6,8,10,12,20].map(n => `
  <button class="quick-die-btn" onclick="dmAddDie(${n})" aria-label="d${n}">
    <span class="die-icon">d${n}</span>
  </button>`).join('')}
        </div>

        <div class="dm-quick-bar" style="display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-top:8px">
          <div id="dm-dice-selection" class="small">No dice selected</div>
          <button class="btn btn-xl" onclick="dmRollAll()">Roll</button>
          <button class="btn btn-xl" onclick="dmClearDice()">Clear</button>
        </div>

        <div id="dm-dice-output" class="roll-output" style="margin-top:8px">
          <div class="dice-hero" style="color:#d6ed17">
            <img src="assets/icons/d20-lime.svg" alt="d20" />
          </div>
          <div class="roll-card">
            <div class="roll-total">—</div>
            <div class="roll-breakdown">Add dice to roll…</div>
          </div>
        </div>
      </div>

      <!-- NEW: Backup / Restore (small, non-invasive) -->
      <div class="dm-section" style="margin-top:10px">
        <div class="dm-sec-head"><span>Backup / Restore</span></div>
        <div class="small">Export or import your device-local data (settings, notes, and characters).</div>
        <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:8px">
          <button class="btn" id="dm-btn-export">Export data</button>
          <label class="btn" for="dm-file-import" style="cursor:pointer">Import data…</label>
          <input type="file" id="dm-file-import" accept="application/json" style="display:none" />
          <button class="btn ghost" id="dm-btn-reset">Reset all</button>
        </div>
        <div class="tiny" style="margin-top:6px; color:#9bb6d6">Keys: <code>tp_state_v26</code>, <code>tp_cc_characters</code></div>
      </div>`;
  }

  bodyEl.innerHTML = body;

  const notesEl=document.getElementById('dm-notes');
  if(notesEl){ notesEl.addEventListener('input', ()=>{ state.notes=notesEl.value; save(); }); }
  if(tab==='tools'){ dmInitQuickDice(); dmInitBackup(); }
}

/* ========= DM Quick Dice ========= */
let dmDiceSelection = [];
let dmLastRollDisplayed = false;

function dmInitQuickDice(){
  dmDiceSelection = [];
  dmUpdateDiceSelectionText();
}

/* Helpers shared with main dice */
function dmUpdateRollOutput(total, breakdown){
  const out = document.getElementById('dm-dice-output');
  if(!out) return;
  const t = out.querySelector('.roll-total');
  const b = out.querySelector('.roll-breakdown');
  t.textContent = total;
  b.textContent = breakdown;
}
function dmAddDie(n){
  dmDiceSelection.push(n);
  dmUpdateDiceSelectionText();
}
function dmClearDice(){
  dmDiceSelection = [];
  dmUpdateDiceSelectionText();
  dmUpdateRollOutput('—','Add dice to roll…');
  dmLastRollDisplayed = false;
}
function dmUpdateDiceSelectionText(){
  const el = document.getElementById('dm-dice-selection'); if(!el) return;
  if(!dmDiceSelection.length){ el.textContent = 'No dice selected'; return; }
  const map = {};
  dmDiceSelection.forEach(n=> map[n]=(map[n]||0)+1 );
  const parts = Object.keys(map).sort((a,b)=>+a-+b).map(k=>`${map[k]}×d${k}`);
  el.textContent = parts.join(' · ');
}
function dmRollAll(){
  if(!dmDiceSelection.length) return;
  const out = document.getElementById('dm-dice-output'); if(!out) return;
  const totalEl = out.querySelector('.roll-total');
  const breakdownEl = out.querySelector('.roll-breakdown');

  const tMax = 900;
  const stepTime = 70;
  let t = 0;
  dmLastRollDisplayed = false;

  const scramble = ()=>{
    if(t >= tMax){
      dmLastRollDisplayed = true;
      const results = dmDiceSelection.map(n => 1 + Math.floor(Math.random()*n));
      const total = results.reduce((a,b)=>a+b,0);
      dmUpdateRollOutput(total, results.join(' + '));
      return;
    }
    const temp = dmDiceSelection.map(n => 1 + Math.floor(Math.random()*n));
    const tempTotal = temp.reduce((a,b)=>a+b,0);
    if(totalEl) totalEl.textContent = tempTotal;
    if(breakdownEl) breakdownEl.textContent = temp.join(' + ');
    t += stepTime;
    setTimeout(scramble, stepTime);
  };
  scramble();
}

/* ========= DM Backup / Restore ========= */
function dmInitBackup(){
  const btnExport = document.getElementById('dm-btn-export');
  const fileImport = document.getElementById('dm-file-import');
  const btnReset = document.getElementById('dm-btn-reset');
  btnExport?.addEventListener('click', dmDoExport);
  fileImport?.addEventListener('change', dmDoImport);
  btnReset?.addEventListener('click', dmDoReset);
}
function dmDoExport(){
  const payload = {
    _meta: { app: 'DocumentsTabletopPals', when: new Date().toISOString(), version: 'v26' },
    tp_state_v26: null,
    tp_cc_characters: null
  };
  try { payload.tp_state_v26 = JSON.parse(localStorage.getItem('tp_state_v26') || 'null'); } catch { payload.tp_state_v26 = null; }
  try { payload.tp_cc_characters = JSON.parse(localStorage.getItem('tp_cc_characters') || 'null'); } catch { payload.tp_cc_characters = null; }

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  const stamp = new Date().toISOString().slice(0,19).replace(/[:T]/g,'-');
  a.href = URL.createObjectURL(blob);
  a.download = `DocumentsTabletopPals-backup-${stamp}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=> URL.revokeObjectURL(a.href), 4000);
}
function dmDoImport(ev){
  const file = ev.target?.files?.[0]; if(!file) return;
  const reader = new FileReader();
  reader.onload = ()=>{
    try{
      const data = JSON.parse(String(reader.result||'{}'));
      if('tp_state_v26' in data){ localStorage.setItem('tp_state_v26', JSON.stringify(data.tp_state_v26)); }
      if('tp_cc_characters' in data){ localStorage.setItem('tp_cc_characters', JSON.stringify(data.tp_cc_characters)); }
      alert('Import complete. The page will reload.'); location.reload();
    }catch(e){
      alert('Import failed: invalid file.');
    }
  };
  reader.readAsText(file);
  ev.target.value = '';
}
function dmDoReset(){
  if(!confirm('This will clear all toolkit data on this device.\n\nContinue?')) return;
  localStorage.removeItem('tp_state_v26');
  localStorage.removeItem('tp_cc_characters');
  location.reload();
}

/* ========= Toast ========= */
let activeToast = null;
function showToast(title,msg, opts){
  closeAllToasts();
  const div=document.createElement('div');
  div.className='dm-toast';
  div.innerHTML=`
    <div class="close" onclick="this.parentElement.remove()">×</div>
    <h4>${escapeHtml(title)}</h4>
    <div class="msg"></div>
  `;
  const body = div.querySelector('.msg');
  body.textContent = String(msg); // preserves \n with CSS white-space:pre-wrap
  document.body.appendChild(div);
  activeToast = div;
  const ms = (opts && opts.duration) ? opts.duration : 7000;
  setTimeout(()=>{ if(div===activeToast){ div.remove(); activeToast=null; } }, ms);
}
function closeAllToasts(){
  document.querySelectorAll('.dm-toast').forEach(t=>t.remove());
}

/* ========= Dice (app-wide) ========= */
function addDie(n){ diceSelection.push(n); renderDice(); }
function clearDice(){ diceSelection = []; renderDice(); updateRollOutput('—','Add dice to roll…'); lastRollDisplayed=false; }
function rollAll(){
  if(!diceSelection.length) return;
  startRollAnimation();
}
function renderDice(){
  const out = document.getElementById('dice-output');
  if(!out) return;
  const sel = diceSelection.slice().sort((a,b)=>a-b);
  const map = {};
  sel.forEach(n=> map[n]=(map[n]||0)+1 );
  const parts = Object.keys(map).sort((a,b)=>+a-+b).map(k=>`${map[k]}×d${k}`);
  out.querySelector('.roll-breakdown').textContent = parts.length ? parts.join(' · ') : 'Add dice to roll…';
}

/* ========= Expose for onclicks ========= */
window.nav = nav;

window.renderWorld = renderWorld;
window.openWorldViewer = openWorldViewer;
window.reloadMaps = reloadMaps;
window.toggleWorldFullscreen = toggleWorldFullscreen;
window.toggleWorldScale = toggleWorldScale;

window.renderWorldMapList = renderWorldMapList;

window.renderDmPage = renderDmPage;
window.setDmTab = (tab)=>{ state.ui.dmTab=tab; save(); renderDmPage(); };

window.rollAll=rollAll;
window.clearDice=clearDice;
window.addDie=addDie;
window.renderDice=renderDice;

window.dmAddDie = dmAddDie;
window.dmClearDice = dmClearDice;
window.dmRollAll = dmRollAll;

window.quickAdvFor = quickAdvFor;
window.quickDisFor = quickDisFor;
