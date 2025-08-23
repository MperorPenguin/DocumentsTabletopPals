// ===== State =====
const state = load() || {
  route: 'home',
  boardBg: null,
  gallery: [],
  tokens: {
    pc: [
      {id:'p1', name:'Aria',   cls:'Rogue',   hp:[10,10], pos:[2,3]},
      {id:'p2', name:'Bronn',  cls:'Fighter', hp:[13,13], pos:[4,4]},
    ],
    npc: [
      {id:'n1', name:'Elder Bran', cls:'NPC', hp:[6,6], pos:[7,6]},
    ],
    enemy: [
      {id:'e1', name:'Skeleton A', cls:'Enemy', hp:[13,13], pos:[23,8]},
    ]
  },
  selected: null,
  notes: '',
  ui: { dmOpen:false, dmTab:'party' }
};

// ===== Persistence =====
function save(){ localStorage.setItem('tp_state', JSON.stringify(state)); }
function load(){ try{ return JSON.parse(localStorage.getItem('tp_state')); }catch(e){ return null; } }

// ===== Routing =====
function nav(route){
  state.route = route; save();
  const views = ['home','board','gallery','chars','npcs','enemies','dice','notes','save'];
  views.forEach(v=>{
    const main = document.getElementById('view-'+v);
    const btn  = document.getElementById('nav-'+v);
    if(!main||!btn) return;
    if(v===route){ main.classList.remove('hidden'); btn.classList.add('active'); }
    else{ main.classList.add('hidden'); btn.classList.remove('active'); }
  });
  render();
}

// ===== Board =====
const boardEl = () => document.getElementById('board');
function cellsz(){
  const cs = getComputedStyle(boardEl()).getPropertyValue('--cell').trim();
  return parseInt(cs.replace('px','')) || 42;
}
function boardClick(ev){
  const rect = boardEl().getBoundingClientRect();
  const x = Math.floor((ev.clientX - rect.left) / cellsz());
  const y = Math.floor((ev.clientY - rect.top)  / cellsz());
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

function renderBoard(){
  const el = boardEl();
  if(!el) return;

  el.style.backgroundImage = state.boardBg
    ? `url("${state.boardBg}")`
    : 'linear-gradient(#1b2436,#0f1524)';

  const size = cellsz();
  el.innerHTML = '';

  // Fullscreen toggle button (overlay)
  const btn = document.createElement('button');
  btn.className = 'board-full-btn';
  btn.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M9 3H5a2 2 0 0 0-2 2v4M15 3h4a2 2 0 0 1 2 2v4M9 21H5a2 2 0 0 1-2-2v-4M15 21h4a2 2 0 0 0 2-2v-4"/>
    </svg>
    <span id="fs-label">${isFullscreen()? 'Exit' : 'Full'}</span>
  `;
  btn.onclick = toggleBoardFullscreen;
  el.appendChild(btn);

  // Tokens
  ['pc','npc','enemy'].forEach(kind=>{
    (state.tokens[kind] || []).forEach(t=>{
      const tok = document.createElement('div');
      tok.className = `token ${kind}` + (state.selected && state.selected.id===t.id && state.selected.kind===kind ? ' selected':'');
      tok.dataset.id = t.id;
      tok.dataset.kind = kind;
      tok.title = t.name;
      tok.style.left = (t.pos[0]*size + 2) + 'px';
      tok.style.top  = (t.pos[1]*size + 2) + 'px';
      tok.style.width = (size-6) + 'px';
      tok.style.height= (size-6) + 'px';
      tok.onclick = (e)=>{ e.stopPropagation(); selectTokenDom(kind,t.id); };
      const img = document.createElement('img');
      img.loading='lazy';
      img.src = `assets/class_icons/${t.cls}.svg`;
      tok.appendChild(img);
      el.appendChild(tok);
    });
  });

  renderMapStrip();
  updateDmFab();
}

// Fullscreen helpers (Board)
function isFullscreen(){
  return document.fullscreenElement === boardEl();
}
function toggleBoardFullscreen(){
  const el = boardEl();
  if(!el) return;
  if(!document.fullscreenElement){
    el.requestFullscreen?.();
  }else{
    document.exitFullscreen?.();
  }
}
document.addEventListener('fullscreenchange', ()=>{
  // Update button label when user exits with ESC, etc.
  const label = document.getElementById('fs-label');
  if(label) label.textContent = isFullscreen()? 'Exit' : 'Full';
});

// ===== Map Strip (Board) =====
function renderMapStrip(){
  const strip = document.getElementById('map-strip');
  if(!strip) return;
  if(!state.gallery.length){
    strip.style.display='none';
    strip.innerHTML = '';
    return;
  }
  strip.style.display='flex';
  strip.innerHTML = '';
  state.gallery.forEach(g=>{
    const card = document.createElement('div');
    card.className = 'map-thumb';
    card.title = g.name;
    card.onclick = ()=>{ state.boardBg = g.dataUrl; save(); renderBoard(); };
    const img = document.createElement('img');
    img.src = g.dataUrl;
    const label = document.createElement('div');
    label.className='label';
    label.textContent = g.name;
    card.appendChild(img); card.appendChild(label);
    strip.appendChild(card);
  });
}

// ===== Gallery =====
function addGalleryFiles(files){
  if(!files || !files.length) return;
  const list = Array.from(files);
  let pending = list.length;
  list.forEach(f=>{
    const ext = (f.name.split('.').pop()||'').toLowerCase();
    if(!['png','jpg','jpeg','svg'].includes(ext)){ pending--; return; }
    const reader = new FileReader();
    reader.onload = (e)=>{
      const dataUrl = e.target.result;
      const id = 'm'+Math.random().toString(36).slice(2,8);
      state.gallery.push({id, name:f.name.replace(/\.[^.]+$/,''), dataUrl, ext});
      pending--;
      if(pending===0){ save(); renderGallery(); renderMapStrip(); updateDmFab(); }
    };
    if(ext==='svg') reader.readAsText(f); else reader.readAsDataURL(f);
  });
}
function galleryDrop(ev){
  ev.preventDefault();
  const files = ev.dataTransfer.files;
  addGalleryFiles(files);
}
function clearEmptyGallery(){
  state.gallery = state.gallery.filter(g=>g && g.dataUrl);
  save(); renderGallery();
}
function useOnBoard(id){
  const g = state.gallery.find(x=>x.id===id);
  if(!g) return;
  state.boardBg = g.dataUrl;
  save();
  nav('board');
}
function deleteMap(id){
  state.gallery = state.gallery.filter(x=>x.id!==id);
  if(state.boardBg){
    const stillExists = state.gallery.some(x=>x.dataUrl===state.boardBg);
    if(!stillExists) state.boardBg = null;
  }
  save(); renderGallery(); renderMapStrip(); renderBoard();
}
function renderGallery(){
  const grid = document.getElementById('gallery-grid');
  if(!grid) return;
  if(!state.gallery.length){
    grid.innerHTML = `<div class="small">No maps yet. Upload PNG/JPEG/SVG above.</div>`;
    return;
  }
  grid.innerHTML = state.gallery.map(g=>`
    <div class="gallery-card">
      <div class="thumb">${thumbImg(g)}</div>
      <div class="meta">
        <div class="name" title="${escapeHtml(g.name)}">${escapeHtml(g.name)}</div>
        <div class="row">
          <button class="btn tiny" onclick="useOnBoard('${g.id}')">Use on Board</button>
          <button class="btn tiny" onclick="deleteMap('${g.id}')">Delete</button>
        </div>
      </div>
    </div>
  `).join('');
}
function thumbImg(g){
  if(g.ext==='svg' && !g.dataUrl.startsWith('data:image')){
    const svg = encodeURIComponent(g.dataUrl);
    return `<img src="data:image/svg+xml;utf8,${svg}">`;
  }else{
    return `<img src="${g.dataUrl}">`;
  }
}

// ===== DM Panel =====
function maximizeDmPanel(){ state.ui.dmOpen = true; save(); renderDmPanel(); updateDmFab(); }
function minimizeDmPanel(){ state.ui.dmOpen = false; save(); renderDmPanel(); updateDmFab(); }
function toggleDmPanel(){ state.ui.dmOpen = !state.ui.dmOpen; save(); renderDmPanel(); updateDmFab(); }

document.addEventListener('keydown', (e)=>{
  if(e.shiftKey && (e.key==='D' || e.key==='d')){ e.preventDefault(); toggleDmPanel(); }
});

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

function tokenCardWithAdv(kind,t){
  const sel = state.selected && state.selected.kind===kind && state.selected.id===t.id;
  return `
    <div class="dm-character-box">
      <div class="dm-card ${sel?'selected':''}" onclick="selectFromPanel('${kind}','${t.id}')">
        <div class="avatar"><img src="assets/class_icons/${t.cls}.svg" alt=""></div>
        <div class="name">${escapeHtml(t.name)}</div>
        <div class="badges">
          <span class="badge">${escapeHtml(t.cls)}</span>
          <span class="badge">HP ${t.hp[0]}/${t.hp[1]}</span>
        </div>
      </div>
      <div class="dm-actions">
        <button class="dm-title-btn short adv" title="Advantage" onclick="quickAdvFor('${kind}','${t.id}')">A</button>
        <button class="dm-title-btn short dis" title="Disadvantage" onclick="quickDisFor('${kind}','${t.id}')">D</button>
      </div>
    </div>`;
}
function selectFromPanel(kind,id){
  state.selected = {kind,id}; save();
  renderDmPanel();
  if(state.route!=='board') nav('board'); else renderBoard();
}

function renderDmPanel(){
  const panel=document.getElementById('dm-panel');
  if(!panel) return;

  if(!state.ui.dmOpen){
    panel.classList.add('hidden');
    return;
  }
  panel.classList.remove('hidden');

  const pcs = state.tokens.pc||[];
  const npcs= state.tokens.npc||[];
  const enemies= state.tokens.enemy||[];
  const tab= state.ui.dmTab||'party';

  const tabsHtml=`<div class="dm-tabs">
    ${dmTabButton('party','Party',tab==='party')}
    ${dmTabButton('npcs','NPCs',tab==='npcs')}
    ${dmTabButton('enemies','Enemies',tab==='enemies')}
    ${dmTabButton('scene','Scene',tab==='scene')}
    ${dmTabButton('tools','Tools',tab==='tools')}
  </div>`;

  let body='';
  if(tab==='party'){
    body += `<div class="dm-grid3">
      ${pcs.map(p=>tokenCardWithAdv('pc',p)).join('')||'<div class="small">No PCs yet.</div>'}
    </div>`;
  }
  if(tab==='npcs'){
    body += `<div class="dm-grid3">
      ${npcs.map(n=>tokenCardWithAdv('npc',n)).join('')||'<div class="small">No NPCs yet.</div>'}
    </div>`;
  }
  if(tab==='enemies'){
    body += `<div class="dm-grid3">
      ${enemies.map(e=>tokenCardWithAdv('enemy',e)).join('')||'<div class="small">No Enemies yet.</div>'}
    </div>`;
  }
  if(tab==='scene'){
    body += `
      <div class="dm-section">
        <div class="dm-sec-head"><span>Scene Controls</span></div>
        <div class="dm-grid3">
          <button class="dm-title-btn" onclick="nav('gallery')">Open Gallery</button>
          <button class="dm-title-btn" onclick="state.boardBg=null; save(); renderBoard()">Clear Map</button>
          <button class="dm-title-btn" onclick="nav('board')">Go to Board</button>
        </div>
        <div class="dm-detail" style="margin-top:10px">
          Current map: ${state.boardBg ? 'Loaded' : 'None'}.
        </div>
      </div>

      <div class="dm-section" style="margin-top:10px">
        <div class="dm-sec-head"><span>Notes</span></div>
        <textarea id="dm-notes" rows="6" style="width:100%">${escapeHtml(state.notes||'')}</textarea>
      </div>`;
  }
  if(tab==='tools'){
    body += `<div class="dm-grid3">
      <div class="dm-section">
        <div class="dm-sec-head"><span>Quick d20</span></div>
        <button class="dm-title-btn" onclick="quickD20()">Roll d20</button>
        <div id="dm-last-roll" class="dm-detail" style="margin-top:8px">—</div>
      </div>
      <div class="dm-section">
        <div class="dm-sec-head"><span>Jump</span></div>
        <button class="dm-title-btn" onclick="nav('board')">Board</button>
        <button class="dm-title-btn" onclick="nav('gallery')">Gallery</button>
        <button class="dm-title-btn" onclick="nav('dice')">Dice</button>
      </div>
    </div>`;
  }

  panel.innerHTML=`
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
      const n=document.getElementById('notes');
      if(n) n.value=state.notes;
    });
  }
}

// ===== Floating toast =====
function showToast(title,msg){
  let t=document.querySelector('.dm-toast');
  if(t) t.remove();
  const div=document.createElement('div');
  div.className='dm-toast fade';
  div.innerHTML=`
    <div class="close" onclick="this.parentElement.remove()">×</div>
    <h4>${escapeHtml(title)}</h4>
    <div>${escapeHtml(msg)}</div>
  `;
  document.body.appendChild(div);
}

// ===== Quick rolls used by A/D and Tools =====
function quickD20(){
  const v=1+Math.floor(Math.random()*20);
  const box=document.getElementById('dm-last-roll');
  if(box) box.textContent=`d20: ${v}`;
  showToast('Quick d20', `→ ${v}`);
}
function quickAdvFor(kind,id){
  const a=1+Math.floor(Math.random()*20);
  const b=1+Math.floor(Math.random()*20);
  const res=Math.max(a,b);
  const list=state.tokens[kind]||[];
  const name=(list.find(x=>x.id===id)?.name)||kind.toUpperCase();
  const box=document.getElementById('dm-last-roll');
  if(box) box.textContent=`Advantage: ${a} vs ${b} ⇒ ${res}`;
  showToast(name, `Advantage → ${res} (${a} vs ${b})`);
}
function quickDisFor(kind,id){
  const a=1+Math.floor(Math.random()*20);
  const b=1+Math.floor(Math.random()*20);
  const res=Math.min(a,b);
  const list=state.tokens[kind]||[];
  const name=(list.find(x=>x.id===id)?.name)||kind.toUpperCase();
  const box=document.getElementById('dm-last-roll');
  if(box) box.textContent=`Disadvantage: ${a} vs ${b} ⇒ ${res}`;
  showToast(name, `Disadvantage → ${res} (${a} vs ${b})`);
}

// ===== Dice =====
const dice=['d4','d6','d8','d10','d12','d20'];
let selectedDice=[];
function renderDiceButtons(){
  const row=document.getElementById('dice-buttons');
  if(!row) return;
  row.innerHTML=dice.map(s=>`
    <button class="die-btn" onclick="addDie('${s}')">
      <span class="die-icon">${polyIcon(s)}</span>${s.toUpperCase()}
    </button>`).join('');
}
function addDie(s){ selectedDice.push(s); updateDiceSelection(); shakeOutput(); }
function clearDice(){ selectedDice=[]; updateDiceSelection(); document.getElementById('dice-output').innerHTML=''; }
function updateDiceSelection(){
  const el=document.getElementById('dice-selection');
  if(!el) return;
  el.textContent= selectedDice.length? selectedDice.join(' + '):'No dice selected';
}
function polyIcon(s){
  const map={d4:3,d6:4,d8:6,d10:7,d12:8,d20:10};
  const sides=map[s]||6;
  return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
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
function roll(tag){
  const n=parseInt(tag.replace('d',''),10)||6;
  return 1+Math.floor(Math.random()*n);
}
function shakeOutput(){
  const out=document.getElementById('dice-output');
  out.classList.remove('shake'); void out.offsetWidth; out.classList.add('shake');
}

// ===== Utilities =====
function escapeHtml(s){ return (s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

// ===== Initial render =====
function render(){
  const ids=['home','board','gallery','chars','npcs','enemies','dice','notes','save'];
  ids.forEach(id=>{
    const b=document.getElementById('nav-'+id);
    if(b) b.classList.toggle('active', state.route===id);
  });

  if(state.route==='board'){ renderBoard(); }
  if(state.route==='gallery'){ renderGallery(); }
  if(state.route==='dice'){ renderDiceButtons(); updateDiceSelection(); }

  // DM UI
  updateDmFab();
  renderDmPanel();

  // Sync Notes page textarea
  const notes=document.getElementById('notes');
  if(notes) notes.value=state.notes||'';
}

// boot
document.addEventListener('DOMContentLoaded', ()=>{
  nav(state.route||'home');
});
