// ===== State =====
const state = load() || {
  route: 'home',
  boardBg: null,          // dataURL of selected map
  gallery: [],            // [{id,name,dataUrl,ext}]
  tokens: {
    pc: [
      {id:'p1', name:'Aria',   cls:'Rogue',   hp:[10,10], pos:[2,3]},
      {id:'p2', name:'Bronn',  cls:'Fighter', hp:[13,13], pos:[4,4]},
    ],
    npc: [
      {id:'n1', name:'Elder Bran', cls:'NPC', hp:[6,6], pos:[7,6]},
    ],
    enemy: [
      {id:'e1', name:'Skeleton A', cls:'Enemy', hp:[13,13], pos:[8,4]},
    ]
  },
  selected: null, // {kind:'pc'|'npc'|'enemy', id:'p1'}
  notes: '',
  ui: { dmOpen:false }
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
function cellsz(){ // read from CSS var
  const cs = getComputedStyle(boardEl()).getPropertyValue('--cell').trim();
  return parseInt(cs.replace('px','')) || 38;
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
  el.innerHTML = ''; // clear tokens

  ['pc','npc','enemy'].forEach(kind=>{
    state.tokens[kind].forEach(t=>{
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
}

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
      if(pending===0){ save(); renderGallery(); renderMapStrip(); }
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
  // remove any empty/invalid entries
  state.gallery = state.gallery.filter(g=>g && g.dataUrl);
  save(); renderGallery();
}
function useOnBoard(id){
  const g = state.gallery.find(x=>x.id===id);
  if(!g) return;
  state.boardBg = g.dataUrl;
  save();
  nav('board'); // go to board and show it
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
  // if SVG text, inline as data:svg; if dataURL from raster, use directly
  if(g.ext==='svg' && !g.dataUrl.startsWith('data:image')){
    const svg = encodeURIComponent(g.dataUrl);
    return `<img src="data:image/svg+xml;utf8,${svg}">`;
  }else{
    return `<img src="${g.dataUrl}">`;
  }
}

// ===== Dice (kept minimal here; your visual roller already added earlier) =====
const dice = ['d4','d6','d8','d10','d12','d20'];
let selectedDice = [];
function renderDiceButtons(){
  const row = document.getElementById('dice-buttons');
  if(!row) return;
  row.innerHTML = dice.map(s=>`
    <button class="die-btn" onclick="addDie('${s}')">
      <span class="die-icon">${polyIcon(s)}</span>${s.toUpperCase()}
    </button>
  `).join('');
}
function addDie(s){ selectedDice.push(s); updateDiceSelection(); shakeOutput(); }
function clearDice(){ selectedDice=[]; updateDiceSelection(); document.getElementById('dice-output').innerHTML=''; }
function updateDiceSelection(){
  const el = document.getElementById('dice-selection');
  if(!el) return;
  el.textContent = selectedDice.length ? selectedDice.join(' + ') : 'No dice selected';
}
function polyIcon(s){
  // simple polygon approximations
  const map = { d4:3, d6:4, d8:6, d10:7, d12:8, d20:10 };
  const sides = map[s]||6;
  return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <polygon points="${regularPoly(12,12,9,sides)}" stroke="currentColor" stroke-width="2" fill="none" />
  </svg>`;
}
function regularPoly(cx,cy,r,n){
  const pts=[];
  for(let i=0;i<n;i++){
    const a = (Math.PI*2*(i/n)) - Math.PI/2;
    pts.push((cx+r*Math.cos(a)).toFixed(1)+','+(cy+r*Math.sin(a)).toFixed(1));
  }
  return pts.join(' ');
}
function rollAll(){
  if(!selectedDice.length) return;
  const rolls = selectedDice.map(tag=>roll(tag));
  const total = rolls.reduce((a,b)=>a+b,0);
  const out = document.getElementById('dice-output');
  out.innerHTML = `
    <div class="roll-card">
      <div class="roll-total">Total: ${total}</div>
      <div class="roll-breakdown">${selectedDice.map((s,i)=>`${s} [${rolls[i]}]`).join(' + ')}</div>
    </div>`;
  selectedDice=[]; updateDiceSelection();
}
function roll(tag){
  const n = parseInt(tag.replace('d',''),10)||6;
  return 1 + Math.floor(Math.random()*n);
}
function shakeOutput(){
  const out = document.getElementById('dice-output');
  out.classList.remove('shake'); void out.offsetWidth; out.classList.add('shake');
}

// ===== Utilities =====
function escapeHtml(s){ return (s||'').replace(/[&<>"']/g,m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

// ===== Initial render =====
function render(){
  // highlight nav
  const ids = ['home','board','gallery','chars','npcs','enemies','dice','notes','save'];
  ids.forEach(id=>{
    const b = document.getElementById('nav-'+id);
    if(b) b.classList.toggle('active', state.route===id);
  });

  if(state.route==='board'){ renderBoard(); }
  if(state.route==='gallery'){ renderGallery(); }
  if(state.route==='dice'){ renderDiceButtons(); updateDiceSelection(); }
  // keep DM panel rendering as in your baseline (not shown here to keep code focused)
}

// boot
document.addEventListener('DOMContentLoaded', ()=>{
  nav(state.route||'home');
});
// Ensure tabs re-enable after uploads or interactions
function resetTabs(){
  const tabs = document.querySelectorAll('.nav button');
  tabs.forEach(tab => tab.disabled = false);
}
