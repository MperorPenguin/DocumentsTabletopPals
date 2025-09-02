/* Encounter Builder — Calculator-Only (with Demo + Diagnostics) */
const load = (k, d) => JSON.parse(localStorage.getItem(k) || JSON.stringify(d));
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));

const THRESHOLDS_2014 = {
  1:[25,50,75,100], 2:[50,100,150,200], 3:[75,150,225,400], 4:[125,250,375,500],
  5:[250,500,750,1100], 6:[300,600,900,1400], 7:[350,750,1100,1700], 8:[450,900,1400,2100],
  9:[550,1100,1600,2400],10:[600,1200,1900,2800],11:[800,1600,2400,3600],12:[1000,2000,3000,4500],
  13:[1100,2200,3400,5100],14:[1250,2500,3800,5700],15:[1400,2800,4300,6400],16:[1600,3200,4800,7200],
  17:[2000,3900,5900,8800],18:[2100,4200,6300,9500],19:[2400,4900,7300,10900],20:[2800,5700,8500,12700]
};
const THRESHOLDS_2024 = THRESHOLDS_2014;
const XP_BY_CR = {"0":10,"1/8":25,"1/4":50,"1/2":100,1:200,2:450,3:700,4:1100,5:1800,6:2300,7:2900,8:3900,9:5000,10:5900,11:7200,12:8400,13:10000,14:11500,15:13000,16:15000,17:18000,18:20000,19:22000,20:25000,21:33000,22:41000,23:50000,24:62000,25:75000,26:90000,27:105000,28:120000,29:135000,30:155000};

const SEED_MONSTERS = [
  { name:"Goblin", cr:"1/4", xp:XP_BY_CR["1/4"], ac:15, hp:7, attacks:1, tohit:+4, dice:"1d6+2" },
  { name:"Wolf",   cr:"1/4", xp:XP_BY_CR["1/4"], ac:13, hp:11, attacks:1, tohit:+4, dice:"2d4+2" },
  { name:"Troll",  cr:"5",   xp:XP_BY_CR[5],     ac:15, hp:84, attacks:2, tohit:+7, dice:"2d6+4" }
];

let STATE = {
  party: [], partySel: [],
  scene: { terrain:"Any", lighting:"Bright", cover:0, adv:"normal" },
  ruleset: "2014",
  groups: [],
  library: load('tp_dm_encounters', []),
  hpAdjust: {}
};

const $  = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
const uid = (p="id")=>p+Math.random().toString(36).slice(2,8);

function parseDiceAvg(expr){
  if(!expr) return {avg:0, avgCrit:0};
  const m = expr.trim().match(/(\d+)d(\d+)([+\-]\d+)?/i);
  if(!m) return {avg:0, avgCrit:0};
  const n = +m[1], s = +m[2], b = m[3]?+m[3]:0;
  const dieAvg = (s+1)/2;
  return { avg: n*dieAvg + b, avgCrit: (n*2)*dieAvg + b };
}
function hitChance(attackBonus, targetAC, adv="normal"){
  const p = clamp((21 + attackBonus - targetAC)/20, 0.05, 0.95);
  if(adv==='adv') return 1 - (1 - p)**2;
  if(adv==='dis') return p**2;
  return p;
}
function critChance(adv="normal"){ const p=0.05; if(adv==='adv')return 1-(1-p)**2; if(adv==='dis')return p**2; return p; }
function saveFailChance(dc, saveBonus, adv="normal"){
  const need = dc - saveBonus;
  const baseSuc = clamp((21 - need)/20, 0, 1);
  let suc = baseSuc;
  if(adv==='adv') suc = 1 - (1 - baseSuc)**2;
  if(adv==='dis') suc = baseSuc**2;
  return 1 - suc;
}
function concSuccessChancePerHit(damage, conBonus, adv="normal"){
  const dc = Math.max(10, Math.floor(damage/2));
  const need = dc - conBonus;
  const baseSuc = clamp((21 - need)/20, 0, 1);
  let suc = baseSuc;
  if(adv==='adv') suc = 1 - (1 - baseSuc)**2;
  if(adv==='dis') suc = baseSuc**2;
  return suc;
}
function monsterMultiplier(n){ if(n<=1) return 1; if(n===2) return 1.5; if(n<=6) return 2; if(n<=10) return 2.5; if(n<=14) return 3; return 4; }
function thresholds(levels, ruleset){
  const tbl = ruleset==='2024'?THRESHOLDS_2024:THRESHOLDS_2014;
  const sum = levels.reduce((a,l)=>{const r=tbl[l]||tbl[1]; return [a[0]+r[0],a[1]+r[1],a[2]+r[2],a[3]+r[3]];},[0,0,0,0]);
  return {easy:sum[0], med:sum[1], hard:sum[2], deadly:sum[3]};
}
function totalMonsters(){ return STATE.groups.reduce((s,g)=>s+(g.count||1),0); }
function totalBaseXP(){ return STATE.groups.reduce((s,g)=>s+(g.xp*(g.count||1)),0); }
function difficulty(levels, ruleset){
  const t = thresholds(levels, ruleset);
  const base = totalBaseXP();
  const mult = monsterMultiplier(totalMonsters());
  const adjusted = Math.round(base*mult);
  let band = 'Deadly';
  if(adjusted<=t.easy) band='Easy'; else if(adjusted<=t.med) band='Medium'; else if(adjusted<=t.hard) band='Hard';
  return { t, base, mult, adjusted, band };
}

// Party
function getParty(){ return load('tp_cc_characters', []); }
function loadParty(){ STATE.party = getParty(); }
function renderPartyBox(){
  const root = $('#partyBox');
  if(!STATE.party.length){
    root.innerHTML = '<div class="helper">No party found in <code>tp_cc_characters</code>. Create characters first or click “Load Sample Party”.</div>';
    $('#applyBox').innerHTML = '<div class="helper">No party loaded.</div>';
    return;
  }
  const items = STATE.party.map(p=>{
    const checked = STATE.partySel.includes(p.id) ? 'checked' : '';
    const hp = (p.hp ?? '?') + '/' + (p.hpMax ?? '?');
    return `<label class="row"><input type="checkbox" data-id="${p.id}" ${checked}/> <span>${p.name}</span><small>Lv ${p.level??'?'} • AC ${p.ac??'—'} • HP ${hp}</small></label>`;
  }).join('');
  root.innerHTML = items;
  const applyRows = STATE.party.map(p=>{
    const cur = p.hp ?? 0; const max = p.hpMax ?? cur; const adj = STATE.hpAdjust[p.id] ?? 0;
    return `<div class="row"><div><strong>${p.name}</strong><small> HP ${cur}/${max}</small></div><label>Adjust <input type="number" value="${adj}" data-act="hp-adj" data-id="${p.id}" /></label></div>`;
  }).join('');
  $('#applyBox').innerHTML = applyRows;
}

// Groups
function addGroup(g){ STATE.groups.push({...g, id: uid('g_')}); saveBuilder(); renderGroups(); renderDiff(); }
function removeGroup(id){ STATE.groups = STATE.groups.filter(g=>g.id!==id); saveBuilder(); renderGroups(); renderDiff(); }
function updateGroup(id, key, val){ const g=STATE.groups.find(x=>x.id===id); if(!g) return; g[key]=val; saveBuilder(); renderGroups(); renderDiff(); }
function renderGroups(){
  const root = $('#groupsList');
  if(!STATE.groups.length){ root.innerHTML = '<div class="helper">No enemy/NPC groups added yet.</div>'; return; }
  root.innerHTML = STATE.groups.map(g=>`
    <div class="row group">
      <div class="left">
        <strong>${g.name}</strong>
        <small>CR ${g.cr ?? '?'} • ${g.xp||0} XP • AC ${g.ac||'?'} • HP ${g.hp||'?'} • Att ${g.attacks||1}× +${g.tohit||0} (${g.dice||'—'})</small>
      </div>
      <div class="right">
        <label>Count <input type="number" min="1" value="${g.count||1}" data-act="g-count" data-id="${g.id}"/></label>
        <button class="btn ghost" data-act="g-del" data-id="${g.id}">Remove</button>
      </div>
    </div>`).join('');
}

// Difficulty
function renderDiff(){
  const levels = STATE.party.filter(p=>STATE.partySel.includes(p.id)).map(p=>p.level||1);
  const res = difficulty(levels, STATE.ruleset);
  const pcs = levels.length||0, mon = totalMonsters();
  $('#diffReadout').innerHTML = `
    <div class="grid cols-5 tight">
      <div class="pill">PCs: <strong>${pcs}</strong></div>
      <div class="pill">Monsters: <strong>${mon}</strong></div>
      <div class="pill">Base XP: <strong>${res.base}</strong></div>
      <div class="pill">Multiplier: <strong>${res.mult}×</strong></div>
      <div class="pill">Adjusted: <strong>${res.adjusted}</strong></div>
    </div>
    <div class="bars">
      <div class="barrow"><span>Easy</span><div class="bar"><i style="width:${Math.min(100,res.t.easy?res.adjusted/res.t.easy*100:0)}%"></i></div><b>${res.t.easy}</b></div>
      <div class="barrow"><span>Medium</span><div class="bar"><i style="width:${Math.min(100,res.t.med?res.adjusted/res.t.med*100:0)}%"></i></div><b>${res.t.med}</b></div>
      <div class="barrow"><span>Hard</span><div class="bar"><i style="width:${Math.min(100,res.t.hard?res.adjusted/res.t.hard*100:0)}%"></i></div><b>${res.t.hard}</b></div>
      <div class="barrow"><span>Deadly</span><div class="bar"><i style="width:${Math.min(100,res.t.deadly?res.adjusted/res.t.deadly*100:0)}%"></i></div><b>${res.t.deadly}</b></div>
    </div>
    <div class="callout ${res.band.toLowerCase()}">Difficulty: <strong>${res.band}</strong></div>`;
}

// Calculators
function onCalcAttack(e){
  e.preventDefault();
  const adv = $('#atk-adv').value;
  const cover = parseInt($('#atk-cover').value||'0',10);
  const bonus = parseInt($('#atk-bonus').value||'0',10);
  const count = parseInt($('#atk-count').value||'1',10);
  const dice = $('#atk-dice').value.trim();
  const ac = parseInt($('#tgt-ac').value||'10',10) + cover;
  const {avg, avgCrit} = parseDiceAvg(dice);
  const pHit = hitChance(bonus, ac, adv);
  const pCrit = critChance(adv);
  const pNorm = Math.max(0, pHit - pCrit);
  const dprOne = pNorm*avg + pCrit*avgCrit;
  const dpr = dprOne * count;
  $('#atkOut').innerHTML = `<div class="grid cols-4 tight">
    <div class="pill">Hit% <strong>${(pHit*100).toFixed(1)}%</strong></div>
    <div class="pill">Crit% <strong>${(pCrit*100).toFixed(1)}%</strong></div>
    <div class="pill">Avg/Attack <strong>${dprOne.toFixed(2)}</strong></div>
    <div class="pill">DPR (<em>${count}×</em>) <strong>${dpr.toFixed(2)}</strong></div></div>`;
}
function onCalcSave(e){
  e.preventDefault();
  const dc = parseInt($('#sv-dc').value||'10',10);
  const bonus = parseInt($('#sv-bonus').value||'0',10);
  const adv = $('#sv-adv').value;
  const half = $('#sv-half').value==='yes';
  const dice = $('#sv-dice').value.trim();
  const {avg} = parseDiceAvg(dice);
  const pFail = saveFailChance(dc, bonus, adv);
  const exp = half ? (pFail*avg + (1-pFail)*(avg/2)) : (pFail*avg);
  $('#svOut').innerHTML = `<div class="grid cols-4 tight">
    <div class="pill">Fail% <strong>${(pFail*100).toFixed(1)}%</strong></div>
    <div class="pill">Success% <strong>${((1-pFail)*100).toFixed(1)}%</strong></div>
    <div class="pill">Avg Damage <strong>${avg.toFixed(2)}</strong></div>
    <div class="pill">Expected/Target <strong>${exp.toFixed(2)}</strong></div></div>`;
}
function onCalcConc(e){
  e.preventDefault();
  const conBonus = parseInt($('#co-bonus').value||'0',10);
  const adv = $('#co-adv').value;
  let dmg = parseFloat($('#co-dmg').value||'0');
  const hits = parseInt($('#co-hits').value||'1',10);
  const dice = $('#co-dice').value.trim();
  if(dice){ const {avg} = parseDiceAvg(dice); if(avg>0) dmg = avg; }
  const pKeep = concSuccessChancePerHit(dmg, conBonus, adv);
  const pAll = Math.pow(pKeep, hits);
  $('#coOut').innerHTML = `<div class="grid cols-4 tight">
    <div class="pill">DC/Hit <strong>${Math.max(10, Math.floor(dmg/2))}</strong></div>
    <div class="pill">Keep/Hit <strong>${(pKeep*100).toFixed(1)}%</strong></div>
    <div class="pill">Hits <strong>${hits}</strong></div>
    <div class="pill">Keep After All <strong>${(pAll*100).toFixed(1)}%</strong></div></div>`;
}

// Library
function listEncounters(){ return load('tp_dm_encounters', []); }
function upsertEncounter(enc){
  const all = listEncounters();
  const idx = all.findIndex(x=>x.id===enc.id);
  if(idx>=0) all[idx]=enc; else all.push(enc);
  save('tp_dm_encounters', all);
  STATE.library = all;
  renderEncList();
}
function renderEncList(){
  const root = $('#encList');
  const all = STATE.library;
  root.innerHTML = all.length ? all.map(e=>`<div class="row">
    <div class="left"><strong>${e.name}</strong><small>${e.groups.length} groups • party ${e.partySnapshot?.levels?.join(", ")||"—"}</small></div>
    <div class="right">
      <button class="btn ghost" data-act="load-enc" data-id="${e.id}">Load</button>
      <button class="btn ghost" data-act="del-enc" data-id="${e.id}">Delete</button>
    </div></div>`).join('') : '<div class="helper">No saved encounters yet.</div>';
}
function onEncListClick(e){
  const id = e.target.getAttribute('data-id');
  const act = e.target.getAttribute('data-act');
  if(!act) return;
  const all = listEncounters();
  if(act==='load-enc'){
    const enc = all.find(x=>x.id===id); if(!enc) return;
    STATE.ruleset = enc.ruleset || "2014";
    STATE.groups = enc.groups || [];
    STATE.partySel = (enc.partySel && enc.partySel.length) ? enc.partySel : STATE.party.map(p=>p.id);
    saveBuilder();
    renderGroups(); renderPartyBox(); renderDiff();
    switchTab('setup');
  }
  if(act==='del-enc'){
    const next = all.filter(x=>x.id!==id);
    save('tp_dm_encounters', next);
    STATE.library = next;
    renderEncList();
  }
}
function onSaveEncounter(){
  const name = prompt("Name this encounter:", "New Encounter");
  if(!name) return;
  const enc = {
    id: uid('e_'), name, ruleset: STATE.ruleset, scene: STATE.scene,
    groups: STATE.groups, partySel: STATE.partySel,
    partySnapshot: { size: STATE.partySel.length, levels: STATE.party.filter(p=>STATE.partySel.includes(p.id)).map(p=>p.level||1) }
  };
  upsertEncounter(enc); alert("Encounter saved.");
}

// Builder cache
function saveBuilder(){ save('tp_dm_enc_builder', { groups: STATE.groups, partySel: STATE.partySel, ruleset: STATE.ruleset }); }
function loadBuilder(){ const s = load('tp_dm_enc_builder', {}); if(s.groups) STATE.groups=s.groups; if(s.partySel) STATE.partySel=s.partySel; if(s.ruleset) STATE.ruleset=s.ruleset; }

// Results apply
function onApplyInput(e){ const el = e.target.closest('input[data-act="hp-adj"]'); if(!el) return; STATE.hpAdjust[el.getAttribute('data-id')] = parseInt(el.value||'0',10); }
function onApplyToParty(){
  const party = getParty(); let changed=0;
  party.forEach(p=>{ const d = STATE.hpAdjust[p.id]||0; if(d!==0){ const newHp = clamp((p.hp||0)+d, 0, p.hpMax||((p.hp||0)+Math.max(0,d))); if(newHp!==p.hp){ p.hp=newHp; changed++; } } });
  save('tp_cc_characters', party); loadParty(); renderPartyBox();
  alert(changed ? `Updated ${changed} character(s).` : "No changes to apply.");
}

// Demo & Sample
function loadSampleParty(){
  STATE.party = [
    { id:"sample1", name:"Kael", level:3, ac:16, hp:28, hpMax:31 },
    { id:"sample2", name:"Nyra", level:3, ac:14, hp:20, hpMax:24 },
    { id:"sample3", name:"Borin", level:3, ac:18, hp:32, hpMax:35 },
    { id:"sample4", name:"Elowen", level:3, ac:13, hp:18, hpMax:20 }
  ];
  STATE.partySel = STATE.party.map(p=>p.id);
  renderPartyBox(); renderDiff();
}
function loadDemoEncounter(){
  STATE.groups = [{ id: uid('g_'), name:"Goblin", cr:"1/4", xp:XP_BY_CR["1/4"], ac:15, hp:7, attacks:1, tohit:+4, dice:"1d6+2", count:4 }];
  saveBuilder(); renderGroups(); renderDiff();
}

// Diagnostics
function approx(a,b,tol=1e-6){ return Math.abs(a-b)<=tol; }
function diag(title, ok, exp, got){ return `<div class="row"><div><strong>${ok?"✅":"❌"} ${title}</strong></div><small>expected: ${exp} • got: ${got}</small></div>`; }
function runDiagnostics(){
  const out = [];
  const p1 = hitChance(+7,15,'normal'); out.push(diag("hitChance +7 vs AC15", approx(p1,0.65), "0.65", p1.toFixed(5)));
  const pa = hitChance(+7,15,'adv');   out.push(diag("hitChance ADV", approx(pa,0.8775), "0.8775", pa.toFixed(5)));
  const pd = hitChance(+7,15,'dis');   out.push(diag("hitChance DIS", approx(pd,0.4225), "0.4225", pd.toFixed(5)));
  const ca = critChance('adv');        out.push(diag("critChance ADV", approx(ca,0.0975), "0.0975", ca.toFixed(5)));
  const cd = critChance('dis');        out.push(diag("critChance DIS", approx(cd,0.0025), "0.0025", cd.toFixed(5)));
  const sf = saveFailChance(15,+2,'normal'); out.push(diag("saveFailChance DC15 +2", approx(sf,0.6), "0.6", sf.toFixed(5)));
  const c1 = concSuccessChancePerHit(12,+4,'normal'); out.push(diag("concentration keep/one hit", approx(c1,0.75), "0.75", c1.toFixed(5)));
  const c2 = Math.pow(c1,2); out.push(diag("concentration keep after 2 hits", approx(c2,0.5625), "0.5625", c2.toFixed(5)));
  const levels=[3,3,3,3]; const t=thresholds(levels,'2014'); const base=200; const mult=2; const adj=400; const band = (adj<=t.easy)?"Easy":(adj<=t.med)?"Medium":(adj<=t.hard)?"Hard":"Deadly";
  out.push(diag("thresholds L3x4 easy", t.easy===300, "300", t.easy));
  out.push(diag("base xp goblins x4", base===200, "200", base));
  out.push(diag("multiplier 4 monsters", approx(mult,2), "2", mult));
  out.push(diag("adjusted xp", adj===400, "400", adj));
  out.push(diag("band", band==="Medium", "Medium", band));
  $('#diagOut').innerHTML = out.join("");
}

// Tabs & events
function switchTab(tab){
  document.querySelectorAll('.tabpanel').forEach(p => p.hidden = true);
  document.querySelector(`#tab-${tab}`).hidden = false;
  document.querySelectorAll('.tab').forEach(b => b.setAttribute('aria-selected', b.getAttribute('data-tab')===tab ? 'true':'false'));
}
function onTabClick(e){ const btn = e.target.closest('.tab'); if(!btn) return; switchTab(btn.getAttribute('data-tab')); }
function onPartyToggle(e){
  const cb = e.target.closest('input[type="checkbox"][data-id]'); if(!cb) return;
  const id = cb.getAttribute('data-id');
  if(cb.checked){ if(!STATE.partySel.includes(id)) STATE.partySel.push(id); }
  else { STATE.partySel = STATE.partySel.filter(x=>x!==id); }
  saveBuilder(); renderDiff();
}
function onMonsterForm(e){
  e.preventDefault();
  const name = $('#m-name').value.trim() || 'Creature';
  const cr = $('#m-cr').value.trim() || '';
  const xp = parseInt($('#m-xp').value || (XP_BY_CR[cr]||0), 10);
  const ac = parseInt($('#m-ac').value||'10',10);
  const hp = parseInt($('#m-hp').value||'1',10);
  const attacks = parseInt($('#m-attacks').value||'1',10);
  const tohit = parseInt($('#m-tohit').value||'0',10);
  const dice = $('#m-dice').value.trim();
  const count = parseInt($('#m-count').value||'1',10);
  addGroup({name,cr,xp,ac,hp,attacks,tohit,dice,count});
  e.target.reset();
}
function onGroupsList(e){
  const id = e.target.getAttribute('data-id');
  const act = e.target.getAttribute('data-act');
  if(!act) return;
  if(act==='g-del') return removeGroup(id);
  if(act==='g-count') return updateGroup(id, 'count', parseInt(e.target.value||'1',10));
}
function onRulesetToggle(){ STATE.ruleset = $('#ruleset2024').checked ? '2024' : '2014'; saveBuilder(); renderDiff(); }

function boot(){
  document.addEventListener('click', onTabClick);
  loadParty(); if(!STATE.partySel.length) STATE.partySel = STATE.party.map(p=>p.id);
  renderPartyBox();
  $('#partyBox').addEventListener('change', onPartyToggle);
  $('#btn-refresh-party').addEventListener('click', ()=>{ loadParty(); renderPartyBox(); renderDiff(); });

  loadBuilder(); renderGroups();
  $('#monsterForm').addEventListener('submit', onMonsterForm);
  // Ensure BOTH input changes and remove button clicks are captured
  $('#groupsList').addEventListener('input', onGroupsList);
  $('#groupsList').addEventListener('click', onGroupsList);

  renderDiff();
  $('#ruleset2024').addEventListener('change', onRulesetToggle);

  $('#calc-attack').addEventListener('submit', onCalcAttack);
  $('#calc-save').addEventListener('submit', onCalcSave);
  $('#calc-conc').addEventListener('submit', onCalcConc);

  $('#applyBox').addEventListener('input', onApplyInput);
  $('#btn-apply-party').addEventListener('click', onApplyToParty);

  STATE.library = listEncounters(); renderEncList();
  $('#encList').addEventListener('click', onEncListClick);
  $('#btn-save-enc').addEventListener('click', onSaveEncounter);

  document.getElementById('btn-load-demo')?.addEventListener('click', loadDemoEncounter);
  document.getElementById('btn-load-sample-party')?.addEventListener('click', loadSampleParty);
  document.getElementById('btn-run-diagnostics')?.addEventListener('click', runDiagnostics);
}
boot();

console.log('SEED_MONSTERS', SEED_MONSTERS);
