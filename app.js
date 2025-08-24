/* DMToolkit v1.0.0 | app.js | build: 2025-08-24 */

// ===== Fixed Grid =====
const GRID_COLS = 26;
const GRID_ROWS = 26;

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
      {id:'e1', name:'Skeleton A', cls:'Enemy', hp:[13,13], pos:[23,1]},
    ]
  },
  selected: null,
  notes: '',
  ui: { dmOpen:false, dmTab:'party' },
  pendingFiles: [] // for chips; upload is immediate on selection
};

// ===== Live Sync Channel (for Pop‑out viewer) =====
const chan = new BroadcastChannel('board-sync');
function broadcastState(){ chan.postMessage({type:'state', payload:state}); }

// ===== Persistence =====
function save(){ localStorage.setItem('tp_state', JSON.stringify(state)); broadcastState(); }
function load(){ try{ return JSON.parse(localStorage.getItem('tp_state')); }catch(e){ return null; } }

// Prevent accidental navigate on drag/drop
window.addEventListener('dragover', e => e.preventDefault());
window.addEventListener('drop',     e => e.preventDefault());

// ===== Routing & overlays =====
function closeAllOverlays(){ closeGalleryModal(); }
function safeNav(route){ closeAllOverlays(); nav(route); }
function nav(route){
  try{
    closeAllOverlays();
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
  }catch(err){
    console.error('nav error', err);
  }
}

// ===== Board sizing (fit screen, 26x26) =====
const boardEl = () => document.getElementById('board');

function fitBoard(){
  const el = boardEl(); if(!el) return;
  const vpH = Math.min(window.innerHeight, (window.visualViewport?.height || window.innerHeight));
  const vpW = Math.min(window.innerWidth,  (window.visualViewport?.width  || window.innerWidth));
  const SAFE_H_PAD = 140, SAFE_W_PAD = 24;
  const availH = Math.max(240, vpH - SAFE_H_PAD);
  const availW = Math.max(240, vpW - SAFE_W_PAD);
  const maxSquare = Math.floor(Math.min(availW, availH));
  const GRID = Math.max(GRID_COLS, GRID_ROWS);
  const cell = Math.max(16, Math.floor(maxSquare / GRID));
  const boardSize = cell * GRID;
  el.style.setProperty('--cell', cell + 'px');
  el.style.setProperty('--boardSize', boardSize + 'px');
}
window.addEventListener('resize', ()=>{ fitBoard(); renderBoard(); });
document.addEventListener('fullscreenchange', ()=>{ fitBoard(); renderBoard(); });

// ===== Board interactions =====
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

// ===== Board render =====
function renderBoard(){
  const el = boardEl(); if(!el) return;
  fitBoard();

  el.style.backgroundImage = state.boardBg
    ? `url("${state.boardBg}")`
    : 'linear-gradient(#1b2436,#0f1524)';

  const size = cellsz();
  el.innerHTML = '';

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

// ===== Fullscreen & Viewer =====
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

  const html = `
<!doctype html><html><head><meta charset="utf-8"><title>Board Viewer</title>
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
    el.style.backgroundImage = s.boardBg ? 'url(\"'+s.boardBg+'\")' : 'linear-gradient(#1b2436,#0f1524)';
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

// ===== Map Strip =====
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
    const img = document.createElement('img'); img.src = g.dataUrl;
    const label = document.createElement('div'); label.className='label'; label.textContent = g.name;
    card.appendChild(img); card.appendChild(label);
    strip.appendChild(card);
  });
}

// ===== AUTO‑UPLOADER (robust) =====

// Delegated change listeners (handles page & modal inputs even if modal reopens)
document.addEventListener('change', (e)=>{
  const el = e.target;
  if(!(el instanceof HTMLInputElement)) return;
  if(el.id === 'gallery-input'){ onInputChanged(el.files, false); }
  if(el.id === 'gallery-input-modal'){ onInputChanged(el.files, true); }
});

function wireUploadInputs(){
  const pageInput  = document.getElementById('gallery-input');
  const modalInput = document.getElementById('gallery-input-modal');
  if(pageInput)  pageInput.setAttribute('accept','.png,.jpg,.jpeg,.svg,.webp');
  if(modalInput) modalInput.setAttribute('accept','.png,.jpg,.jpeg,.svg,.webp');
}
function triggerFilePicker(inModal=false){
  if(inModal){
    let mInput = document.getElementById('gallery-input-modal');
    if(!mInput){
      openGalleryModal();
      setTimeout(()=>{ mInput = document.getElementById('gallery-input-modal'); mInput && (mInput.value='', mInput.click()); }, 0);
      return;
    }
    mInput.value = '';
    mInput.click();
  }else{
    let pInput = document.getElementById('gallery-input');
    if(!pInput){
      nav('gallery');
      setTimeout(()=>{ pInput = document.getElementById('gallery-input'); pInput && (pInput.value='', pInput.click()); }, 0);
      return;
    }
    pInput.value = '';
    pInput.click();
  }
}

// When files are chosen -> immediately add to gallery
function onInputChanged(files, inModal=false){
  const arr = Array.from(files || []);
  if(!arr.length) return;

  // add chips (UX) but upload immediately
  state.pendingFiles.push(...arr);
  renderPending(inModal);

  addGalleryFiles(arr, ()=>{
    state.pendingFiles = [];
    renderPending(false); renderPending(true);
    renderGallery(); renderMapStrip();
    if(inModal){
      const modal = document.getElementById('gallery-modal');
      if(modal && modal.classList.contains('show')) populateGalleryModalGrid();
    }
    showToast('Gallery', `Added ${arr.length} file${arr.length>1?'s':''}.`, 'Tip: Click “Use on Board” to set the scene immediately.');
  });
}

// Drop -> auto-upload
function galleryDrop(ev){
  ev.preventDefault();
  const files = ev.dataTransfer.files;
  if(files?.length){
    const arr = Array.from(files);
    state.pendingFiles.push(...arr);
    renderPending(false); renderPending(true);
    addGalleryFiles(arr, ()=>{
      state.pendingFiles = [];
      renderPending(false); renderPending(true);
      renderGallery(); renderMapStrip();
      showToast('Gallery', `Added ${arr.length} file${arr.length>1?'s':''} by drag‑drop.`, 'Use “Use on Board” to apply it.');
    });
  }
}

// Pending chips
function renderPending(inModal=false){
  const listEl = document.getElementById(inModal ? 'pending-list-modal' : 'pending-list');
  const clrBtn = document.getElementById(inModal ? 'clear-pending-btn-modal' : 'clear-pending-btn');
  if(!listEl || !clrBtn) return;

  listEl.innerHTML = state.pendingFiles.length
    ? state.pendingFiles.map((f,idx)=>`
       <span class="pending-chip">
         ${escapeHtml(f.name)} <span class="small">(${Math.round(f.size/1024)} KB)</span>
         <span class="rm" title="Remove" onclick="removePending(${idx})">×</span>
       </span>`).join('')
    : `<span class="small">No files selected.</span>`;

  clrBtn.disabled = state.pendingFiles.length===0;
}
function removePending(idx){
  state.pendingFiles.splice(idx,1);
  renderPending(false); renderPending(true);
}
function clearPending(inModal=false){
  state.pendingFiles = [];
  renderPending(false); renderPending(true);
}

// Core add function
function addGalleryFiles(files, cb){
  if(!files || !files.length){ cb?.(); return; }
  const list = Array.from(files);
  let pending = list.length;
  list.forEach(f=>{
    const ext = (f.name.split('.').pop()||'').toLowerCase();
    if(!['png','jpg','jpeg','svg','webp'].includes(ext)){ pending--; if(pending===0) done(); return; }
    const reader = new FileReader();
    reader.onload = (e)=>{
      const raw = e.target.result;
      const id = 'm'+Math.random().toString(36).slice(2,8);
      const baseName = f.name.replace(/\.[^.]+$/,'');
      const dataUrl = (ext==='svg' && !String(raw).startsWith('data:image'))
        ? 'data:image/svg+xml;utf8,' + encodeURIComponent(String(raw))
        : raw;
      state.gallery.push({id, name:baseName, dataUrl, ext});
      pending--;
      if(pending===0) done();
    };
    if(ext==='svg') reader.readAsText(f); else reader.readAsDataURL(f);
  });
  function done(){ save(); cb?.(); }
}

// ===== Gallery view & modal =====
function clearEmptyGallery(){ state.gallery = state.gallery.filter(g=>g && g.dataUrl); save(); renderGallery(); }
function useOnBoard(id){
  const g = state.gallery.find(x=>x.id===id);
  if(!g){ showToast('Gallery','That map could not be found.','Please re-upload or refresh the Gallery.'); return; }
  state.boardBg = g.dataUrl; save();
  safeNav('board');
}
function deleteMap(id){
  state.gallery = state.gallery.filter(x=>x.id!==id);
  if(state.boardBg && !state.gallery.some(x=>x.dataUrl===state.boardBg)) state.boardBg = null;
  save(); renderGallery(); renderMapStrip(); renderBoard();
}
function renderGallery(){
  const grid = document.getElementById('gallery-grid'); if(!grid) return;
  if(!state.gallery.length){
    grid.innerHTML = `<div class="small">No maps yet. Use Select files or drag & drop.</div>`;
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

// Modal
function openGalleryModal(){
  const modal = document.getElementById('gallery-modal');
  if(!modal) return;
  modal.classList.add('show');
  modal.setAttribute('aria-hidden','false');
  populateGalleryModalGrid();
  // ensure inputs are wired and ready
  wireUploadInputs();
}
function populateGalleryModalGrid(){
  const grid  = document.getElementById('gallery-modal-grid');
  if(!grid) return;
  grid.innerHTML = state.gallery.length
    ? state.gallery.map(g=>`
        <div class="gallery-card">
          <div class="thumb">${thumbImg(g)}</div>
          <div class="meta">
            <div class="name" title="${escapeHtml(g.name)}">${escapeHtml(g.name)}</div>
            <div class="row">
              <button class="btn tiny" onclick="setMapAndClose('${g.id}')">Set Map</button>
              <button class="btn tiny" onclick="deleteMap('${g.id}')">Delete</button>
            </div>
          </div>
        </div>`).join('')
    : `<div class="small">No maps yet. Use “Select files” to add some.</div>`;
}
function setMapAndClose(id){
  const g = state.gallery.find(x=>x.id===id);
  if(g){ state.boardBg = g.dataUrl; save(); renderBoard(); }
  closeGalleryModal();
}
function closeGalleryModal(){
  const modal = document.getElementById('gallery-modal');
  if(!modal) return;
  modal.classList.remove('show');
  modal.setAttribute('aria-hidden','true');
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
        <div class="badges"><span class="badge">${escapeHtml(t.cls)}</span><span class="badge">HP ${t.hp[0]}/${t.hp[1]}</span></div>
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
  if(state.route!=='board') safeNav('board'); else renderBoard();
}

function renderDmPanel(){
  const panel=document.getElementById('dm-panel'); if(!panel) return;
  if(!state.ui.dmOpen){ panel.classList.add('hidden'); return; }
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
    body += `<div class="dm-grid3">${pcs.map(p=>tokenCardWithAdv('pc',p)).join('')||'<div class="small">No PCs yet.</div>'}</div>`;
  }
  if(tab==='npcs'){
    body += `<div class="dm-grid3">${npcs.map(n=>tokenCardWithAdv('npc',n)).join('')||'<div class="small">No NPCs yet.</div>'}</div>`;
  }
  if(tab==='enemies'){
    body += `<div class="dm-grid3">${enemies.map(e=>tokenCardWithAdv('enemy',e)).join('')||'<div class="small">No Enemies yet.</div>'}</div>`;
  }
  if(tab==='scene'){
    body += `
      <div class="dm-section">
        <div class="dm-sec-head"><span>Scene Controls</span></div>
        <div class="dm-grid3">
          <button class="dm-title-btn" onclick="openGalleryModal()">Open Gallery</button>
          <button class="dm-title-btn" onclick="state.boardBg=null; save(); renderBoard()">Clear Map</button>
          <button class="dm-title-btn" onclick="safeNav('board')">Go to Board</button>
        </div>
        <div class="dm-detail" style="margin-top:10px">Current map: ${state.boardBg ? 'Loaded' : 'None'}.</div>
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
        <button class="dm-title-btn" onclick="safeNav('board')">Board</button>
        <button class="dm-title-btn" onclick="safeNav('gallery')">Gallery</button>
        <button class="dm-title-btn" onclick="safeNav('dice')">Dice</button>
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
      const n=document.getElementById('notes'); if(n) n.value=state.notes;
    });
  }
}

// ===== Rolls & Toast =====
function showToast(title,msg,hint){
  let t=document.querySelector('.dm-toast'); if(t) t.remove();
  const div=document.createElement('div');
  div.className='dm-toast fade';
  div.innerHTML=`
    <div class="close" onclick="this.parentElement.remove()">×</div>
    <h4>${escapeHtml(title)}</h4>
    <div>${escapeHtml(msg)}</div>
    ${hint ? `<div class="hint">${escapeHtml(hint)}</div>` : ``}
  `;
  document.body.appendChild(div);
}
function quickD20(){
  const v=1+Math.floor(Math.random()*20);
  const box=document.getElementById('dm-last-roll'); if(box) box.textContent=`d20: ${v}`;
  showToast('Quick d20', `→ ${v}`, 'Instruction: roll 1d20; apply modifiers as usual.');
}
function quickAdvFor(kind,id){
  const a=1+Math.floor(Math.random()*20), b=1+Math.floor(Math.random()*20), res=Math.max(a,b);
  const list=state.tokens[kind]||[]; const name=(list.find(x=>x.id===id)?.name)||kind.toUpperCase();
  const box=document.getElementById('dm-last-roll'); if(box) box.textContent=`Advantage: ${a} vs ${b} ⇒ ${res}`;
  showToast(name, `Advantage → ${res} (${a} vs ${b})`, 'Instruction: roll 2d20, keep highest; then add relevant modifiers.');
}
function quickDisFor(kind,id){
  const a=1+Math.floor(Math.random()*20), b=1+Math.floor(Math.random()*20), res=Math.min(a,b);
  const list=state.tokens[kind]||[]; const name=(list.find(x=>x.id===id)?.name)||kind.toUpperCase();
  const box=document.getElementById('dm-last-roll'); if(box) box.textContent=`Disadvantage: ${a} vs ${b} ⇒ ${res}`;
  showToast(name, `Disadvantage → ${res} (${a} vs ${b})`, 'Instruction: roll 2d20, keep lowest; then add relevant modifiers.');
}

// ===== Dice =====
const dice=['d4','d6','d8','d10','d12','d20'];
let selectedDice=[];
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
function roll(tag){ const n=parseInt(tag.replace('d',''),10)||6; return 1+Math.floor(Math.random()*n); }
function shakeOutput(){ const out=document.getElementById('dice-output'); out.classList.remove('shake'); void out.offsetWidth; out.classList.add('shake'); }

// ===== Utils & Boot =====
function escapeHtml(s){ return (s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

function render(){
  // sync nav active states already handled by nav()
  if(state.route==='board'){ renderBoard(); }
  if(state.route==='gallery'){ renderGallery(); }
  if(state.route==='dice'){ renderDiceButtons(); updateDiceSelection(); }
  const notes=document.getElementById('notes'); if(notes) notes.value=state.notes||'';
  updateDmFab();
  renderDmPanel();
}

document.addEventListener('DOMContentLoaded', ()=>{
  try{
    wireUploadInputs();
    nav(state.route || 'home'); // nav will call render()
    fitBoard();
  }catch(err){
    console.error('boot error', err);
  }
});

// ===== Expose for inline handlers =====
window.boardClick=boardClick;
window.nav=nav;
window.safeNav=safeNav;
window.openGalleryModal=openGalleryModal;
window.closeGalleryModal=closeGalleryModal;
window.setMapAndClose=setMapAndClose;
window.openBoardViewer=openBoardViewer;
window.toggleBoardFullscreen=toggleBoardFullscreen;
window.selectFromPanel=selectFromPanel;
window.quickD20=quickD20;
window.quickAdvFor=quickAdvFor;
window.quickDisFor=quickDisFor;
window.maximizeDmPanel=maximizeDmPanel;
window.minimizeDmPanel=minimizeDmPanel;
window.setDmTab=setDmTab;
window.triggerFilePicker=triggerFilePicker;
window.clearPending=clearPending;
window.removePending=removePending;
window.galleryDrop=galleryDrop;
window.useOnBoard=useOnBoard;
