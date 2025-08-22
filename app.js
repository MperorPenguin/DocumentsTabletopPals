/* ----------------------- helpers / storage ----------------------- */
function esc(s){return (''+s).replace(/[&<>]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]))}
let __timer=null;
function save(){clearTimeout(__timer);__timer=setTimeout(()=>{try{localStorage.setItem('tp_dm_lite_v2_1',JSON.stringify(state))}catch(e){}},150)}
function nav(route){state.route=route;save();render();setActive()}
function setActive(){['home','board','chars','npcs','enemies','dice','dialogue','notes','save'].forEach(id=>{const b=document.getElementById('nav-'+id);if(b)b.classList.toggle('active',state.route===id)})}

/* ----------------------- data: icons/traits/terrain ----------------------- */
const ICONS={Barbarian:'assets/class_icons/Barbarian.svg',Bard:'assets/class_icons/Bard.svg',Cleric:'assets/class_icons/Cleric.svg',Druid:'assets/class_icons/Druid.svg',Fighter:'assets/class_icons/Fighter.svg',Monk:'assets/class_icons/Monk.svg',Paladin:'assets/class_icons/Paladin.svg',Ranger:'assets/class_icons/Ranger.svg',Rogue:'assets/class_icons/Rogue.svg',Sorcerer:'assets/class_icons/Sorcerer.svg',Warlock:'assets/class_icons/Warlock.svg',Wizard:'assets/class_icons/Wizard.svg'};
const CLASS_COLORS={Barbarian:'#f97316',Bard:'#22c55e',Cleric:'#eab308',Druid:'#84cc16',Fighter:'#60a5fa',Monk:'#14b8a6',Paladin:'#f59e0b',Ranger:'#10b981',Rogue:'#a1a1aa',Sorcerer:'#e879f9',Warlock:'#8b5cf6',Wizard:'#a78bfa'};
function dataIcon(label,color){const svg=`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect rx='8' width='64' height='64' fill='#111623'/><circle cx='32' cy='32' r='22' fill='${color}'/><text x='32' y='40' font-family='Segoe UI,Roboto,Arial' font-size='28' text-anchor='middle' fill='#0f1115' font-weight='700'>${label}</text></svg>`;return 'data:image/svg+xml;utf8,'+encodeURIComponent(svg)}
function classFallback(cls){return dataIcon((cls?.[0]||'?').toUpperCase(),CLASS_COLORS[cls]||'#94a3b8')}
function iconSrc(o){return o.avatar||(o.cls&&ICONS[o.cls])||classFallback(o.cls)}
const CLASS_TRAITS={Rogue:{armor:'light',wants:['stealth','ranged'],modes:['walk']},Ranger:{armor:'medium',wants:['ranged','stealth'],modes:['walk']},Fighter:{armor:'heavy',wants:['melee'],modes:['walk']},Barbarian:{armor:'medium',wants:['melee'],modes:['walk']},Monk:{armor:'none',wants:['melee'],modes:['walk']},Wizard:{armor:'none',wants:['ranged'],modes:['walk']},Sorcerer:{armor:'none',wants:['ranged'],modes:['walk']},Warlock:{armor:'light',wants:['ranged'],modes:['walk']},Cleric:{armor:'medium',wants:['melee'],modes:['walk']},Paladin:{armor:'heavy',wants:['melee'],modes:['walk']},Druid:{armor:'light',wants:['stealth'],modes:['walk','swim']}};
function inferTags(o){const base=CLASS_TRAITS[o.cls]||{};const t={...base,...(o.tags||{})};t.wants=[...(new Set([...(base.wants||[]),...((o.tags&&o.tags.wants)||[])]))];t.modes=[...(new Set([...(base.modes||[]),...((o.tags&&o.tags.modes)||[])]))];return t}
let TERRAIN={Forest:{tips:['Undergrowth (difficult)','Cover available'],adv:[{want:'stealth',why:'Brush and shadows aid stealth.'},{tag:'beast',why:'Native beasts thrive here.'}],dis:[{armor:'heavy',why:'Heavy armor snags on undergrowth.'}]},Swamp:{tips:['Mud & water (difficult)'],adv:[{mode:'swim',why:'Swimming speed bypasses boggy ground.'}],dis:[{armor:'heavy',why:'Heavy armor sinks and clogs.'},{want:'stealth',why:'Ripples and mud prints betray you.'}]},Desert:{tips:['Heat & mirage','Open sightlines'],adv:[{want:'ranged',why:'Open terrain favors ranged combatants.'}],dis:[{want:'stealth',why:'Few places to hide in open sands.'},{armor:'heavy',why:'Heat drains stamina; heavy armor is punishing.'}]},Mountain:{tips:['Steep slopes','High winds'],adv:[{mode:'fly',why:'Flight bypasses treacherous climbs.'}],dis:[{armor:'heavy',why:'Heavy armor hinders climbing and balance.'}]},Urban:{tips:['Tight alleys','Guards nearby'],adv:[{want:'stealth',why:'Corners/crowds create hiding spots.'}],dis:[]},Dungeon:{tips:['Tight corridors','Darkness common'],adv:[{want:'darkvision',why:'Darkvision is valuable here.'}],dis:[{armor:'heavy',why:'Heavy armor is clumsy in tight spaces.'}]},Arctic:{tips:['Ice & snow','Extreme cold'],adv:[{mode:'walk',why:'Sure‑footed creatures handle ice.'}],dis:[{armor:'heavy',why:'Cold seeps through metal; movement suffers.'}]},Coastal:{tips:['Slippery rocks'],adv:[{mode:'swim',why:'Aquatic movement is a big edge.'}],dis:[{armor:'heavy',why:'Slick rocks + heavy armor = slips.'}]}};

/* ----------------------- state ----------------------- */
let state=JSON.parse(localStorage.getItem('tp_dm_lite_v2_1')||'null')||{
  route:'home',terrain:'Forest',
  players:[
    {id:'p1',name:'Aria',cls:'Rogue',level:1,ac:15,hp:{cur:10,max:10},token:{x:2,y:3},avatar:ICONS.Rogue,tags:{armor:'light',modes:['walk'],wants:['stealth','ranged']}},
    {id:'p2',name:'Bronn',cls:'Fighter',level:1,ac:17,hp:{cur:13,max:13},token:{x:4,y:4},avatar:ICONS.Fighter,tags:{armor:'heavy',modes:['walk'],wants:['melee']}},
    {id:'p3',name:'Mira',cls:'Cleric',level:1,ac:16,hp:{cur:11,max:11},token:{x:6,y:3},avatar:ICONS.Cleric,tags:{armor:'medium',modes:['walk'],wants:['melee']}}
  ],
  npcs:[
    {id:'n1',name:'Elder Bran',role:'Quest Giver',hp:{cur:8,max:8}, token:{x:8,y:6}},
    {id:'n2',name:'Innkeeper Tilda',role:'Innkeeper',hp:{cur:7,max:7},token:{x:9,y:5}},
  ],
  enemies:[
    {id:'e1',name:'Skeleton A',type:'undead',ac:13,hp:{cur:13,max:13},token:{x:14,y:6},avatar:ICONS.Wizard,tags:{armor:'none',modes:['walk'],wants:['ranged']}},
    {id:'e2',name:'Goblin Scout',type:'goblinoid',ac:15,hp:{cur:7,max:7}, token:{x:16,y:7},avatar:ICONS.Rogue,tags:{armor:'light',modes:['walk'],wants:['stealth','ranged']}},
  ],
  map:{w:24,h:18,size:48,bg:null},
  selectedToken:null,
  ui:{dmMin:false,dmTab:'pc',noteText:''}
};

/* ----------------------- board sizing & rendering ----------------------- */
function recalcBoardSize(){
  const el=document.querySelector('.board'); if(!el) return;
  const containerW = el.clientWidth || el.getBoundingClientRect().width || 800;
  const idealCell  = Math.floor(containerW / state.map.w);
  const clamped    = Math.max(28, Math.min(56, idealCell));
  state.map.size   = clamped;
  el.style.setProperty('--cell', clamped+'px');
  el.style.height = (state.map.h * clamped) + 'px';
}
function gridSize(){return state.map.size}
function tokenEl(kind,id){return document.querySelector(`.board .token[data-kind="${kind}"][data-id="${id}"]`)}
function selectTokenDom(kind,id){document.querySelectorAll('.board .token.selected').forEach(n=>n.classList.remove('selected'));const el=tokenEl(kind,id);if(el)el.classList.add('selected')}
function moveTokenDom(kind,id,x,y){const el=tokenEl(kind,id);if(!el)return;const s=gridSize();el.style.left=(x*s+2)+'px';el.style.top=(y*s+2)+'px';el.style.width=(s-6)+'px';el.style.height=(s-6)+'px'}
function renderBoard(){
  const board=document.querySelector('.board'); if(!board) return;
  recalcBoardSize();
  board.style.backgroundImage = state.map.bg ? `url('${state.map.bg}')` : 'linear-gradient(180deg,#1b2436,#0f1524)';
  board.querySelectorAll('.token').forEach(n=>n.remove());
  const s=gridSize();
  const all=[...state.players.map(p=>({...p,kind:'pc'})),...state.npcs.map(n=>({...n,kind:'npc'})),...state.enemies.map(e=>({...e,kind:'enemy'}))];
  all.forEach(o=>{
    const d=document.createElement('div'); d.className='token '+o.kind; d.dataset.id=o.id; d.dataset.kind=o.kind;
    if(state.selectedToken && state.selectedToken.id===o.id && state.selectedToken.kind===o.kind) d.classList.add('selected');
    d.style.left=(o.token.x*s+2)+'px'; d.style.top=(o.token.y*s+2)+'px'; d.style.width=(s-6)+'px'; d.style.height=(s-6)+'px';
    const img=document.createElement('img'); img.src=iconSrc(o); img.onerror=()=>{img.onerror=null; img.src=classFallback(o.cls)};
    d.appendChild(img); d.title=o.name||o.role||'';
    d.onclick=ev=>{ev.stopPropagation(); state.selectedToken={id:o.id,kind:o.kind}; save(); selectTokenDom(o.kind,o.id); renderDmPanel();};
    board.appendChild(d);
  });
}
function boardClick(e){
  const b=e.currentTarget, r=b.getBoundingClientRect(), s=gridSize();
  if(!state.selectedToken) return;
  const gx=Math.max(0,Math.min(state.map.w-1,Math.floor((e.clientX-r.left)/s)));
  const gy=Math.max(0,Math.min(state.map.h-1,Math.floor((e.clientY-r.top)/s)));
  const list=state.selectedToken.kind==='pc'?state.players:state.selectedToken.kind==='npc'?state.npcs:state.enemies;
  const obj=list.find(o=>o.id===state.selectedToken.id); if(!obj) return;
  obj.token.x=gx; obj.token.y=gy; moveTokenDom(state.selectedToken.kind,state.selectedToken.id,gx,gy); save();
}
function uploadSceneAndSetBg(files){
  const file=[...files][0]; if(!file) return;
  const r=new FileReader(); r.onload=ev=>{ state.map.bg=ev.target.result; save(); render(); };
  r.readAsDataURL(file);
}

/* ----------------------- terrain matching ----------------------- */
function terrainMatches(obj,q){const t=inferTags(obj); if(q.armor&&t.armor===q.armor)return true; if(q.mode&&(t.modes||[]).includes(q.mode))return true; if(q.want&&(t.wants||[]).includes(q.want))return true; if(q.tag&&(obj.type===q.tag||t.type===q.tag))return true; if(q.cls&&obj.cls===q.cls)return true; return false}
function terrainFocusForEntity(ent){const cfg=TERRAIN[state.terrain]||{tips:[],adv:[],dis:[]};const out={adv:[],dis:[]}; if(!ent)return out; (cfg.adv||[]).forEach(a=>{if(terrainMatches(ent,a))out.adv.push(a)}); (cfg.dis||[]).forEach(a=>{if(terrainMatches(ent,a))out.dis.push(a)}); return out}

/* ----------------------- DM panel min/max & tabs ----------------------- */
function minimizeDmPanel(){state.ui.dmMin=true;save();renderDmPanel();renderDmFab()}
function restoreDmPanel(){state.ui.dmMin=false;save();renderDmPanel();renderDmFab()}
function setDmTab(tab){state.ui.dmTab=tab;save();renderDmPanel()}
window.minimizeDmPanel=minimizeDmPanel; window.restoreDmPanel=restoreDmPanel; window.setDmTab=setDmTab;

function renderDmFab(){
  let fab=document.getElementById('dm-fab');
  if(!fab){fab=document.createElement('button');fab.id='dm-fab';fab.className='dm-fab hidden';document.body.appendChild(fab)}
  if(state.route!=='board'||!state.ui.dmMin){fab.classList.add('hidden');return}
  const hints=(TERRAIN[state.terrain]?.tips?.length||0);
  fab.innerHTML=`<span class="dm-fab-dot"></span><span class="dm-fab-label">DM Panel</span><span class="dm-fab-count">${hints}</span>`;
  fab.onclick=restoreDmPanel; fab.classList.remove('hidden');
}

/* one confined card */
function buildCell(obj,kind){
  const sel = state.selectedToken && state.selectedToken.id===obj.id && state.selectedToken.kind===kind;
  const onSel = `state.selectedToken={id:'${obj.id}',kind:'${kind}'}; save(); renderDmPanel(); selectTokenDom('${kind}','${obj.id}')`;

  const F=terrainFocusForEntity(obj);
  const mkLabel=(a,cls)=>a.want? (cls==='adv'?`Favor: ${a.want}`:`Weak: ${a.want}`) : a.mode?`Mode: ${a.mode}` : a.tag?`Tag: ${a.tag}` : a.armor?`Armor: ${a.armor}` : (cls==='adv'?'Advantage':'Disadvantage');
  const chip=(a,cls)=>{const why=esc(a.why|| (cls==='adv'?'Advantage in this terrain.':'Disadvantage in this terrain.')); const label=mkLabel(a,cls); return `<span class="dm-chip ${cls}" title="${why}" onclick="event.stopPropagation(); state.ui.noteText='${why}'; save(); renderDmPanel();">${label}</span>`};
  const advChips=F.adv.length?F.adv.map(a=>chip(a,'adv')).join(' '):`<span class="dm-chip adv" style="opacity:.65;cursor:default">No specific advantage</span>`;
  const disChips=F.dis.length?F.dis.map(a=>chip(a,'dis')).join(' '):`<span class="dm-chip dis" style="opacity:.65;cursor:default">No specific disadvantage</span>`;

  const summarize=(arr,label)=>!arr.length?`No specific ${label} for ${esc(obj.name||obj.role||'this entity')} in ${state.terrain}.`:
    `${esc(obj.name||obj.role||'This entity')} — ${label} in ${state.terrain}:\n`+arr.map(a=>`• ${mkLabel(a,label==='Advantages'?'adv':'dis')} — ${a.why||''}`).join('\n');
  const advSum=summarize(F.adv,'Advantages'), disSum=summarize(F.dis,'Disadvantages');

  const sub=kind==='pc'?`Lvl ${obj.level||1}`:kind==='enemy'?`AC ${obj.ac??'—'}`:(obj.role||'NPC');

  return `
  <div class="dm-character-box">
    <div class="dm-card ${sel?'selected':''}" onclick="(function(){ ${onSel} })()">
      <div class="name">${esc(obj.name||obj.role||'Unknown')}</div>
      <div class="avatar"><img width="44" height="44" src="${iconSrc(obj)}" onerror="this.onerror=null; this.src='${classFallback(obj.cls)}'"/></div>
      <div class="badges">
        <span class="badge">${sub}</span>
        <span class="badge">HP ${(obj.hp?.cur??'—')}/${(obj.hp?.max??'—')}</span>
      </div>
      <div class="actions"><button class="btn tiny" onclick="event.stopPropagation(); ${onSel}">Select</button></div>
    </div>

    <div class="dm-adv">
      <button class="dm-title-btn adv" onclick="event.stopPropagation(); state.ui.noteText=\`${esc(advSum)}\`; save(); renderDmPanel();">
        <span class="dot"></span> Advantages
      </button>
      <div class="dm-chips">${advChips}</div>
    </div>

    <div class="dm-dis">
      <button class="dm-title-btn dis" onclick="event.stopPropagation(); state.ui.noteText=\`${esc(disSum)}\`; save(); renderDmPanel();">
        <span class="dot"></span> Disadvantages
      </button>
      <div class="dm-chips">${disChips}</div>
    </div>
  </div>`;
}

/* render panel */
function renderDmPanel(){
  const hud=document.getElementById('dm-panel'); if(!hud) return;
  if(state.route!=='board'){hud.classList.add('hidden');hud.innerHTML='';renderDmFab();return}
  if(state.ui.dmMin){hud.classList.add('hidden');hud.innerHTML='';renderDmFab();return}
  renderDmFab(); hud.classList.remove('hidden');

  const tips=(TERRAIN[state.terrain]?.tips||[]);
  const tipChips=tips.map(t=>`<span class="dm-chip tip" title="${esc(t)}" onclick="state.ui.noteText='${esc(t)}'; save(); renderDmPanel();">${esc(t)}</span>`).join(' ');
  const tab=state.ui.dmTab||'pc';
  const pcs=state.players.map(p=>buildCell(p,'pc')).join('');
  const npcs=state.npcs.map(n=>buildCell(n,'npc')).join('');
  const foes=state.enemies.map(e=>buildCell(e,'enemy')).join('');
  const section= tab==='pc'?{cls:'pc',title:'Characters (PC)',count:state.players.length,body:pcs||'<div class="small">No party yet.</div>'}
                : tab==='npc'?{cls:'npc',title:'NPCs',count:state.npcs.length,body:npcs||'<div class="small">No NPCs.</div>'}
                :             {cls:'enemy',title:'Enemies',count:state.enemies.length,body:foes||'<div class="small">No enemies.</div>'};

  hud.innerHTML=`
    <div class="dm-head">
      <h3>DM Panel</h3>
      <button class="btn" type="button" title="Minimize" onclick="minimizeDmPanel()">Minimize</button>
    </div>

    <div class="dm-section">
      <div class="small">Terrain</div>
      <select style="width:100%;margin-top:6px" onchange="state.terrain=this.value; state.ui.noteText=''; save(); render();">
        ${Object.keys(TERRAIN).map(t=>`<option ${state.terrain===t?'selected':''}>${t}</option>`).join('')}
      </select>
      ${tipChips?`<div class="terr-row">${tipChips}</div>`:''}
      ${state.ui.noteText?`<div class="dm-detail">${esc(state.ui.noteText).replace(/\n/g,'<br/>')}</div>`:''}
    </div>

    <div class="dm-section">
      <div class="dm-tabs">
        <button class="dm-tab ${tab==='pc'?'active':''}" onclick="setDmTab('pc')">PCs</button>
        <button class="dm-tab ${tab==='npc'?'active':''}" onclick="setDmTab('npc')">NPCs</button>
        <button class="dm-tab ${tab==='enemy'?'active':''}" onclick="setDmTab('enemy')">Enemies</button>
      </div>

      <div class="dm-sec-head ${section.cls}">
        <span>${section.title}</span><span class="count">${section.count}</span>
      </div>

      <div class="dm-grid3">${section.body}</div>
    </div>
  `;
}

/* ----------------------- views & router ----------------------- */
function Home(){return `<h1 style="margin:16px 0 6px 0">Welcome back, DM!</h1>
  <div class="small" style="margin-bottom:10px">Board + floating DM HUD • Terrain intel • Tabs & grid cards.</div>
  <div class="grid-3">
    ${[
      {t:'Board',c:'var(--yellow)',d:'2D grid + tokens + terrain',a:"nav('board')"},
      {t:'Characters',c:'var(--blue)',d:'Roster + icons',a:"nav('chars')"},
      {t:'NPCs',c:'var(--teal)',d:'List + portraits',a:"nav('npcs')"},
      {t:'Enemies',c:'var(--red)',d:'Quick foes',a:"nav('enemies')"},
      {t:'Dice',c:'var(--purple)',d:'Visual calculator',a:"nav('dice')"},
      {t:'Notes',c:'var(--blue)',d:'Autosave notes',a:"nav('notes')"},
      {t:'Save',c:'var(--yellow)',d:'Import/Export JSON',a:"nav('save')"},
    ].map(t=>`<div class="panel tile" onclick="${t.a}"><div style="font-weight:600">${t.t} <span class="chip" style="background:${t.c}">Open</span></div><div class="small" style="margin-top:6px">${t.d}</div></div>`).join('')}
  </div>`}
function Board(){return `<div class="grid-2"><div class="panel">
  <div class="row" style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">
    <h3>Scene Board</h3>
    <div class="row" style="display:flex;gap:8px;flex-wrap:wrap">
      <label class="btn"><input type="file" accept="image/*" style="display:none" onchange="uploadSceneAndSetBg(this.files)">Upload Scene</label>
      <button class="btn" onclick="state.selectedToken=null; save(); render();">Deselect</button>
    </div>
  </div>
  <div class="board" style="margin-top:10px" onclick="boardClick(event)"></div>
  <div class="small" style="margin-top:8px">Click a token to select it, then click a grid cell to move.</div>
</div></div>`}
function Characters(){return `<div class="panel"><h3>Characters</h3><div class="small">Roster view.</div></div>`}
function NPCs(){return `<div class="panel"><h3>NPCs</h3><div class="small">List view.</div></div>`}
function Enemies(){return `<div class="panel"><h3>Enemies</h3><div class="small">List view.</div></div>`}
function Notes(){return `<div class="panel"><h2>Notes</h2><textarea style="width:100%;height:300px" oninput="state.notes=this.value; save();">${esc(state.notes||'')}</textarea></div>`}
function SavePanel(){return `<div class="panel"><h2>Save / Export</h2>
  <button class="btn" onclick="const data=JSON.stringify(state,null,2); const blob=new Blob([data],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='tp-dm_lite_v2_1-session.json'; a.click();">Export (.json)</button>
  <label class="btn"><input type="file" accept="application/json" style="display:none" onchange="const r=new FileReader(); r.onload=e=>{try{state=JSON.parse(e.target.result); save(); render()}catch{alert('Invalid JSON')}}; r.readAsText(this.files[0])">Import</label>
  <button class="btn" onclick="if(confirm('Reset all data?')){localStorage.removeItem('tp_dm_lite_v2_1'); location.reload();}">Reset</button>
</div>`}
function routeView(){switch(state.route){case'home':return Home();case'board':return Board();case'chars':return Characters();case'npcs':return NPCs();case'enemies':return Enemies();case'notes':return Notes();case'save':return SavePanel();default:return Home()}}
function render(){
  document.getElementById('app').innerHTML=routeView();
  if(state.route==='board'){const b=document.querySelector('.board'); if(b){renderBoard(); b.addEventListener('click',boardClick)}}
  renderDmPanel(); renderDmFab(); setActive();
}

/* ----------------------- init ----------------------- */
render();
window.addEventListener('resize',()=>{if(state.route==='board'){recalcBoardSize();renderBoard()}})
