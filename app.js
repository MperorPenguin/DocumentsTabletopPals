// ---------- Icons ----------
const ICONS = {
  Barbarian:'assets/class_icons/Barbarian.svg', Bard:'assets/class_icons/Bard.svg', Cleric:'assets/class_icons/Cleric.svg',
  Druid:'assets/class_icons/Druid.svg', Fighter:'assets/class_icons/Fighter.svg', Monk:'assets/class_icons/Monk.svg',
  Paladin:'assets/class_icons/Paladin.svg', Ranger:'assets/class_icons/Ranger.svg', Rogue:'assets/class_icons/Rogue.svg',
  Sorcerer:'assets/class_icons/Sorcerer.svg', Warlock:'assets/class_icons/Warlock.svg', Wizard:'assets/class_icons/Wizard.svg',
};

// ---------- SRD-ish basics ----------
const SRD = {
  classes: Object.keys(ICONS),
  races: ['Human','Elf','Dwarf','Halfling','Gnome','Half-Orc','Tiefling','Dragonborn'],
  backgrounds: ['Acolyte','Criminal','Folk Hero','Noble','Outlander','Sage','Soldier','Urchin'],
  alignments: ['LG','NG','CG','LN','N','CN','LE','NE','CE'],
};

// Terrain guidance config
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

// ---------- State ----------
let state = JSON.parse(localStorage.getItem('tp_dm_lite_v2')||'null') || {
  route:'home', tab:'party', terrain:'Forest',
  players:[
    {id:'p1',name:'Aria',cls:'Rogue',race:'Human',bg:'Urchin',align:'CG',level:1,ac:15,abilities:{Str:10,Dex:15,Con:12,Int:12,Wis:11,Cha:10},skills:['Stealth (Dex)','Acrobatics (Dex)'],hp:{cur:10,max:10},pp:13,token:{x:2,y:3},avatar:ICONS.Rogue,tags:{armor:'light',modes:['walk'],wants:['stealth','ranged']}},
    {id:'p2',name:'Bronn',cls:'Fighter',race:'Human',bg:'Soldier',align:'LN',level:1,ac:17,abilities:{Str:16,Dex:12,Con:14,Int:10,Wis:10,Cha:10},skills:['Athletics (Str)','Intimidation (Cha)'],hp:{cur:13,max:13},pp:11,token:{x:4,y:4},avatar:ICONS.Fighter,tags:{armor:'heavy',modes:['walk'],wants:['melee']}},
  ],
  npcs:[{id:'n1',name:'Elder Bran',role:'Quest Giver',token:{x:8,y:6},avatar:null,tags:{armor:'none',modes:['walk']}}],
  enemies:[{id:'e1',name:'Skeleton A',ac:13,hp:{cur:13,max:13},token:{x:10,y:6},avatar:ICONS.Wizard, type:'undead', tags:{armor:'medium',modes:['walk']}}],
  map:{w:24,h:18,size:48,bg:null},
  dice:{expr:'d20',last:'—',log:[]},
  library:[],
  notes:'',
  selectedToken:null,
  editing:null,
  iconPicker:{ open:false, target:{kind:null,id:null,field:'avatar'} },
  dialog:{activeKind:'npc',activeId:null,log:[],reaction:50,snippets:['We mean no harm.','Any rumors?','We seek the old ruins.','Stand down.','Let’s make a deal.']},
};

let __saveTimer=null; function save(){ clearTimeout(__saveTimer); __saveTimer=setTimeout(()=>{ try{ localStorage.setItem('tp_dm_lite_v2', JSON.stringify(state)); }catch(e){} }, 600); }
function nav(route){ state.route=route; save(); render(); setActive(); }
function setActive(){ ['home','board','chars','npcs','enemies','dice','dialogue','notes','save'].forEach(id=>{ const b=document.getElementById('nav-'+id); if(b) b.classList.toggle('active', state.route===id); }); }
function esc(s){ return (''+s).replace(/[&<>]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[m])); }

// ---------- Dice ----------
let diceTimer=null;
function rollExpr(expr){ const m=(expr||'').match(/^(\\d+)?d(\\d+)([+\\-]\\d+)?$/i); if(!m) return {ok:false}; const n=+((m[1]||1)),s=+(m[2]),mod=+(m[3]||0); let parts=[],sum=0; for(let i=0;i<n;i++){const r=1+Math.floor(Math.random()*s); parts.push(r); sum+=r;} return {ok:true,total:sum+mod,parts,mod}; }
function rollVisual(expr){ const box=document.getElementById('dice-box'), out=document.getElementById('dice-result'); if(!box) return; let t=0; clearInterval(diceTimer); box.classList.add('roll'); diceTimer=setInterval(()=>{ box.textContent=1+Math.floor(Math.random()*20); t++; if(t>12){ clearInterval(diceTimer); const r=rollExpr(expr); box.textContent=r.ok?r.total:'×'; if(r.ok){ out&&(out.textContent=r.total); state.dice.last=r.total; state.dice.log.unshift({expr,total:r.total,parts:r.parts,mod:r.mod||0, t:Date.now()}); state.dice.log = state.dice.log.slice(0,50); save(); render(); } box.classList.remove('roll'); } }, 50); }

// ---------- Board (tokens + movement) ----------
function gridSize(){ return state.map.size; }
function tokenEl(kind,id){ return document.querySelector('.board .token[data-kind=\"'+kind+'\"][data-id=\"'+id+'\"]'); }
function selectTokenDom(kind,id){ document.querySelectorAll('.board .token.selected').forEach(n=>n.classList.remove('selected')); const el = tokenEl(kind,id); if(el){ el.classList.add('selected'); } }
function moveTokenDom(kind,id,x,y){ const el = tokenEl(kind,id); if(el){ const size = gridSize(); el.style.left=(x*size+2)+'px'; el.style.top=(y*size+2)+'px'; } }

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
    const img=document.createElement('img'); img.loading="lazy"; img.src = (obj.avatar || (obj.cls && ICONS[obj.cls]) || ICONS.Rogue); img.onerror = ()=>{ img.onerror=null; img.src=(obj.cls && ICONS[obj.cls]) || ICONS.Rogue; };
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

// Library upload for scene background
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

// ---------- Terrain intelligence ----------
function terrainChips(){
  const cfg = TERRAIN[state.terrain] || {tips:[],adv:[],dis:[]};
  const chips = [];
  cfg.tips.forEach(t=>chips.push({text:t,color:'var(--sage)'}));
  const all = [...state.players.map(p=>({...p,kind:'PC'})), ...state.enemies.map(e=>({...e,kind:'ENEMY'}))];
  function has(obj, q){
    if(q.armor && obj.tags?.armor===q.armor) return true;
    if(q.mode && (obj.tags?.modes||[]).includes(q.mode)) return true;
    if(q.tag && (obj.type===q.tag || (obj.tags?.type===q.tag))) return true;
    if(q.want && (obj.tags?.wants||[]).includes(q.want)) return true;
    if(q.cls && obj.cls===q.cls) return true;
    return false;
  }
  all.forEach(o=>{
    let adv = cfg.adv.some(q=>has(o,q));
    let dis = cfg.dis.some(q=>has(o,q));
    if(adv) chips.push({text:`Advantage hints: ${o.name}`, color:'var(--teal)'});
    if(dis) chips.push({text:`Disadvantage hints: ${o.name}`, color:'var(--red)'});
  });
  return chips;
}

// ---------- Icon Picker ----------
function openIconPicker(target){ state.iconPicker.open=true; state.iconPicker.target=target; save(); renderIconGrid(); document.getElementById('iconModal').classList.add('on'); }
function closeIconPicker(){ state.iconPicker.open=false; save(); document.getElementById('iconModal').classList.remove('on'); }
function renderIconGrid(){ const grid=document.getElementById('iconGrid'); if(!grid) return; grid.innerHTML = Object.entries(ICONS).map(([k,src])=>`<div class="icon-cell" onclick="pickIcon('${src}')"><img src="${src}" alt="${k}"/></div>`).join(''); }
function pickIcon(src){ const t=state.iconPicker.target; if(!t) return; if(t.id==='_editing_' && state.editing){ state.editing.avatar=src; save(); closeIconPicker(); render(); return; } const list = t.kind==='pc'?state.players:state.enemies; const obj = list.find(o=>o.id===t.id); if(!obj) return; obj[t.field]=src; save(); closeIconPicker(); render(); }

// ---------- Maths ----------
function mod(v){ return Math.floor((v-10)/2); }
function profBonus(level){ if(level>=17) return 6; if(level>=13) return 5; if(level>=9) return 4; if(level>=5) return 3; return 2; }

// ---------- Views ----------
function Home(){
  const tiles=[
    {t:'Board', c:'var(--yellow)', d:'2D grid + tokens + terrain', a:"nav('board')"},
    {t:'Characters', c:'var(--blue)', d:'Builder + icon picker', a:"nav('chars')"},
    {t:'NPCs', c:'var(--teal)', d:'List + portraits', a:"nav('npcs')"},
    {t:'Enemies', c:'var(--red)', d:'Quick add foes', a:"nav('enemies')"},
    {t:'Dice', c:'var(--purple)', d:'Visual d20 + log', a:"nav('dice')"},
    {t:'Dialogue', c:'var(--sage)', d:'Roleplay log', a:"nav('dialogue')"},
    {t:'Notes', c:'var(--blue)', d:'Autosave notes', a:"nav('notes')"},
    {t:'Save', c:'var(--yellow)', d:'Import/Export JSON', a:"nav('save')"},
  ];
  return `<h1 style="margin:16px 0 6px 0">Welcome back, DM!</h1>
    <div class="small" style="margin-bottom:10px">Board restored • Terrain intel • Character Builder enhanced.</div>
    <div class="grid-3">${tiles.map(t=>`<div class="panel tile" onclick="${t.a}"><div class="row"><div><div style="font-weight:600">${t.t} <span class="chip" style="background:${t.c}">Open</span></div><div class="small" style="margin-top:6px">${t.d}</div></div></div></div>`).join('')}</div>`;
}

// Board screen with side panels
function Board(){
  return `<div class="grid-2">
    <div class="panel">
      <div class="row">
        <h3>Scene Board</h3>
        <div class="row">
          <label class="btn alt"><input type="file" accept="image/*" style="display:none" onchange="uploadSceneAndSetBg(this.files)">Upload Scene</label>
          <button class="btn" onclick="state.selectedToken=null; save(); render();">Deselect</button>
        </div>
      </div>
      <div class="board" style="margin-top:10px" onclick="boardClick(event)"></div>
      <div class="small" style="margin-top:8px">Click a token to select it, then click a grid cell to move.</div>
    </div>
    <div class="panel">
      <h3>DM Panels</h3>
      <div class="grid-3">
        <div class="section">
          <div class="small">Terrain</div>
          <select onchange="state.terrain=this.value; save(); render();">
            ${Object.keys(TERRAIN).map(t=>`<option ${state.terrain===t?'selected':''}>${t}</option>`).join('')}
          </select>
          <div class="small" style="margin-top:6px">${(TERRAIN[state.terrain]||{tips:[]}).tips.join(' • ')}</div>
          <div class="row-wrap" style="margin-top:8px">${terrainChips().map(c=>`<span class="chip" style="background:${c.color}33;color:${c.color}">${esc(c.text)}</span>`).join('') || '<div class="small">No special hints.</div>'}</div>
        </div>
        <div class="section">
          <div class="small">Party</div>
          <div class="list">${state.players.map(p=>`<div class="item">
            <div style="display:flex;align-items:center;gap:8px">
              <div class="token"><img src="${esc(p.avatar||ICONS[p.cls])}"/></div>
              <div><div style="font-weight:600">${esc(p.name)}</div><div class="small">${esc(p.cls)} L${p.level}</div></div>
            </div>
            <button class="btn alt small" onclick="state.selectedToken={id:'${p.id}',kind:'pc'}; save(); render();">Select</button>
          </div>`).join('')}</div>
        </div>
        <div class="section">
          <div class="small">Enemies</div>
          <div class="list">${state.enemies.map(e=>`<div class="item">
            <div style="display:flex;align-items:center;gap:8px">
              <div class="token"><img src="${esc(e.avatar||ICONS.Barbarian)}"/></div>
              <div><div style="font-weight:600">${esc(e.name)}</div><div class="small">AC ${e.ac} • HP ${e.hp.cur}/${e.hp.max}</div></div>
            </div>
            <button class="btn alt small" onclick="state.selectedToken={id:'${e.id}',kind:'enemy'}; save(); render();">Select</button>
          </div>`).join('')}</div>
        </div>
      </div>
    </div>
  </div>`;
}

// Characters (builder)
function abilitySelect(current){ const opts=[]; for(let i=3;i<=20;i++){ opts.push(`<option ${i===current?'selected':''}>${i}</option>`); } return opts.join(''); }
function Characters(){
  const e = state.editing || {name:'', cls:'Rogue', race:'Human', bg:'Urchin', align:'CG', level:1, ac:15, abilities:{Str:10,Dex:14,Con:12,Int:10,Wis:10,Cha:10}, skills:['Stealth (Dex)'], avatar: ICONS.Rogue, hp:10, tags:{armor:'light',modes:['walk'],wants:['stealth','ranged']} };
  const pb = profBonus(e.level||1);
  return `<div class="grid-2" style="margin-top:16px">
    <div class="panel">
      <h3>Character Builder</h3>
      <div class="section">
        <div class="form-grid">
          <div class="field"><div class="small">Name</div><input value="${esc(e.name||'')}" oninput="state.editing=Object.assign({}, state.editing||{}, {name:this.value}); save();"></div>
          <div class="field"><div class="small">Class</div><select onchange="state.editing=Object.assign({}, state.editing||{}, {cls:this.value, avatar: ICONS[this.value]}); save(); render();">${SRD.classes.map(c=>`<option ${(e.cls||'Rogue')===c?'selected':''}>${c}</option>`).join('')}</select></div>
          <div class="field"><div class="small">Race</div><select onchange="state.editing=Object.assign({}, state.editing||{}, {race:this.value}); save();">${SRD.races.map(r=>`<option ${(e.race||'Human')===r?'selected':''}>${r}</option>`).join('')}</select></div>
          <div class="field"><div class="small">Background</div><select onchange="state.editing=Object.assign({}, state.editing||{}, {bg:this.value}); save();">${SRD.backgrounds.map(b=>`<option ${(e.bg||'Urchin')===b?'selected':''}>${b}</option>`).join('')}</select></div>
          <div class="field"><div class="small">Alignment</div><select onchange="state.editing=Object.assign({}, state.editing||{}, {align:this.value}); save();">${SRD.alignments.map(a=>`<option ${(e.align||'N')===a?'selected':''}>${a}</option>`).join('')}</select></div>
          <div class="field"><div class="small">Level</div><input type="number" value="${e.level||1}" oninput="state.editing.level=Number(this.value||1); save();" /></div>
        </div>
      </div>
      <div class="section">
        <div class="row"><h3>Abilities</h3><button class="btn alt small" onclick="const k=['Str','Dex','Con','Int','Wis','Cha']; const o={}; k.forEach(x=>o[x]=10); state.editing.abilities=o; save(); render();">Reset</button><button class="btn alt small" onclick="const k=['Str','Dex','Con','Int','Wis','Cha']; const o={}; k.forEach(x=>o[x]=3+Math.floor(Math.random()*15)); state.editing.abilities=o; save(); render();">Quick Random</button></div>
        <div class="ability-grid" style="margin-top:8px">
          ${['Str','Dex','Con','Int','Wis','Cha'].map(k=>`<div class="field"><div class="small">${k}</div><select onchange="state.editing.abilities['${k}']=Number(this.value); save();">${abilitySelect(e.abilities[k])}</select><div class="small">mod <b>${(Math.floor((e.abilities[k]-10)/2)>=0?'+':'') + Math.floor((e.abilities[k]-10)/2)}</b></div></div>`).join('')}
        </div>
      </div>
      <div class="section">
        <div class="form-grid">
          <div class="field"><div class="small">Armor</div><select onchange="state.editing.tags=Object.assign({}, state.editing.tags||{}, {armor:this.value}); save();">${['none','light','medium','heavy'].map(v=>`<option ${((e.tags||{}).armor||'light')===v?'selected':''}>${v}</option>`).join('')}</select></div>
          <div class="field"><div class="small">Movement</div><select multiple size="3" onchange="const vals=[...this.options].filter(o=>o.selected).map(o=>o.value); state.editing.tags=Object.assign({}, state.editing.tags||{}, {modes:vals}); save();">${['walk','swim','fly'].map(v=>`<option ${(e.tags?.modes||['walk']).includes(v)?'selected':''}>${v}</option>`).join('')}</select></div>
          <div class="field"><div class="small">Wants</div><select multiple size="3" onchange="const vals=[...this.options].filter(o=>o.selected).map(o=>o.value); state.editing.tags=Object.assign({}, state.editing.tags||{}, {wants:vals}); save();">${['stealth','ranged','melee','darkvision'].map(v=>`<option ${(e.tags?.wants||[]).includes(v)?'selected':''}>${v}</option>`).join('')}</select></div>
          <div class="field"><div class="small">AC</div><input type="number" value="${e.ac||10}" oninput="state.editing.ac=Number(this.value||10); save();" /></div>
          <div class="field"><div class="small">HP</div><input type="number" value="${e.hp||10}" oninput="state.editing.hp=Number(this.value||10); save();" /></div>
          <div class="field"><div class="small">Icon</div><button class="btn alt" onclick="openIconPicker({kind:'pc',id:'_editing_',field:'avatar'})">Choose Icon</button></div>
        </div>
      </div>
      <div class="row" style="margin-top:10px;justify-content:flex-end">
        <button class="btn alt" onclick="state.editing=null; save(); nav('board')">Cancel</button>
        <button class="btn active" onclick="saveChar()">Save Character</button>
      </div>
    </div>
    <div class="panel">
      <h3>Party Roster</h3>
      <div class="list">
        ${state.players.map(p=>`<div class="item">
          <div style="display:flex;align-items:center;gap:8px">
            <div class="token"><img src="${esc(p.avatar||ICONS[p.cls]||'')}"/></div>
            <div><div style="font-weight:600">${esc(p.name)}</div><div class="small">${esc(p.cls)} ${p.level||1} • ${esc(p.race||'')}</div></div>
          </div>
          <div class="row">
            <div class="small">AC ${p.ac} • HP ${p.hp.cur}/${p.hp.max}</div>
            <button class="btn alt" onclick="state.selectedToken={id:'${p.id}',kind:'pc'}; save(); nav('board')">Select on Board</button>
          </div>
        </div>`).join('')}
        <button class="btn alt" style="width:100%;margin-top:6px" onclick="state.editing={name:'New Hero', cls:'Rogue', race:'Human', bg:'Urchin', align:'N', level:1, ac:15, abilities:{Str:10,Dex:14,Con:12,Int:10,Wis:10,Cha:10}, skills:['Stealth (Dex)'], avatar: ICONS.Rogue, hp:10, tags:{armor:'light',modes:['walk'],wants:['stealth','ranged']} }; save(); render();">+ Add Player</button>
      </div>
    </div>
  </div>`;
}
function saveChar(){
  const e = state.editing; if(!e||!e.name){ alert('Enter a name'); return; }
  const newP = { id:'p'+Math.random().toString(36).slice(2,7), name:e.name, cls:e.cls, race:e.race, bg:e.bg, align:e.align, level:e.level||1, ac:e.ac||10, abilities:e.abilities, skills:e.skills||[], hp:{cur:e.hp||10,max:e.hp||10}, pp:10, token:{x:1+Math.floor(Math.random()*5),y:1+Math.floor(Math.random()*5)}, avatar:e.avatar||ICONS[e.cls], tags:e.tags||{armor:'light',modes:['walk']} };
  state.players.push(newP); state.editing=null; save(); render();
}

// NPCs
function NPCs(){
  return `<div class="panel"><h3>NPCs</h3>
    <div class="list">
      ${state.npcs.map(n=>`<div class="item">
        <div style="display:flex;align-items:center;gap:8px">
          ${n.avatar? `<div class="token"><img src="${esc(n.avatar)}"/></div>` : '<div class="token"></div>'}
          <div><div style="font-weight:600">${esc(n.name)}</div><div class="small">${esc(n.role||'NPC')}</div></div>
        </div>
        <label class="btn alt small"><input type="file" accept="image/*" style="display:none" onchange="const f=this.files[0]; if(f){ const r=new FileReader(); r.onload=e=>{ n.avatar=e.target.result; save(); render(); }; r.readAsDataURL(f);}">Upload Portrait</label>
      </div>`).join('')}
      <button class="btn alt" style="width:100%;margin-top:6px" onclick="state.npcs.push({id:'n'+Math.random().toString(36).slice(2,7),name:'New NPC',role:'Villager',token:{x:1,y:1},avatar:null,tags:{armor:'none',modes:['walk']}}); save(); render();">+ Add NPC</button>
    </div>
  </div>`;
}

// Enemies
function Enemies(){
  return `<div class="panel"><h3>Enemies</h3>
    <div class="list">
      ${state.enemies.map(e=>`<div class="item">
        <div style="display:flex;align-items:center;gap:8px">
          <div class="token"><img src="${esc(e.avatar||ICONS.Barbarian)}"/></div>
          <div><div style="font-weight:600">${esc(e.name)}</div><div class="small">AC ${e.ac} • HP ${e.hp.cur}/${e.hp.max}</div></div>
        </div>
        <button class="btn alt small" onclick="openIconPicker({kind:'enemy',id:'${e.id}',field:'avatar'})">Set Icon</button>
      </div>`).join('')}
      <button class="btn alt" style="width:100%;margin-top:6px" onclick="state.enemies.push({id:'e'+Math.random().toString(36).slice(2,7),name:'Goblin',ac:13,hp:{cur:7,max:7},token:{x:2,y:2},avatar:ICONS.Barbarian,type:'humanoid',tags:{armor:'light',modes:['walk']}}); save(); render();">+ Add Enemy</button>
    </div>
  </div>`;
}

// Dice
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

// Dialogue
function allEntities(){ return { pcs: state.players.map(p=>({id:p.id,name:p.name,kind:'pc',avatar:p.avatar})), npcs: state.npcs.map(n=>({id:n.id,name:n.name,kind:'npc',avatar:n.avatar})), enemies: state.enemies.map(e=>({id:e.id,name:e.name,kind:'enemy',avatar:e.avatar})) }; }
function setActiveSpeaker(kind,id){ state.dialog.activeKind=kind; state.dialog.activeId=id; save(); render(); }
function activeSpeaker(){ const k=state.dialog.activeKind, id=state.dialog.activeId; const list = k==='pc'?state.players:k==='npc'?state.npcs:state.enemies; return (list||[]).find(x=>x.id===id) || null; }
function sayLine(text){ const sp = activeSpeaker(); if(!sp){ alert('Pick a speaker'); return; } state.dialog.log.push({who:{name:sp.name,kind:state.dialog.activeKind,avatar:sp.avatar}, text, t:Date.now()}); if(state.dialog.log.length>200) state.dialog.log.shift(); save(); render(); }
function quickPrompt(type){ const lines = {greet:'Greetings. We come in peace.',ask:'We have a question for you...',persuade:'Hear us out—this benefits you too.',intimidate:'Back down. Now.',bargain:'We can make it worth your while.'}; sayLine(lines[type]||'...'); }

function Dialogue(){
  const ents = allEntities();
  const speaker = activeSpeaker();
  return `<div class="grid-2">
    <div class="panel">
      <h3>Who Speaks</h3>
      <div class="small">Pick a speaker, then type or use quick prompts.</div>
      <div class="row-wrap" style="margin-top:6px">
        ${ents.pcs.map(p=>`<button class="btn ${speaker&&speaker.id===p.id&&speaker.kind==='pc'?'active':''}" onclick="setActiveSpeaker('pc','${p.id}')">${p.name}</button>`).join('')}
        ${ents.npcs.map(n=>`<button class="btn ${speaker&&speaker.id===n.id&&speaker.kind==='npc'?'active':''}" onclick="setActiveSpeaker('npc','${n.id}')">${n.name}</button>`).join('')}
        ${ents.enemies.map(e=>`<button class="btn ${speaker&&speaker.id===e.id&&speaker.kind==='enemy'?'active':''}" onclick="setActiveSpeaker('enemy','${e.id}')">${e.name}</button>`).join('')}
      </div>
      <div class="section">
        <div class="row-wrap">
          <input id="sayText" placeholder="Type a line..." style="flex:1" onkeydown="if(event.key==='Enter'){ sayLine(this.value); this.value=''; }">
          <button class="btn active" onclick="const i=document.getElementById('sayText'); sayLine(i.value||'...'); i.value='';">Speak</button>
        </div>
        <div class="row-wrap" style="margin-top:6px">
          <button class="btn" onclick="quickPrompt('greet')">Greet</button>
          <button class="btn" onclick="quickPrompt('ask')">Ask</button>
          <button class="btn" onclick="quickPrompt('persuade')">Persuade</button>
          <button class="btn" onclick="quickPrompt('intimidate')">Intimidate</button>
          <button class="btn" onclick="quickPrompt('bargain')">Bargain</button>
        </div>
      </div>
    </div>
    <div class="panel">
      <h3>Dialogue Log</h3>
      <div class="chat">
        ${state.dialog.log.map(m=>`<div class="msg">
          <div class="who"><img src="${m.who.avatar||''}" onerror="this.style.display='none'" style="width:56px;height:56px;object-fit:contain"/></div>
          <div class="bubble"><div class="small" style="opacity:.8">${m.who.name} (${m.who.kind.toUpperCase()})</div><div>${m.text}</div></div>
        </div>`).join('') || '<div class="small">No dialogue yet.</div>'}
      </div>
      <div class="row" style="margin-top:6px; justify-content:flex-end">
        <button class="btn alt small" onclick="if(confirm('Clear dialogue log?')){ state.dialog.log=[]; save(); render(); }">Clear Log</button>
      </div>
    </div>
  </div>`;
}

// Notes & Save
function Notes(){ return `<div class="panel"><h2>Notes</h2><textarea style="width:100%;height:300px" oninput="state.notes=this.value; save();">${esc(state.notes)}</textarea></div>`; }
function SavePanel(){
  return `<div class="panel"><h2>Save / Export</h2>
    <button class="btn" onclick="const data=JSON.stringify(state,null,2); const blob=new Blob([data],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='tp-dm-lite-v2-session.json'; a.click();">Export (.json)</button>
    <label class="btn"><input type="file" accept="application/json" style="display:none" onchange="const r=new FileReader(); r.onload=e=>{ try{ state=JSON.parse(e.target.result); save(); render(); }catch(err){ alert('Invalid JSON'); } }; r.readAsText(this.files[0]);">Import</label>
    <button class="btn" onclick="if(confirm('Reset all data?')){ localStorage.removeItem('tp_dm_lite_v2'); location.reload(); }">Reset</button>
  </div>`;
}

// Router
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
  if(state.iconPicker.open){ renderIconGrid(); document.getElementById('iconModal').classList.add('on'); }
  setActive();
}
render();
