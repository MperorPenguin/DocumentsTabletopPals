// Tabletop Friends — Character Creator (Demo)
const STORAGE_KEY = "tp-characters"; // array of character objects

// Basic refs
const form = document.getElementById("char-form");
const previewCard = document.getElementById("preview-card");
const savedList = document.getElementById("saved-list");
const stepper = document.getElementById("stepper");

/* ---------- SAFE-ATTACH TOPBAR BUTTONS (fixes Save not firing) ---------- */
const BTN_IDS = [
  ["btn-new",         () => resetForm()],
  ["btn-save",        saveCharacter],
  ["btn-random",      randomiseCharacter],
  ["btn-save-bottom", saveCharacter],
  ["btn-print-pdf",   () => { const c = currentCharacter(); openPrintSheet(c); }],
  ["btn-download-doc",() => { const c = currentCharacter(); downloadWordDoc(c); }],
];
BTN_IDS.forEach(([id, fn]) => {
  const el = document.getElementById(id);
  if (el) el.addEventListener("click", fn);
});

/* ---------- STEPPER NAV ---------- */
stepper.querySelectorAll(".step").forEach(btn => {
  btn.addEventListener("click", () => goStep(btn.dataset.step));
});
form.querySelectorAll(".next").forEach(b => b.addEventListener("click", () => goStep(b.dataset.next)));
form.querySelectorAll(".prev").forEach(b => b.addEventListener("click", () => goStep(b.dataset.prev)));

/* ---------- INPUT REACTIVITY ---------- */
[
  "name","race","background","alignment","class","level","hp","notes","features","backstory"
].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener("input", onAnyChange);
});

document.getElementById("class").addEventListener("change", () => {
  autoHP();
  updateSkillLimits();
  updateGearLimits();
  renderSpellsUI();   // refresh spells list for class
  updateSpellLimits();
  renderPreview();
});
document.getElementById("level").addEventListener("change", () => {
  autoHP();
  updateSkillLimits();
  updateGearLimits();
  renderSpellsUI();
  updateSpellLimits();
  renderPreview();
});

/* Skills and profs live preview */
document.getElementById("proficiencies").addEventListener("change", renderPreview);

/* ---------- INIT ---------- */
document.addEventListener('DOMContentLoaded', () => {
  try{
    attachAbilityListenersPointBuy(); // +/− and direct inputs under 27-point buy
    resetForm(false);
    loadSaved();
    updateSkillLimits();
    updateGearLimits();
    renderSpellsUI();
    updateSpellLimits();
    updatePointBuyUI();
    renderPreview();
  }catch(e){
    console.error('Boot error:', e);
  }
});

/* ---------- UTILS ---------- */
function onAnyChange() { updateAbilityMods(); renderPreview(); }

function resetForm(resetAbilities = true) {
  form.reset();
  document.getElementById("level").value = 1;
  if (resetAbilities) setAbilities([10,10,10,10,10,10]);
  updateAbilityMods();
  autoHP();
  goStep(1);
  renderPreview();
}

function goStep(n) {
  const step = String(n);
  document.querySelectorAll(".stepper .step").forEach(b => b.classList.toggle("current", b.dataset.step === step));
  document.querySelectorAll(".step-pane").forEach(p => p.classList.toggle("current", p.dataset.step === step));
}

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function mod(score) { return Math.floor((score - 10) / 2); }

function updateAbilityMods() {
  ["str","dex","con","int","wis","cha"].forEach(s => {
    const v = parseInt(document.getElementById(s).value || 10, 10);
    const m = mod(v);
    document.getElementById(`${s}-mod`).textContent = `mod ${m>=0?"+":""}${m}`;
  });
}

const CLASS_HIT_DIE = {
  Barbarian: 12, Fighter: 10, Paladin: 10, Ranger: 10,
  Bard: 8, Cleric: 8, Druid: 8, Monk: 8, Rogue: 8, Warlock: 8,
  Sorcerer: 6, Wizard: 6
};

function autoHP() {
  const cls = document.getElementById("class").value;
  const lvl = parseInt(document.getElementById("level").value || 1, 10);
  const conMod = mod(parseInt(document.getElementById("con").value || 10, 10));
  const die = CLASS_HIT_DIE[cls] || 8;
  if (lvl === 1) {
    document.getElementById("hp").value = Math.max(1, die + conMod);
  }
}

function setAbilities(arr) {
  const [s,d,c,i,w,ch] = arr;
  document.getElementById("str").value = s;
  document.getElementById("dex").value = d;
  document.getElementById("con").value = c;
  document.getElementById("int").value = i;
  document.getElementById("wis").value = w;
  document.getElementById("cha").value = ch;
  updateAbilityMods();
  autoHP();
  renderPreview();
}

/* ===== Skills SRD-style, Level 1 simplification ===== */
const ALL_SKILLS = [
  "Acrobatics","Animal Handling","Arcana","Athletics","Deception","History",
  "Insight","Intimidation","Investigation","Medicine","Nature","Perception",
  "Performance","Persuasion","Religion","Sleight of Hand","Stealth","Survival"
];

const CLASS_RULES = {
  Barbarian: { skillChoices: 2,
    skillList: ["Animal Handling","Athletics","Intimidation","Nature","Perception","Survival"]
  },
  Bard: { skillChoices: 3, skillList: "ANY" },
  Cleric: { skillChoices: 2,
    skillList: ["History","Insight","Medicine","Persuasion","Religion"]
  },
  Druid: { skillChoices: 2,
    skillList: ["Arcana","Animal Handling","Insight","Medicine","Nature","Perception","Religion","Survival"]
  },
  Fighter: { skillChoices: 2,
    skillList: ["Acrobatics","Animal Handling","Athletics","History","Insight","Intimidation","Perception","Survival"]
  },
  Monk: { skillChoices: 2,
    skillList: ["Acrobatics","Athletics","History","Insight","Religion","Stealth"]
  },
  Paladin: { skillChoices: 2,
    skillList: ["Athletics","Insight","Intimidation","Medicine","Persuasion","Religion"]
  },
  Ranger: { skillChoices: 3,
    skillList: ["Animal Handling","Athletics","Insight","Investigation","Nature","Perception","Stealth","Survival"]
  },
  Rogue: { skillChoices: 4,
    skillList: ["Acrobatics","Athletics","Deception","Insight","Intimidation","Investigation","Perception","Performance","Persuasion","Sleight of Hand","Stealth"]
  },
  Sorcerer: { skillChoices: 2,
    skillList: ["Arcana","Deception","Insight","Intimidation","Persuasion","Religion"]
  },
  Warlock: { skillChoices: 2,
    skillList: ["Arcana","Deception","History","Intimidation","Investigation","Nature","Religion"]
  },
  Wizard: { skillChoices: 2,
    skillList: ["Arcana","History","Insight","Investigation","Medicine","Religion"]
  }
};

/* --------- Skills Enforcer ---------- */
function getCurrentClassRule(){
  const cls = document.getElementById("class").value;
  return CLASS_RULES[cls] || null;
}

function updateSkillLimits(){
  const rule = getCurrentClassRule();
  const help = document.getElementById("skills-help");
  const items = document.querySelectorAll(".skills-list .skill-item");

  const max = rule ? rule.skillChoices : 0;
  const allowed = (rule && rule.skillList === "ANY") ? new Set(ALL_SKILLS) : new Set(rule ? rule.skillList : []);

  items.forEach(lbl=>{
    const cb = lbl.querySelector('input[type=checkbox]');
    const skill = cb?.value || '';
    const canPick = allowed.has(skill);
    cb.disabled = rule ? !canPick : false;
    lbl.classList.toggle('disabled', !!rule && !canPick);
    if(cb.disabled) cb.checked = false;
  });

  const picked = Array.from(document.querySelectorAll(".skills-list input[type=checkbox]:checked")).length;
  const remain = rule ? Math.max(0, max - picked) : 0;

  if(help){
    if(!rule){
      help.textContent = "Select skills. Choose a class to see how many you can pick.";
    } else if (rule.skillList === "ANY") {
      help.textContent = `Your class can choose ${max} skill(s) from ANY skill. Remaining: ${remain}.`;
    } else {
      help.textContent = `Your class can choose ${max} skill(s) from its class list. Remaining: ${remain}.`;
    }
  }

  document.querySelectorAll(".skills-list input[type=checkbox]").forEach(cb=>{
    cb.onchange = ()=>{
      const checked = Array.from(document.querySelectorAll(".skills-list input[type=checkbox]:checked"));
      if(rule && checked.length > max){
        cb.checked = false;
        softHint("You’ve reached the limit for your class at level 1.");
      }
      renderPreview();
      const picked2 = Array.from(document.querySelectorAll(".skills-list input[type=checkbox]:checked")).length;
      if(help && rule){
        help.textContent = (rule.skillList === "ANY")
          ? `Your class can choose ${max} skill(s) from ANY skill. Remaining: ${Math.max(0, max - picked2)}.`
          : `Your class can choose ${max} skill(s) from its class list. Remaining: ${Math.max(0, max - picked2)}.`;
      }
    };
  });
}

function softHint(msg){
  const help = document.getElementById('skills-help');
  if(!help) return;
  const div = document.createElement('div');
  div.className = 'tiny muted';
  div.style.marginTop = '4px';
  div.textContent = msg;
  help.appendChild(div);
  setTimeout(()=>div.remove(), 2200);
}

/* --------- Gear Enforcer ---------- */
const STARTER_GEAR = {
  armor: [
    { key:"Light Armor",   label:"Light Armor (Leather)" },
    { key:"Medium Armor",  label:"Medium Armor (Scale Mail)" },
    { key:"Heavy Armor",   label:"Heavy Armor (Chain Mail)" },
    { key:"Shields",       label:"Shield" }
  ],
  weapons: [
    { key:"Simple Weapons",  label:"Simple melee/ranged" },
    { key:"Martial Weapons", label:"Martial melee/ranged" },
    { key:"Daggers",         label:"Daggers" },
    { key:"Shortswords",     label:"Shortswords" },
    { key:"Longswords",      label:"Longswords" },
    { key:"Rapiers",         label:"Rapiers" },
    { key:"Hand Crossbows",  label:"Hand Crossbows" },
    { key:"Quarterstaffs",   label:"Quarterstaffs" },
    { key:"Light Crossbows", label:"Light Crossbows" }
  ],
  packs: [
    { key:"Explorer's Pack",   label:"Explorer’s Pack" },
    { key:"Dungeoneer's Pack", label:"Dungeoneer’s Pack" },
    { key:"Priest's Pack",     label:"Priest’s Pack" },
    { key:"Scholar's Pack",    label:"Scholar’s Pack" }
  ]
};

function updateGearLimits(){
  const wrapArmor = document.getElementById('gear-armor');
  const wrapWeapons = document.getElementById('gear-weapons');
  const wrapPacks = document.getElementById('gear-packs');
  const help = document.getElementById('gear-help');
  if(!wrapArmor || !wrapWeapons || !wrapPacks) return;

  const cls = document.getElementById('class').value;
  const armorOK = new Set(
    cls === 'Monk' || cls === 'Wizard' || cls === 'Sorcerer'
      ? [] : cls === 'Cleric' || cls === 'Druid'
      ? ["Light Armor","Medium Armor","Shields"]
      : cls === 'Fighter' || cls === 'Paladin'
      ? ["Light Armor","Medium Armor","Heavy Armor","Shields"]
      : ["Light Armor","Medium Armor","Shields"]
  );
  const weapMap = {
    Barbarian: ["Simple Weapons","Martial Weapons"],
    Bard: ["Simple Weapons","Hand Crossbows","Longswords","Rapiers","Shortswords"],
    Cleric: ["Simple Weapons"],
    Druid: ["Clubs","Daggers","Darts","Javelins","Maces","Quarterstaffs","Scimitars","Sickles","Slings","Spears"],
    Fighter: ["Simple Weapons","Martial Weapons"],
    Monk: ["Simple Weapons","Shortswords"],
    Paladin: ["Simple Weapons","Martial Weapons"],
    Ranger: ["Simple Weapons","Martial Weapons"],
    Rogue: ["Simple Weapons","Hand Crossbows","Longswords","Rapiers","Shortswords"],
    Sorcerer: ["Daggers","Darts","Slings","Quarterstaffs","Light Crossbows"],
    Warlock: ["Simple Weapons"],
    Wizard: ["Daggers","Darts","Slings","Quarterstaffs","Light Crossbows"]
  };
  const weapOK  = new Set(weapMap[cls] || []);

  wrapArmor.innerHTML = STARTER_GEAR.armor.map(opt => gearCard('armor', opt, armorOK.has(opt.key))).join('');
  wrapWeapons.innerHTML = STARTER_GEAR.weapons.map(opt => gearCard('weapon', opt, weapOK.has(opt.key))).join('');
  wrapPacks.innerHTML = STARTER_GEAR.packs.map(opt => gearCard('pack', opt, true)).join('');

  [wrapArmor, wrapWeapons].forEach(group => {
    group.querySelectorAll('.select-card').forEach(card=>{
      card.addEventListener('click', ()=>{
        if(card.classList.contains('blocked')) return;
        const cb = card.querySelector('input');
        cb.checked = !cb.checked;
        card.classList.toggle('selected', cb.checked);
        renderPreview();
      });
    });
  });
  wrapPacks.querySelectorAll('.select-card').forEach(card=>{
    card.addEventListener('click', ()=>{
      const group = wrapPacks.querySelectorAll('.select-card input[type=radio]');
      group.forEach(r => r.closest('.select-card').classList.remove('selected'));
      const rb = card.querySelector('input[type=radio]');
      rb.checked = true;
      card.classList.add('selected');
      renderPreview();
    });
  });

  if(help){
    let a = (Array.from(armorOK)).join(', ') || 'No armor';
    let w = (Array.from(weapOK)).join(', ') || 'Limited weapons';
    help.textContent = `Allowed by ${cls}: Armor — ${a}. Weapons — ${w}.`;
  }
}

function gearCard(group, opt, isAllowed){
  const id = `${group}-${opt.key}`.replace(/\s+/g,'-').toLowerCase();
  const type = (group === 'pack') ? 'radio' : 'checkbox';
  const extraCls = isAllowed ? 'allowed' : 'blocked';
  const disabled = isAllowed ? '' : 'disabled';
  return `
    <label class="select-card ${extraCls}">
      <input ${disabled} id="${id}" type="${type}" name="${group}" value="${opt.key}">
      <div class="label">${opt.label}</div>
    </label>
  `;
}

function collectGearSelections(){
  const armor = Array.from(document.querySelectorAll('#gear-armor input:checked')).map(i=>i.value);
  const weapons = Array.from(document.querySelectorAll('#gear-weapons input:checked')).map(i=>i.value);
  const pack = (document.querySelector('#gear-packs input[type=radio]:checked')?.value) || null;
  return { armor, weapons, pack };
}

/* --------- Ability Scores: 27-point buy (8–15) ---------- */
const POINT_BUY_BUDGET = 27;
const COST_TABLE = { 8:0, 9:1, 10:2, 11:3, 12:4, 13:5, 14:7, 15:9 };

function ensurePointBuyHelper(){
  if(document.getElementById('pointbuy-help')) return;
  const legend = document.querySelector('[data-step="3"] legend');
  if(!legend) return;
  const help = document.createElement('div');
  help.id = 'pointbuy-help';
  help.className = 'helper muted small';
  help.setAttribute('aria-live','polite');
  help.textContent = 'Point Buy: 27 points (scores 8–15). Remaining: 27.';
  legend.parentElement.insertBefore(help, legend.nextSibling);
}

function readAbilities(){
  return {
    str: +document.getElementById('str').value,
    dex: +document.getElementById('dex').value,
    con: +document.getElementById('con').value,
    int: +document.getElementById('int').value,
    wis: +document.getElementById('wis').value,
    cha: +document.getElementById('cha').value,
  };
}
function pointCostFor(score){
  if(score<8) return Infinity;
  if(score>15) return Infinity;
  return COST_TABLE[score] ?? Infinity;
}
function totalPointBuyCost(ab){
  let total = 0;
  for(const k of ['str','dex','con','int','wis','cha']){
    const s = ab[k];
    if(s<8 || s>15) return Infinity;
    total += pointCostFor(s);
  }
  return total;
}
function updatePointBuyUI(){
  ensurePointBuyHelper();
  const ab = readAbilities();
  const cost = totalPointBuyCost(ab);
  const remain = (cost===Infinity) ? 0 : Math.max(0, POINT_BUY_BUDGET - cost);
  const help = document.getElementById('pointbuy-help');
  if(help) help.textContent = `Point Buy: 27 points (scores 8–15). Remaining: ${remain}.`;
  // Clamp inputs to 8–15 during point-buy
  ['str','dex','con','int','wis','cha'].forEach(id=>{
    const el = document.getElementById(id);
    if(+el.value < 8) el.value = 8;
    if(+el.value > 15) el.value = 15;
  });
}
function enforcePointBuyOnChange(targetId, delta){
  const el = document.getElementById(targetId);
  const before = readAbilities();
  const next = {...before};
  next[targetId] = Math.max(8, Math.min(15, (+el.value || 10) + delta));
  const nextCost = totalPointBuyCost(next);
  if(nextCost <= POINT_BUY_BUDGET){
    el.value = next[targetId];
    updateAbilityMods();
    autoHP();
    renderPreview();
    updatePointBuyUI();
  }else{
    updatePointBuyUI(); // reject softly
  }
}

// Attach ability listeners once DOM is ready
function attachAbilityListenersPointBuy(){
  document.querySelectorAll(".spin-btn").forEach(b => {
    b.addEventListener("click", () => {
      const targetId = b.dataset.target;
      const delta = parseInt(b.dataset.delta, 10);
      enforcePointBuyOnChange(targetId, delta);
    });
  });
  ["str","dex","con","int","wis","cha"].forEach(id => {
    document.getElementById(id).addEventListener("input", () => {
      const el = document.getElementById(id);
      const before = readAbilities();
      const next = {...before, [id]: Math.max(8, Math.min(15, parseInt(el.value || 10, 10)))};
      const nextCost = totalPointBuyCost(next);
      if(nextCost <= POINT_BUY_BUDGET){
        el.value = next[id];
        updateAbilityMods();
        autoHP();
        renderPreview();
        updatePointBuyUI();
      }else{
        el.value = before[id]; // revert
        updatePointBuyUI();
      }
    });
  });

  // Standard Array / Roll / Reset buttons
  document.getElementById("btn-standard-array").addEventListener("click", ()=>{
    applyStandardArray(); updatePointBuyUI();
  });
  document.getElementById("btn-roll").addEventListener("click", ()=>{
    rollAll(); updatePointBuyUI();
  });
  document.getElementById("btn-reset-abilities").addEventListener("click", ()=>{
    setAbilities([10,10,10,10,10,10]); updatePointBuyUI();
  });
}

function applyStandardArray() { setAbilities([15,14,13,12,10,8]); }
function roll4d6DropLowest() {
  const rolls = [0,0,0,0].map(() => 1 + Math.floor(Math.random()*6));
  rolls.sort((a,b) => a-b);
  return rolls[1] + rolls[2] + rolls[3];
}
function rollAll() {
  setAbilities([
    clamp(roll4d6DropLowest(), 8, 15),
    clamp(roll4d6DropLowest(), 8, 15),
    clamp(roll4d6DropLowest(), 8, 15),
    clamp(roll4d6DropLowest(), 8, 15),
    clamp(roll4d6DropLowest(), 8, 15),
    clamp(roll4d6DropLowest(), 8, 15)
  ]);
}

/* --------- Spells (guided selector, level 1) ---------- */
const CLASS_SPELL_RULES = {
  Bard:     { cantrips: 2, level1: 4, lists: ["Bard"] },
  Cleric:   { cantrips: 3, level1: 2, lists: ["Cleric"] },
  Druid:    { cantrips: 2, level1: 2, lists: ["Druid"] },
  Paladin:  { cantrips: 0, level1: 2, lists: ["Paladin"] },
  Ranger:   { cantrips: 0, level1: 2, lists: ["Ranger"] },
  Sorcerer: { cantrips: 4, level1: 2, lists: ["Sorcerer"] },
  Warlock:  { cantrips: 2, level1: 2, lists: ["Warlock"] },
  Wizard:   { cantrips: 3, level1: 6, lists: ["Wizard"] },
};
const SPELLS_DB = {
  Bard:     { cantrips: ["Vicious Mockery","Prestidigitation","Minor Illusion","Mage Hand"], level1: ["Healing Word","Dissonant Whispers","Faerie Fire","Tasha’s Hideous Laughter"] },
  Cleric:   { cantrips: ["Guidance","Sacred Flame","Thaumaturgy","Spare the Dying"],        level1: ["Cure Wounds","Bless","Guiding Bolt","Shield of Faith"] },
  Druid:    { cantrips: ["Druidcraft","Produce Flame","Shillelagh","Guidance"],             level1: ["Goodberry","Entangle","Faerie Fire","Thunderwave"] },
  Paladin:  { cantrips: [],                                                                  level1: ["Divine Favor","Shield of Faith","Compelled Duel","Heroism"] },
  Ranger:   { cantrips: [],                                                                  level1: ["Hunter’s Mark","Cure Wounds","Absorb Elements","Ensnaring Strike"] },
  Sorcerer: { cantrips: ["Fire Bolt","Ray of Frost","Light","Mage Hand","Prestidigitation"], level1: ["Shield","Magic Missile","Chromatic Orb","Mage Armor"] },
  Warlock:  { cantrips: ["Eldritch Blast","Mage Hand","Minor Illusion","Prestidigitation"],  level1: ["Hex","Armor of Agathys","Witch Bolt","Hellish Rebuke"] },
  Wizard:   { cantrips: ["Fire Bolt","Ray of Frost","Light","Mage Hand","Prestidigitation"], level1: ["Shield","Magic Missile","Mage Armor","Thunderwave","Detect Magic","Identify"] },
};

function renderSpellsUI(){
  const wrap = document.getElementById('spells-wrap');
  if(!wrap) return;

  const cls = document.getElementById('class')?.value || '';
  const rule = CLASS_SPELL_RULES[cls] || { cantrips:0, level1:0, lists:[] };

  let canList = new Set(), l1List = new Set();
  (rule.lists||[]).forEach(list=>{
    const row = SPELLS_DB[list] || {cantrips:[], level1:[]};
    (row.cantrips||[]).forEach(n=>canList.add(n));
    (row.level1||[]).forEach(n=>l1List.add(n));
  });

  const mkCheck = (name, group) => `
    <label class="spell-item">
      <input type="checkbox" data-spell-group="${group}" value="${name}">
      ${name}
    </label>`;

  const cantripsHtml = Array.from(canList).map(n=>mkCheck(n,'cantrip')).join('') || '<div class="tiny muted">No cantrips for this class.</div>';
  const level1Html  = Array.from(l1List).map(n=>mkCheck(n,'level1')).join('') || '<div class="tiny muted">No 1st-level spells for this class.</div>';

  wrap.innerHTML = `
    <div class="spells-head helper muted small" id="spells-help" aria-live="polite"></div>
    <div class="spells-grid">
      <div>
        <div class="field"><span>Cantrips</span></div>
        <div id="spells-cantrips" class="spells-list">${cantripsHtml}</div>
      </div>
      <div>
        <div class="field"><span>1st-level Spells</span></div>
        <div id="spells-level1" class="spells-list">${level1Html}</div>
      </div>
    </div>
  `;

  updateSpellLimits();
}

function updateSpellLimits(){
  const cls = document.getElementById('class')?.value || '';
  const rule = CLASS_SPELL_RULES[cls] || { cantrips:0, level1:0 };

  const cans = Array.from(document.querySelectorAll('#spells-cantrips input[type="checkbox"]'));
  const l1s  = Array.from(document.querySelectorAll('#spells-level1 input[type="checkbox"]'));

  const pickedCan = cans.filter(c=>c.checked).length;
  const pickedL1  = l1s.filter(c=>c.checked).length;

  const lock = (list, cap, picked) => {
    const atCap = picked >= cap;
    list.forEach(cb=>{
      if (cb.checked) { cb.disabled = false; cb.closest('.spell-item')?.classList.remove('locked'); return; }
      const shouldLock = atCap;
      cb.disabled = shouldLock;
      cb.closest('.spell-item')?.classList.toggle('locked', shouldLock);
    });
  };
  lock(cans, rule.cantrips||0, pickedCan);
  lock(l1s,  rule.level1||0,   pickedL1);

  const help = document.getElementById('spells-help');
  if(help){
    const cx = (rule.cantrips||0), lx = (rule.level1||0);
    help.textContent = `Pick up to ${cx} cantrip${cx===1?'':'s'} and ${lx} 1st-level spell${lx===1?'':'s'} for a level 1 ${cls || 'class'}.`;
  }
}

// react to ticking spells
document.addEventListener('change', (e)=>{
  if (e.target && e.target.matches('.spells-list input[type="checkbox"]')) {
    updateSpellLimits();
    renderPreview();
  }
});

function collectSpells(){
  return Array.from(document.querySelectorAll('.spells-list input[type="checkbox"]'))
    .filter(cb => cb.checked && !cb.disabled)
    .map(cb => cb.value);
}

/* --------- Ability helpers already above --------- */

function collectSkills() {
  const out = [];
  document.querySelectorAll(".skills-list input[type=checkbox]:checked").forEach(cb => out.push(cb.value));
  return out;
}
function collectProficiencies() {
  const sel = document.getElementById("proficiencies");
  return Array.from(sel.selectedOptions).map(o => o.value);
}

function currentCharacter() {
  const gear = collectGearSelections();
  return {
    id: crypto.randomUUID(),
    name: document.getElementById("name").value.trim(),
    race: document.getElementById("race").value,
    background: document.getElementById("background").value,
    alignment: document.getElementById("alignment").value,
    class: document.getElementById("class").value,
    level: parseInt(document.getElementById("level").value || 1, 10),
    hp: parseInt(document.getElementById("hp").value || 1, 10),
    abilities: {
      str: parseInt(document.getElementById("str").value || 10, 10),
      dex: parseInt(document.getElementById("dex").value || 10, 10),
      con: parseInt(document.getElementById("con").value || 10, 10),
      int: parseInt(document.getElementById("int").value || 10, 10),
      wis: parseInt(document.getElementById("wis").value || 10, 10),
      cha: parseInt(document.getElementById("cha").value || 10, 10)
    },
    skills: collectSkills(),
    spells: collectSpells(),                 // NEW
    proficiencies: collectProficiencies(),

    equipment: JSON.stringify(gear),         // structured starter gear
    notes: (document.getElementById("notes")?.value || "").trim(),
    features: (document.getElementById("features")?.value || "").trim(),
    backstory: (document.getElementById("backstory")?.value || "").trim(),

    traits: computeTraits(),                 // for DM badge line
    icon: classIconPath(),                   // for DM avatar icon
    createdAt: new Date().toISOString()
  };
}

function validateCharacter(c) { return !!c.name && !!c.class; }

function saveCharacter() {
  const c = currentCharacter();
  if (!validateCharacter(c)) {
    alert("Please fill out at least Name and Class.");
    return;
  }
  const arr = loadArray();
  arr.push(c);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  window.dispatchEvent(new CustomEvent("tp:charactersUpdated", { detail: { count: arr.length } }));
  renderPreview(c);
  renderSaved(arr);
  alert("Character saved! It will be available to the DM Party tab via localStorage.");
}

function loadArray() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}

function loadSaved() { renderSaved(loadArray()); }

function renderSaved(arr) {
  savedList.innerHTML = "";
  if (!arr.length) {
    savedList.innerHTML = `<div class="muted tiny">No saved characters yet.</div>`;
    return;
  }
  arr.forEach((c, idx) => {
    const item = document.createElement("div");
    item.className = "saved-item";
    item.innerHTML = `
      <div class="row">
        <div class="title">${escapeHtml(c.name)} <span class="muted">(${escapeHtml(c.race)} ${escapeHtml(c.class)} • L${c.level})</span></div>
        <div class="actions">
          <button class="btn sm" data-act="load" data-idx="${idx}">Load</button>
          <button class="btn sm ghost" data-act="delete" data-idx="${idx}">Delete</button>
        </div>
      </div>
    `;
    savedList.appendChild(item);
  });

  savedList.querySelectorAll("button[data-act=load]").forEach(b => b.addEventListener("click", () => {
    const arr2 = loadArray();
    const c = arr2[parseInt(b.dataset.idx, 10)];
    if (!c) return;
    // Load into the form
    document.getElementById("name").value = c.name;
    document.getElementById("race").value = c.race;
    document.getElementById("background").value = c.background;
    document.getElementById("alignment").value = c.alignment;
    document.getElementById("class").value = c.class;
    document.getElementById("level").value = c.level;
    setAbilities([
      c.abilities.str, c.abilities.dex, c.abilities.con,
      c.abilities.int, c.abilities.wis, c.abilities.cha
    ]);
    document.getElementById("hp").value = c.hp;
    document.getElementById("notes") && (document.getElementById("notes").value = c.notes || "");
    document.getElementById("features") && (document.getElementById("features").value = c.features || "");
    document.getElementById("backstory") && (document.getElementById("backstory").value = c.backstory || "");

    // Profs
    const profSel = document.getElementById("proficiencies");
    Array.from(profSel.options).forEach(o => o.selected = (c.proficiencies || []).includes(o.value));
    // Skills
    document.querySelectorAll(".skills-list input[type=checkbox]").forEach(cb => cb.checked = (c.skills || []).includes(cb.value));

    // Gear (reselect in UI)
    try {
      const g = typeof c.equipment === 'string' ? JSON.parse(c.equipment) : (c.equipment || {});
      updateGearLimits(); // rebuild tiles for current class
      const armorVals = new Set(g.armor || []);
      const weaponVals = new Set(g.weapons || []);
      document.querySelectorAll('#gear-armor input[type=checkbox]').forEach(i=>{
        i.checked = armorVals.has(i.value);
        i.closest('.select-card').classList.toggle('selected', i.checked);
      });
      document.querySelectorAll('#gear-weapons input[type=checkbox]').forEach(i=>{
        i.checked = weaponVals.has(i.value);
        i.closest('.select-card').classList.toggle('selected', i.checked);
      });
      if (g.pack) {
        const rb = document.querySelector(`#gear-packs input[type=radio][value="${CSS.escape(g.pack)}"]`);
        if (rb) {
          document.querySelectorAll('#gear-packs .select-card').forEach(ca=>ca.classList.remove('selected'));
          rb.checked = true;
          rb.closest('.select-card').classList.add('selected');
        }
      }
    } catch {}

    // Spells
    renderSpellsUI();
    (c.spells || []).forEach(name=>{
      const box = document.querySelector(`.spells-list input[type="checkbox"][value="${CSS.escape(name)}"]`);
      if (box) box.checked = true;
    });
    updateSpellLimits();

    updateSkillLimits();
    renderPreview();
    goStep(1);
  }));

  savedList.querySelectorAll("button[data-act=delete]").forEach(b => b.addEventListener("click", () => {
    const idx = parseInt(b.dataset.idx, 10);
    const arr2 = loadArray();
    arr2.splice(idx, 1);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr2));
    window.dispatchEvent(new CustomEvent("tp:charactersUpdated", { detail: { count: arr2.length } }));
    renderSaved(arr2);
  }));
}

function renderPreview(cArg) {
  try {
    const c = cArg || currentCharacter();
    const abil = c.abilities;
    const lines = [
      line(`${c.name || "Unnamed Hero"}`, "h3"),
      line(`${c.race} ${c.class} — Level ${c.level}`),
      line(`${c.background} • ${c.alignment}`),
      hr(),
      grid([
        statBox("STR", abil.str), statBox("DEX", abil.dex), statBox("CON", abil.con),
        statBox("INT", abil.int), statBox("WIS", abil.wis), statBox("CHA", abil.cha),
      ]),
      line(`HP: <strong>${c.hp}</strong>`),
      c.skills?.length ? line(`<div class="pill-row">${c.skills.map(s => pill(s)).join("")}</div>`) : "",
      c.proficiencies?.length ? line(`<div class="pill-row">${c.proficiencies.map(s => pill(s)).join("")}</div>`) : "",
      c.spells?.length ? line(`<div class="pill-row">${c.spells.map(s => pill(s)).join("")}</div>`) : "",
      (() => {
        try {
          const g = typeof c.equipment === 'string' ? JSON.parse(c.equipment) : (c.equipment || {});
          const parts = [];
          if (g.armor?.length) parts.push(`Armor: ${g.armor.join(', ')}`);
          if (g.weapons?.length) parts.push(`Weapons: ${g.weapons.join(', ')}`);
          if (g.pack) parts.push(`Pack: ${g.pack}`);
          return parts.length ? section("Starter Gear", escapeHtml(parts.join(' • '))) : "";
        } catch {
          return c.equipment ? section("Starter Gear", escapeHtml(String(c.equipment))) : "";
        }
      })(),
      c.notes ? section("Notes", escapeHtml(c.notes)) : ""
    ].join("");

    previewCard.innerHTML = lines;
  } catch (err) {
    console.error('Preview render error:', err);
    const safe = document.getElementById('preview-card');
    if(safe) safe.innerHTML = `<div class="muted tiny">Preview unavailable (a script error occurred). Check console.</div>`;
  }
}

function line(html, tag) { return (tag === "h3") ? `<div class="title">${html}</div>` : `<div class="line">${html}</div>`; }
function hr(){ return `<div class="hr"></div>`; }
function pill(t){ return `<span class="pill">${escapeHtml(t)}</span>`; }
function statBox(k, v){
  const m = mod(v); const mm = m>=0?`+${m}`:`${m}`;
  return `<div class="stat"><div>${k}</div><strong>${v}</strong><div class="tiny muted">${mm}</div></div>`;
}
function grid(items){ return `<div class="stats">${items.join("")}</div>`; }
function section(title, body){ return `<div class="line"><strong>${escapeHtml(title)}:</strong> ${body}</div>`; }
function escapeHtml(s) { return (s || "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;"); }

// Randomise quick helper
function randomiseCharacter() {
  document.getElementById("name").value = randomName();
  document.getElementById("race").selectedIndex = Math.floor(Math.random() * document.getElementById("race").length);
  document.getElementById("class").selectedIndex = Math.floor(Math.random() * document.getElementById("class").length);
  document.getElementById("background").selectedIndex = Math.floor(Math.random() * document.getElementById("background").length);
  document.getElementById("alignment").selectedIndex = Math.floor(Math.random() * document.getElementById("alignment").length);
  document.getElementById("level").value = 1; // keep to level 1 for rules demo
  rollAll();
  autoHP();
  updateSkillLimits();
  updateGearLimits();
  renderSpellsUI();
  updateSpellLimits();
  renderPreview();
}

// Silly fantasy name generator (simple & safe)
function randomName() {
  const starts = ["Ka","Va","Ra","El","Ar","Da","La","Ma","Thra","Zy","Ny","Cor","Fen","Gor","Syl","Ila"];
  const mids   = ["el","an","or","is","yn","ath","ir","en","ar","um","ra","iel","aine","os","eth"];
  const ends   = ["dor","rin","wyn","ra","ion","a","or","is","ar","na","th","iel","eus","ira","mir"];
  return starts[rand(starts)] + mids[rand(mids)] + ends[rand(ends)];
}
function rand(arr){ return Math.floor(Math.random()*arr.length); }

/* Traits + class icon for DM card */
function computeTraits(){
  const cls = document.getElementById('class').value;
  const traits = [];
  const skills = collectSkills();
  if(skills.length){ traits.push(skills[0]); }
  if(cls === 'Rogue') traits.push('Stealthy');
  if(cls === 'Barbarian') traits.push('Reckless');
  if(cls === 'Paladin') traits.push('Divine Sense');
  return traits.slice(0, 4);
}
function classIconPath(){
  const cls = document.getElementById('class').value || 'NPC';
  return `assets/class_icons/${cls}.svg`;
}

/* ===================== PRINT / EXPORT ===================== */
function abilityMod(n){ const m = Math.floor((n-10)/2); return m>=0?`+${m}`:`${m}`; }

function buildCharacterSheetHTML(c){
  const skills = Array.isArray(c.skills)? c.skills : [];
  const profs  = Array.isArray(c.proficiencies)? c.proficiencies : [];
  const spells = Array.isArray(c.spells)? c.spells : [];
  const pills = arr => (arr||[]).map(s=>`<span class="pill">${escapeHtml(String(s))}</span>`).join("");

  // Parse structured gear
  let gearLines = [];
  try {
    const g = typeof c.equipment === 'string' ? JSON.parse(c.equipment) : (c.equipment || {});
    if (g.armor?.length) gearLines.push(`Armor: ${g.armor.join(', ')}`);
    if (g.weapons?.length) gearLines.push(`Weapons: ${g.weapons.join(', ')}`);
    if (g.pack) gearLines.push(`Pack: ${g.pack}`);
  } catch {
    if (c.equipment) gearLines.push(String(c.equipment));
  }

  return `
<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>${escapeHtml(c.name || "Character Sheet")} — Tabletop Friends</title>
  <link href="https://fonts.googleapis.com/css2?family=Arvo:wght@400;700&display=swap" rel="stylesheet">
  <style>${getInlineSheetCss()}</style>
</head>
<body>
  <div class="print-wrap">
    <div class="sheet" role="document" aria-label="Character Sheet">

      <div class="sheet-head">
        <div>
          <div class="brand">Tabletop <span class="accent">Friends</span></div>
          <h1>${escapeHtml(c.name || "Unnamed Hero")}</h1>
        </div>
        <div class="smallnote">Print or Save as PDF. White background to save ink.</div>
      </div>

      <div class="meta">
        <div class="fieldline">
          <div class="label">Class & Level</div>
          <div>${escapeHtml(c.class)} — L${c.level}</div>
        </div>
        <div class="fieldline">
          <div class="label">Race</div>
          <div>${escapeHtml(c.race)}</div>
        </div>
        <div class="fieldline">
          <div class="label">Background</div>
          <div>${escapeHtml(c.background)}</div>
        </div>
        <div class="fieldline">
          <div class="label">Alignment</div>
          <div>${escapeHtml(c.alignment)}</div>
        </div>
        <div class="fieldline">
          <div class="label">Hit Points</div>
          <div>${c.hp}/${c.hp}</div>
        </div>
        <div class="fieldline">
          <div class="label">Player</div>
          <div contenteditable="true" class="editable">—</div>
        </div>
      </div>

      <div class="section-title">Ability Scores</div>
      <div class="grid-6">
        ${statBoxHTML("STR", c.abilities.str)}
        ${statBoxHTML("DEX", c.abilities.dex)}
        ${statBoxHTML("CON", c.abilities.con)}
        ${statBoxHTML("INT", c.abilities.int)}
        ${statBoxHTML("WIS", c.abilities.wis)}
        ${statBoxHTML("CHA", c.abilities.cha)}
      </div>

      <div class="section-title">Skills</div>
      <div class="pillrow">${pills(skills)}</div>

      <div class="section-title">Proficiencies & Tools</div>
      <div class="pillrow">${pills(profs)}</div>

      <div class="section-title">Spells</div>
      <div class="pillrow">${pills(spells)}</div>

      <div class="section-title">Starter Gear</div>
      <div class="fieldline" style="min-height: auto;">
        ${gearLines.length ? escapeHtml(gearLines.join(" • ")) : '<span class="smallnote">—</span>'}
      </div>

      <div class="section-title">Notes</div>
      <div class="fieldline" contenteditable="true" style="min-height: 100px;">${escapeHtml(c.notes || "")}</div>

      <div class="smallnote" style="margin-top:10px">© Tabletop Friends — Lime Green & Midnight Blue accents. For home use.</div>
    </div>
  </div>
  <script>window.setTimeout(()=>window.print && window.print(), 350);</script>
</body>
</html>
  `.trim();

  function statBoxHTML(k, v){
    return `
      <div class="statbox">
        <div class="k">${k}</div>
        <div class="v">${v}</div>
        <div class="m">${abilityMod(v)}</div>
      </div>
    `;
  }
}

// Inline minimal CSS so popup/Word export looks the same
function getInlineSheetCss(){
  return `
  body{background:#fff;color:#111;font-family:"Arvo",Georgia,serif;}
  .sheet{background:#fff;color:#111;max-width:800px;margin:0 auto;padding:20px 22px;border:1px solid #e5e7eb;}
  .sheet .sheet-head{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center;border-bottom:2px solid #0f2a44;padding-bottom:8px;margin-bottom:12px;}
  .sheet .brand{font-weight:700;font-size:18px;color:#0f2a44}.sheet .brand .accent{color:#3a4a00}
  .sheet h1{margin:0;font-size:22px;letter-spacing:.3px}
  .sheet .meta{display:grid;grid-template-columns:repeat(3,1fr);gap:6px 10px;margin-top:8px}
  .sheet .fieldline{border:1px solid #d6ed17;border-radius:8px;padding:6px 8px;min-height:36px}
  .sheet .label{font-size:11px;color:#3a3a3a}
  .grid-6{display:grid;grid-template-columns:repeat(6,1fr);gap:8px}
  .section-title{margin:12px 0 6px;padding-bottom:4px;border-bottom:2px solid #d6ed17;color:#0f2a44;font-weight:700}
  .statbox{border:2px solid #0f2a44;border-radius:10px;text-align:center;padding:6px 4px}
  .statbox .k{font-size:12px;color:#1f2937}.statbox .v{font-size:22px;font-weight:700}.statbox .m{font-size:12px;color:#374151}
  .pillrow{display:flex;gap:6px;flex-wrap:wrap}
  .pill{border:1px solid #0f2a44;border-radius:999px;font-size:12px;padding:2px 8px;background:#fff;color:#0f2a44}
  .smallnote{font-size:11px;color:#475569}
  `;
}

// Opens a new window with the sheet and triggers Print (user can "Save as PDF")
function openPrintSheet(c){
  const w = window.open("", "_blank");
  if(!w){ alert("Please allow popups to print or save as PDF."); return; }
  w.document.open();
  w.document.write(buildCharacterSheetHTML(c));
  w.document.close();
}

// Downloads an editable Word .doc built from the same HTML
function downloadWordDoc(c){
  const html = buildCharacterSheetHTML(c)
    .replace(/<script>[^]*?<\/script>/g, ""); // strip auto-print for Word
  const header = `
  <html xmlns:o='urn:schemas-microsoft-com:office:office'
        xmlns:w='urn:schemas-microsoft-com:office:word'
        xmlns='http://www.w3.org/TR/REC-html40'>
  <head><meta charset="utf-8"><title>${escapeHtml(c.name||"Character Sheet")}</title></head><body>`;
  const footer = `</body></html>`;
  const blob = new Blob([header + html + footer], { type: "application/msword;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const safeName = (c.name || "Character").replace(/[^\w\-]+/g,"_");
  a.download = `${safeName}_TabletopFriends_CharacterSheet.doc`;
  document.body.appendChild(a);
  a.click();
  setTimeout(()=>{ URL.revokeObjectURL(url); a.remove(); }, 0);
}
