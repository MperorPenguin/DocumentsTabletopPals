/* ================================
   Tabletop Pals — DM Lite v2.1
   Single-file app logic
   ================================ */

/* ---------- Class icon paths ---------- */
const ICONS = {
  Barbarian: 'assets/class_icons/Barbarian.svg',
  Bard:      'assets/class_icons/Bard.svg',
  Cleric:    'assets/class_icons/Cleric.svg',
  Druid:     'assets/class_icons/Druid.svg',
  Fighter:   'assets/class_icons/Fighter.svg',
  Monk:      'assets/class_icons/Monk.svg',
  Paladin:   'assets/class_icons/Paladin.svg',
  Ranger:    'assets/class_icons/Ranger.svg',
  Rogue:     'assets/class_icons/Rogue.svg',
  Sorcerer:  'assets/class_icons/Sorcerer.svg',
  Warlock:   'assets/class_icons/Warlock.svg',
  Wizard:    'assets/class_icons/Wizard.svg',
};

/* ---------- Terrain configuration + guidance ---------- */
const TERRAIN = {
  Forest:   { tips:['Undergrowth (difficult)','Cover available'], adv:[{want:'stealth'},{tag:'beast'}], dis:[{armor:'heavy'}] },
  Swamp:    { tips:['Mud & water (difficult)'], adv:[{mode:'swim'}], dis:[{armor:'heavy'},{want:'stealth'}] },
  Desert:   { tips:['Heat & mirage','Open sightlines'], adv:[{want:'ranged'}], dis:[{want:'stealth'}] },
  Mountain: { tips:['Steep slopes','High winds'], adv:[{mode:'fly'}], dis:[{armor:'heavy'}] },
  Urban:    { tips:['Tight alleys','Guards nearby'], adv:[{want:'stealth'}], dis:[] },
  Dungeon:  { tips:['Tight corridors','Darkness common'], adv:[{want:'darkvision'}], dis:[{armor:'heavy'}] },
  Arctic:   { tips:['Ice & snow','Extreme cold'], adv:[{mode:'walk'}], dis:[{armor:'heavy'}] },
  Coastal:  { tips:['Slippery rocks'], adv:[{mode:'swim'}], dis:[{armor:'heavy'}] },
};

/* ---------- App state ---------- */
const DEFAULT_STATE = {
  route: 'home',
  terrain: 'Forest',
  map: { cols: 20, rows: 15, cell: 40, bgDataUrl: null },
  selected: null, // { kind:'pc'|'enemy', id:'p1' }
  players: [
    { id:'p1', name:'Aria', cls:'Rogue',   level:1, token:{x:3,y:4}, tags:{ armor:'light', modes:['walk'], wants:['stealth','ranged'] }, avatar: ICONS.Rogue },
    { id:'p2', name:'Bronn', cls:'Fighter', level:1, token:{x:5,y:6}, tags:{ armor:'heavy', modes:['walk'], wants:['melee'] },        avatar: ICONS.Fighter },
  ],
  enemies: [
    { id:'e1', name:'Skeleton A', cls:'Wizard', ac:13, hp:13, token:{x:10,y:7}, type:'undead', tags:{ armor:'medium', modes:['walk'] }, avatar: ICONS.Wizard }
  ],
  notes: '',
  dice: { expr:'d20', last:'—', log:[] },
  ui: { terrainFocus: null }, // which chip index is expanded in the HUD
};

let state = load() || DEFAULT_STATE;

/* ---------- Persistence ---------- */
function save() {
  try { localStorage.setItem('tp_dm_lite_v2_1', JSON.stringify(state)); } catch(e) {}
}
function load() {
  try { return JSON.parse(localStorage.getItem('tp_dm_lite_v2_1')); } catch(e) { return null; }
}

/* ---------- Utilities ---------- */
function qs(sel, root = document) { return root.querySelector(sel); }
function qsa(sel, root = document) { return [...root.querySelectorAll(sel)]; }
function esc(s) { return (''+s).replace(/[&<>]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[m])); }
function clamp(v, min, max){ return Math.max(min, Math.min(max, v)); }

/* ---------- Router ---------- */
function navigate(route) {
  state.route = route;
  save();
  renderRoute();
  renderHUD();
  // mark active nav button
  qsa('nav button').forEach(b => b.classList.toggle('active', b.textContent.toLowerCase() === route));
}
function showView(id) {
  qsa('.view').forEach(v => v.classList.add('hidden'));
  const el = qs(`#view-${id}`);
  if (el) el.classList.remove('hidden');
}

/* ---------- Board ---------- */
function renderBoard() {
  const main = qs('#view-board');
  if (!main) return;

  const board = qs('#board', main);
  if (!board) return;

  // reset board content (keep CSS grid)
  board.innerHTML = '';

  // Scene background
  if (state.map.bgDataUrl) {
    const bg = document.createElement('img');
    bg.className = 'scene-bg';
    bg.src = state.map.bgDataUrl;
    board.appendChild(bg);
  }

  // Place tokens (players then enemies)
  const place = (obj, kind) => {
    const token = document.createElement('div');
    token.className = 'token';
    token.style.gridColumn = (obj.token.x + 1);
    token.style.gridRow = (obj.token.y + 1);

    // image
    const img = document.createElement('img');
    img.src = obj.avatar || (obj.cls && ICONS[obj.cls]) || '';
    img.alt = obj.name;
    token.appendChild(img);

    // selection state
    const selected = state.selected && state.selected.kind === kind && state.selected.id === obj.id;
    if (selected) token.classList.add('selected');

    token.title = `${obj.name}`;
    token.addEventListener('click', (ev) => {
      ev.stopPropagation();
      state.selected = { kind, id: obj.id };
      save();
      renderBoard();
      renderHUD();
    });

    board.appendChild(token);
  };

  state.players.forEach(p => place(p, 'pc'));
  state.enemies.forEach(e => place(e, 'enemy'));

  // Move selected token by clicking a cell
  board.onclick = (ev) => {
    if (!state.selected) return;
    const rect = board.getBoundingClientRect();
    const x = ev.clientX - rect.left;
    const y = ev.clientY - rect.top;

    // Determine grid cell by approximate fraction within grid
    const colW = rect.width / state.map.cols;
    const rowH = rect.height / state.map.rows;
    const gx = clamp(Math.floor(x / colW), 0, state.map.cols - 1);
    const gy = clamp(Math.floor(y / rowH), 0, state.map.rows - 1);

    const list = state.selected.kind === 'pc' ? state.players : state.enemies;
    const obj = list.find(o => o.id === state.selected.id);
    if (!obj) return;

    obj.token.x = gx;
    obj.token.y = gy;
    save();
    renderBoard();
  };
}

/* ---------- Scene upload ---------- */
function handleSceneUpload(files) {
  if (!files || !files[0]) return;
  const file = files[0];
  const reader = new FileReader();
  reader.onload = (e) => {
    // resize to max width for lighter storage
    const img = new Image();
    img.onload = () => {
      const maxW = 1400;
      const scale = Math.min(1, maxW / img.width);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob((blob) => {
        const fr = new FileReader();
        fr.onload = (e2) => {
          state.map.bgDataUrl = e2.target.result;
          save();
          renderBoard();
        };
        fr.readAsDataURL(blob);
      }, 'image/webp', 0.85);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}
window.handleSceneUpload = handleSceneUpload;

/* ---------- Terrain logic ---------- */
function setTerrain(val){
  state.terrain = val;
  state.ui.terrainFocus = null;
  save();
  renderHUD();
}
window.setTerrain = setTerrain;

function terrainEntries(){
  const cfg = TERRAIN[state.terrain] || {tips:[],adv:[],dis:[]};
  const out = [];
  // tips
  (cfg.tips || []).forEach(t => out.push({ kind:'tip', name:t, why:'' }));

  // party + enemies
  const everyone = [
    ...state.players.map(p=>({...p, kind:'PC'})),
    ...state.enemies.map(e=>({...e, kind:'ENEMY'})),
  ];

  function matches(obj, q) {
    if (q.armor && obj.tags?.armor === q.armor) return true;
    if (q.mode  && (obj.tags?.modes||[]).includes(q.mode)) return true;
    if (q.want  && (obj.tags?.wants||[]).includes(q.want)) return true;
    if (q.tag   && (obj.type === q.tag || obj.tags?.type === q.tag)) return true;
    if (q.cls   && obj.cls === q.cls) return true;
    return false;
  }

  everyone.forEach(o => {
    const adv = (cfg.adv||[]).some(q=>matches(o,q));
    const dis = (cfg.dis||[]).some(q=>matches(o,q));
    if (adv) out.push({kind:'adv', name:o.name, why:`${state.terrain} favors ${o.cls||o.type||'build'} (tags: ${(o.tags?.wants||[]).join(', ')||'—'})`});
    if (dis) out.push({kind:'dis', name:o.name, why:`${state.terrain} hinders ${o.cls||o.type||'build'} (armor: ${o.tags?.armor||'—'}, movement: ${(o.tags?.modes||[]).join(', ')||'—'})`});
  });

  return out;
}

function explainEntry(entry){
  if(entry.kind==='tip'){
    return `Environment note: <b>${entry.name}</b>.`;
  }
  if(entry.kind==='adv'){
    return `<b>${entry.name}</b> may have <b>advantage</b> here. ${entry.why || ''}
      <div class="small" style="opacity:.8;margin-top:4px">Advantage: roll two d20, keep the higher.</div>`;
  }
  if(entry.kind==='dis'){
    return `<b>${entry.name}</b> may suffer <b>disadvantage</b>. ${entry.why || ''}
      <div class="small" style="opacity:.8;margin-top:4px">Disadvantage: roll two d20, keep the lower.</div>`;
  }
  return '';
}

/* ---------- Floating DM HUD ---------- */
function renderHUD(){
  const hud = qs('#dm-hud');
  if(!hud) return;

  // Show the HUD on every route? If you prefer only on board: if(state.route!=='board'){ hud.style.display='none'; return; }
  // For now, show always:
  hud.style.display = 'block';

  const chips = terrainEntries();
  const focus = state.ui.terrainFocus;
  const focusEntry = (focus!=null && chips[focus]) ? chips[focus] : null;

  // Party/enemy quick lists
  const renderMini = (obj, kind) => `
    <div class="item" style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:6px;background:#222;padding:6px;border-radius:6px;border:1px solid #333">
      <div style="display:flex;align-items:center;gap:8px">
        <div class="token" style="width:28px;height:28px;border:1px solid #333">
          <img src="${obj.avatar || (obj.cls && ICONS[obj.cls]) || ''}" alt="${esc(obj.name)}" onerror="this.style.display='none'"/>
        </div>
        <div>
          <div style="font-weight:600">${esc(obj.name)}</div>
          <div class="small">${esc(obj.cls||obj.type||'')}</div>
        </div>
      </div>
      <button class="btn alt" style="padding:4px 8px;font-size:12px" onclick="selectFromHUD('${kind}','${obj.id}')">Select</button>
    </div>
  `;

  hud.innerHTML = `
    <h3>DM Panel</h3>
    <div class="section">
      <div class="small">Terrain</div>
      <select onchange="setTerrain(this.value)" style="width:100%;margin-top:4px">
        ${Object.keys(TERRAIN).map(t=>`<option ${t===state.terrain?'selected':''}>${t}</option>`).join('')}
      </select>
      <div id="terrain-info" class="small" style="margin-top:6px">
        ${(TERRAIN[state.terrain]?.tips||[]).join(' • ') || '—'}
      </div>
      <div id="terrain-chips" class="row-wrap">
        ${chips.map((c,idx)=>{
          const cls = c.kind==='tip' ? '' : (c.kind==='adv' ? 'background:#103d34;border:1px solid #1db954;' : 'background:#3d1010;border:1px solid #e74c3c;');
          const label = c.kind==='tip' ? c.name : `${c.kind==='adv'?'Advantage:':'Disadvantage:'} ${c.name}`;
          return `<span class="chip" style="${cls} cursor:pointer" onclick="toggleChip(${idx})">${esc(label)}</span>`;
        }).join('')}
      </div>
      ${focusEntry ? `<div class="small" style="margin-top:8px;padding:8px;background:#1a1a1a;border:1px solid #333;border-radius:6px">${explainEntry(focusEntry)}</div>` : ''}
    </div>

    <div class="section">
      <div class="small" style="margin-bottom:4px">Party</div>
      ${state.players.map(p=>renderMini(p,'pc')).join('') || '<div class="small">No party yet.</div>'}
    </div>

    <div class="section">
      <div class="small" style="margin-bottom:4px">Enemies</div>
      ${state.enemies.map(e=>renderMini(e,'enemy')).join('') || '<div class="small">No enemies yet.</div>'}
    </div>
  `;
}
function toggleChip(idx){
  state.ui.terrainFocus = (state.ui.terrainFocus === idx ? null : idx);
  save();
  renderHUD();
}
window.toggleChip = toggleChip;
function selectFromHUD(kind, id){
  state.selected = { kind, id };
  save();
  // jump to board if you want:
  navigate('board');
}

/* ---------- Dice Roller ---------- */
function renderDice(){
  const view = qs('#view-dice');
  if(!view) return;
  const wrap = qs('#dice-roller', view);
  if(!wrap) return;

  wrap.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px">
      <div id="dice-box" style="width:64px;height:64px;border:2px solid #e50914;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:800;background:#111">—</div>
      <div>
        <div class="small">Common dice:</div>
        ${['d20','d12','d10','d8','d6','d4'].map(d=>`<button class="btn alt" onclick="setDiceExpr('${d}')">${d}</button>`).join(' ')}
        <div style="margin-top:6px">
          <input id="dice-expr" value="${esc(state.dice.expr)}" style="width:120px;background:#222;border:1px solid #555;color:#eee;padding:6px;border-radius:6px">
          <button class="btn" onclick="rollVisual()">Roll</button>
          <span class="small" style="margin-left:8px">Result: <b id="dice-result">${state.dice.last}</b></span>
        </div>
      </div>
    </div>
    <div class="small" style="margin-top:10px">
      ${state.dice.log.map(l=>`[${new Date(l.t).toLocaleTimeString()}] ${esc(l.expr)} → <b>${l.total}</b> [${l.parts.join(', ')}${l.mod? (l.mod>0? ' + '+l.mod : ' - '+Math.abs(l.mod)) : ''}]`).join('<br>') || 'No rolls yet.'}
    </div>
  `;
}
function setDiceExpr(v){
  state.dice.expr = v;
  save();
  const i = qs('#dice-expr');
  if (i) i.value = v;
}
window.setDiceExpr = setDiceExpr;

function parseDice(expr){
  const m = (expr||'').trim().match(/^(\d+)?d(\d+)([+\-]\d+)?$/i);
  if(!m) return null;
  const n = +(m[1]||1);
  const s = +m[2];
  const mod = +(m[3]||0);
  let parts = [], total = 0;
  for(let i=0;i<n;i++){ const r = 1 + Math.floor(Math.random()*s); parts.push(r); total += r; }
  return { total: total+mod, parts, mod };
}

function rollVisual(){
  const box = qs('#dice-box');
  const out = qs('#dice-result');
  if (!box) return;

  let t=0;
  const timer = setInterval(()=>{
    box.textContent = 1 + Math.floor(Math.random()*20);
    box.style.transform = `rotate(${(Math.random()*20-10).toFixed(0)}deg) scale(1.05)`;
    t++;
    if(t>12){
      clearInterval(timer);
      box.style.transform = 'none';
      const r = parseDice(qs('#dice-expr')?.value || state.dice.expr);
      if (r){
        box.textContent = r.total;
        if (out) out.textContent = r.total;
        state.dice.last = r.total;
        state.dice.expr = qs('#dice-expr')?.value || state.dice.expr;
        state.dice.log.unshift({ expr: state.dice.expr, ...r, t: Date.now() });
        state.dice.log = state.dice.log.slice(0, 50);
        save();
        renderDice();
      } else {
        box.textContent = '×';
      }
    }
  }, 50);
}
window.rollVisual = rollVisual;

/* ---------- Characters / Enemies simple lists ---------- */
function renderCharacters(){
  const v = qs('#view-characters');
  if(!v) return;
  const list = qs('#character-list', v);
  if(!list) return;
  list.innerHTML = state.players.map(p=>`
    <div class="item" style="display:flex;align-items:center;gap:10px;margin-bottom:8px;background:#222;padding:8px;border:1px solid #333;border-radius:8px">
      <div class="token" style="width:36px;height:36px;border:1px solid #333">
        <img src="${p.avatar || (p.cls && ICONS[p.cls]) || ''}" alt="${esc(p.name)}" onerror="this.style.display='none'">
      </div>
      <div>
        <div style="font-weight:600">${esc(p.name)}</div>
        <div class="small">${esc(p.cls)} L${p.level}</div>
      </div>
      <div style="margin-left:auto">
        <button class="btn alt" onclick="state.selected={kind:'pc',id:'${p.id}'}; save(); navigate('board');">Select on Board</button>
      </div>
    </div>
  `).join('');
}

function renderEnemies(){
  const v = qs('#view-enemies');
  if(!v) return;
  const list = qs('#enemy-list', v);
  if(!list) return;
  list.innerHTML = state.enemies.map(e=>`
    <div class="item" style="display:flex;align-items:center;gap:10px;margin-bottom:8px;background:#222;padding:8px;border:1px solid #333;border-radius:8px">
      <div class="token" style="width:36px;height:36px;border:1px solid #333">
        <img src="${e.avatar || ''}" alt="${esc(e.name)}" onerror="this.style.display='none'">
      </div>
      <div>
        <div style="font-weight:600">${esc(e.name)}</div>
        <div class="small">AC ${e.ac} • HP ${e.hp}</div>
      </div>
      <div style="margin-left:auto">
        <button class="btn alt" onclick="state.selected={kind:'enemy',id:'${e.id}'}; save(); navigate('board');">Select on Board</button>
      </div>
    </div>
  `).join('');
}

/* ---------- Notes ---------- */
function renderNotes(){
  const v = qs('#view-notes');
  if(!v) return;
  const ta = qs('#notes', v);
  if(!ta) return;
  ta.value = state.notes || '';
  ta.oninput = () => { state.notes = ta.value; save(); };
}

/* ---------- Route render ---------- */
function renderRoute(){
  showView(state.route);
  if (state.route === 'board') renderBoard();
  if (state.route === 'characters') renderCharacters();
  if (state.route === 'enemies') renderEnemies();
  if (state.route === 'notes') renderNotes();
  if (state.route === 'dice') renderDice();
}

/* ---------- Init ---------- */
function initNavBindings(){
  // set initial "active" state
  qsa('nav button').forEach(b=>{
    b.classList.toggle('active', b.textContent.toLowerCase() === state.route);
  });
}
function init(){
  initNavBindings();
  renderRoute();
  renderHUD();
}
window.navigate = navigate;

document.addEventListener('DOMContentLoaded', init);
