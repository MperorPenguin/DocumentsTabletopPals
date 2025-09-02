/* Character Creator v2.2.2 (standalone, /character-creator/)
   Theme: Lime Green #d6ed17 + Midnight Blue #000e1b
   Saves to localStorage: 'tp_cc_state_v2_2_2' (progress), 'tp_cc_characters' (library)
*/

const STORAGE_KEY = 'tp_cc_state_v2_2_2';
const LIBRARY_KEY = 'tp_cc_characters';
const SESSION_SKIP_CONFIRM = 'tp_cc_skip_confirm_class_change';

const STEPS = [
  { id:'class',      label:'Class' },
  { id:'species',    label:'Species' },
  { id:'background', label:'Background' },
  { id:'skills',     label:'Skills' },
  { id:'about',      label:'About' },
];

const ALL_SKILLS = [
  'Acrobatics','Animal Handling','Arcana','Athletics','Deception','History','Insight',
  'Intimidation','Investigation','Medicine','Nature','Perception','Performance',
  'Persuasion','Religion','Sleight of Hand','Stealth','Survival'
];

// Basic PHB 2014/2024 skill choice sets and suggestions
const CLASSES = [
  c('Barbarian', 2014, true, 2, ['Animal Handling','Athletics','Intimidation','Nature','Perception','Survival']),
  c('Barbarian', 2024, true, 2, ['Athletics','Perception']),
  c('Bard', 2014, true, 3, ALL_SKILLS.slice()),
  c('Bard', 2024, true, 3, ALL_SKILLS.slice()),
  c('Cleric', 2014, false, 2, ['History','Insight','Medicine','Persuasion','Religion']),
  c('Cleric', 2024, false, 2, ['Insight','Religion']),
  c('Druid', 2014, false, 2, ['Arcana','Animal Handling','Insight','Medicine','Nature','Perception','Religion','Survival']),
  c('Druid', 2024, false, 2, ['Nature','Survival']),
  c('Fighter', 2014, false, 2, ['Acrobatics','Animal Handling','Athletics','History','Insight','Intimidation','Perception','Survival']),
  c('Fighter', 2024, false, 2, ['Athletics','Perception']),
  c('Monk', 2014, false, 2, ['Acrobatics','Athletics','History','Insight','Religion','Stealth']),
  c('Monk', 2024, false, 2, ['Acrobatics','Insight']),
  c('Paladin', 2014, false, 2, ['Athletics','Insight','Intimidation','Medicine','Persuasion','Religion']),
  c('Paladin', 2024, false, 2, ['Athletics','Persuasion']),
  c('Ranger', 2014, true, 3, ['Animal Handling','Athletics','Insight','Investigation','Nature','Perception','Stealth','Survival']),
  c('Ranger', 2024, true, 3, ['Nature','Perception','Survival']),
  c('Rogue', 2014, true, 4, ['Acrobatics','Athletics','Deception','Insight','Intimidation','Investigation','Perception','Performance','Persuasion','Sleight of Hand','Stealth']),
  c('Rogue', 2024, true, 4, ['Acrobatics','Investigation','Sleight of Hand','Stealth']),
  c('Sorcerer', 2014, false, 2, ['Arcana','Deception','Insight','Intimidation','Persuasion','Religion']),
  c('Sorcerer', 2024, false, 2, ['Arcana','Intimidation']),
  c('Warlock', 2014, false, 2, ['Arcana','Deception','History','Intimidation','Investigation','Nature','Religion']),
  c('Warlock', 2024, false, 2, ['Arcana','Deception']),
  c('Wizard', 2014, false, 2, ['Arcana','History','Insight','Investigation','Medicine','Religion']),
  c('Wizard', 2024, false, 2, ['Arcana','History']),
];
function c(name, year, featured, skillChoices, list){ return { name, year, featured, skillChoices, list }; }

const SPECIES = ['Human','Elf','Dwarf','Halfling','Gnome','Half-Orc','Tiefling','Dragonborn'];

const BACKGROUNDS = [
  bg('Acolyte', ['Insight','Religion'], 2),
  bg('Charlatan', ['Deception','Sleight of Hand'], 0),
  bg('Criminal', ['Deception','Stealth'], 0),
  bg('Entertainer', ['Acrobatics','Performance'], 0),
  bg('Folk Hero', ['Animal Handling','Survival'], 0),
  bg('Noble', ['History','Persuasion'], 1),
  bg('Sage', ['Arcana','History'], 0),
  bg('Soldier', ['Athletics','Intimidation'], 0),
];
function bg(name, skills, languages){ return { name, skills, languages }; }

const LANGUAGES = ['Common','Dwarvish','Elvish','Giant','Gnomish','Goblin','Halfling','Orc','Draconic','Infernal','Celestial','Sylvan','Deep Speech','Primordial','Undercommon'];

let state = load() || {
  step: 0,                   // index into STEPS
  selectedClass: null,       // {name, year}
  species: null,
  background: null,          // name
  classSkillChoices: [],     // class picks only (background skills are auto-included/locked)
  name: '',
  languages: [],
  search: '',
  filterFeatured: true,
  filter2024: false,
};

function save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function load(){ try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch(e){ return null; } }

/* ===== DOM ===== */
const elGrid = document.getElementById('class-grid');
const elSearch = document.getElementById('class-search');
const elChipFeat = document.getElementById('chip-featured');
const elChip2024 = document.getElementById('chip-2024');
const elStepLinks = document.getElementById('step-links');
const elWhere = document.getElementById('step-where');
const elNext = document.getElementById('btn-next');
const elBack = document.getElementById('btn-back');

/* ===== Filters ===== */
elSearch.addEventListener('input', ()=>{ state.search = elSearch.value; renderClassGrid(); });
elChipFeat.addEventListener('click', ()=>{ state.filterFeatured = !state.filterFeatured; elChipFeat.classList.toggle('active', state.filterFeatured); elChipFeat.setAttribute('aria-pressed', String(state.filterFeatured)); renderClassGrid(); });
elChip2024.addEventListener('click', ()=>{ state.filter2024 = !state.filter2024; elChip2024.classList.toggle('active', state.filter2024); elChip2024.setAttribute('aria-pressed', String(state.filter2024)); renderClassGrid(); });

document.getElementById('btn-review').addEventListener('click', openReview);
document.getElementById('btn-save')?.addEventListener('click', saveToLibrary);

elNext.addEventListener('click', ()=>{ go( +1 ); });
elBack.addEventListener('click', ()=>{ go( -1 ); });

/* ===== Boot ===== */
render();
function render(){
  renderSteps();
  const step = STEPS[state.step].id;
  elWhere.textContent = `Step ${state.step+1} of ${STEPS.length}: ${STEPS[state.step].label}`;

  if(step === 'class'){
    document.querySelector('.cc-left').hidden = false;
    renderClassGrid();
  }else{
    document.querySelector('.cc-left').hidden = true;
    renderStepRight(step);
  }

  elBack.disabled = state.step === 0;
  elNext.disabled = !canContinue(step);
  elNext.textContent = state.step === STEPS.length-1 ? 'Finish' : 'Next';
}

function renderSteps(){
  elStepLinks.innerHTML = STEPS.map((s, i)=>`<li><button class="btn ${i===state.step?'active':''}" type="button" onclick="jump(${i})">${s.label}</button></li>`).join('');
}

function jump(i){
  if(i<0 || i>=STEPS.length) return;
  if(!canContinue(STEPS[state.step].id)) return; // prevent skipping requirements
  state.step = i; save(); render();
}

/* ===== Step 1: Class ===== */
function renderClassGrid(){
  const list = CLASSES.filter(row => {
    if(state.filterFeatured && !row.featured) return false;
    if(state.filter2024 && row.year !== 2024) return false;
    if(state.search && !(`${row.name} ${row.year}`.toLowerCase().includes(state.search.toLowerCase()))) return false;
    return true;
  });

  elGrid.innerHTML = list.map(row => {
    const isSel = !!state.selectedClass && state.selectedClass.name === row.name && state.selectedClass.year === row.year;
    return `<li><button class="card ${isSel?'selected':''}" data-bg="${row.name}" type="button" onclick="selectClass('${row.name}', ${row.year})">
      <span class="tag">${row.year}</span>
      <div class="inner">
        <span class="name">${row.name}</span>
        <span class="pub" title="Publisher logo (placeholder)"></span>
      </div>
    </button></li>`;
  }).join('');
}

function selectClass(name, year){
  // Confirm if we’re changing after making dependent choices
  const changing = state.selectedClass && (state.selectedClass.name !== name || state.selectedClass.year !== year);
  if(changing && (state.classSkillChoices.length || state.background || state.species || state.name)){
    const skip = sessionStorage.getItem(SESSION_SKIP_CONFIRM) === '1';
    if(!skip){
      openConfirm(()=>{ doSetClass(name, year); });
      return;
    }
  }
  doSetClass(name, year);
}
function doSetClass(name, year){
  state.selectedClass = { name, year };
  // clear class-dependent choices
  state.classSkillChoices = [];
  save();
  renderClassGrid();
  render(); // refresh ctas
}

/* ===== Steps 2–5 (right column) ===== */
function renderStepRight(step){
  const right = document.querySelector('.cc-right');
  right.innerHTML = '';
  if(step==='species'){
    right.appendChild(clone('#tpl-step-species'));
    const wrap = right.querySelector('#species-list');
    wrap.innerHTML = SPECIES.map(sp => `<button type="button" class="pill ${state.species===sp?'active':''}" onclick="setSpecies('${sp}')">${sp}</button>`).join('');
  }
  if(step==='background'){
    right.appendChild(clone('#tpl-step-background'));
    const wrap = right.querySelector('#bg-list');
    wrap.innerHTML = BACKGROUNDS.map(b => `<button type="button" class="pill ${state.background===b.name?'active':''}" onclick="setBackground('${b.name}')">${b.name}</button>`).join('');
    updateBackgroundInfo();
  }
  if(step==='skills'){
    right.appendChild(clone('#tpl-step-skills'));
    renderSkills();
  }
  if(step==='about'){
    right.appendChild(clone('#tpl-step-about'));
    const nameEl = right.querySelector('#cc-name');
    nameEl.value = state.name || '';
    nameEl.addEventListener('input', ()=>{ state.name = nameEl.value; save(); refreshCTAs(); });
    setupLanguageDropdown(right);
  }
}

function setSpecies(sp){ state.species = sp; save(); render(); }
function setBackground(name){ state.background = name; save(); updateBackgroundInfo(); render(); }
function updateBackgroundInfo(){
  const right = document.querySelector('.cc-right');
  const info = right.querySelector('#bg-info');
  if(!info || !state.background){ if(info) info.textContent=''; return; }
  const b = BACKGROUNDS.find(x=>x.name===state.background);
  const lang = b.languages>0 ? `, Languages: choose ${b.languages}` : '';
  info.textContent = `Grants skills: ${b.skills.join(', ')}${lang}`;
}

/* ===== Skills step ===== */
function getClassRow(){ return state.selectedClass ? CLASSES.find(c => c.name===state.selectedClass.name && c.year===state.selectedClass.year) : null; }
function renderSkills(){
  const right = document.querySelector('.cc-right');
  const mount = right.querySelector('#skills-grid');
  const row = getClassRow();
  if(!row){ mount.innerHTML = '<div class="small">Choose a class first.</div>'; return; }

  // Background fixed skills
  const fixed = new Set((BACKGROUNDS.find(b=>b.name===state.background)?.skills) || []);
  const candidates = row.list.slice();
  const picksAllowed = row.skillChoices;

  right.querySelector('#skills-rules').textContent =
    `Choose ${picksAllowed} skill${picksAllowed>1?'s':''} for your class. ` +
    (fixed.size ? `Background grants: ${Array.from(fixed).join(', ')}.` : 'Background grants: none.');

  mount.innerHTML = ALL_SKILLS.map(sk => {
    const disabled = fixed.has(sk);
    const checked = disabled || state.classSkillChoices.includes(sk);
    const suggested = candidates.includes(sk);
    return `<label class="skill ${suggested?'suggested':''}">
      <input type="checkbox" ${checked?'checked':''} ${disabled?'disabled':''}
        onchange="toggleSkill('${sk}', this.checked)" />
      <span>${sk}${disabled?' (from background)':''}</span>
    </label>`;
  }).join('');

  refreshCTAs();
}
function toggleSkill(skill, on){
  const row = getClassRow(); if(!row) return;
  const allowed = row.skillChoices;

  if(on){
    if(!state.classSkillChoices.includes(skill)){
      const have = state.classSkillChoices.length;
      if(have >= allowed){
        // Reject extra pick (revert checkbox)
        const inputs = document.querySelectorAll('#skills-grid input[type="checkbox"]');
        inputs.forEach(inp => { if(inp.nextElementSibling && inp.nextElementSibling.textContent.startsWith(skill)) { inp.checked=false; } });
        return;
      }
      state.classSkillChoices.push(skill);
    }
  }else{
    state.classSkillChoices = state.classSkillChoices.filter(s => s !== skill);
  }
  save();
  refreshCTAs();
}
function refreshCTAs(){
  elNext.disabled = !canContinue(STEPS[state.step].id);
}

/* ===== Languages dropdown (About) ===== */
function setupLanguageDropdown(root){
  const btn = root.querySelector('#lang-toggle');
  const panel = root.querySelector('#lang-panel');

  function rebuild(){
    const chosen = new Set(state.languages || []);
    panel.innerHTML = LANGUAGES.map(l => {
      const ck = chosen.has(l) ? 'checked' : '';
      return `<label class="check"><input type="checkbox" ${ck} onchange="toggleLang('${l}', this.checked)" /> <span>${l}</span></label>`;
    }).join('');
    btn.textContent = chosen.size ? Array.from(chosen).join(', ') : 'Select languages';
  }

  btn.addEventListener('click', ()=>{
    const open = panel.hasAttribute('hidden') ? false : true;
    if(open){ panel.setAttribute('hidden', ''); btn.setAttribute('aria-expanded','false'); }
    else{ panel.removeAttribute('hidden'); btn.setAttribute('aria-expanded','true'); }
  });

  document.addEventListener('click', (ev)=>{
    if(!root.contains(ev.target)) { panel.setAttribute('hidden',''); btn.setAttribute('aria-expanded','false'); }
  });

  rebuild();
}
function toggleLang(l, on){
  const set = new Set(state.languages || []);
  if(on){ set.add(l); } else { set.delete(l); }
  state.languages = Array.from(set);
  save();
  const btn = document.getElementById('lang-toggle');
  if(btn){ btn.textContent = set.size ? Array.from(set).join(', ') : 'Select languages'; }
}

/* ===== Navigation rules ===== */
function canContinue(stepId){
  switch(stepId){
    case 'class': return !!state.selectedClass;
    case 'species': return !!state.species;
    case 'background': return !!state.background;
    case 'skills': {
      const row = getClassRow(); if(!row) return false;
      return state.classSkillChoices.length === row.skillChoices;
    }
    case 'about': return !!(state.name && state.name.trim().length > 0);
  }
  return false;
}
function go(delta){
  const stepId = STEPS[state.step].id;
  if(!canContinue(stepId)) return;
  const next = state.step + delta;
  if(next < 0) return;
  if(next >= STEPS.length){
    openReview();
    return;
  }
  state.step = next; save(); render();
}

/* ===== Review & Save ===== */
function openReview(){
  const div = document.getElementById('review-body');
  if(!div){ return; }
  const b = BACKGROUNDS.find(x=>x.name===state.background);
  const skills = [ ...(b ? b.skills : []), ...state.classSkillChoices ];

  div.innerHTML = `
    <div class="cardish"><strong>Name:</strong><br>${escape(state.name || '—')}</div>
    <div class="cardish"><strong>Class:</strong><br>${escape(state.selectedClass ? state.selectedClass.name + ' (' + state.selectedClass.year + ')' : '—')}</div>
    <div class="cardish"><strong>Species:</strong><br>${escape(state.species || '—')}</div>
    <div class="cardish"><strong>Background:</strong><br>${escape(state.background || '—')}</div>
    <div class="cardish"><strong>Skills:</strong><br>${skills.map(escape).join(', ') || '—'}</div>
    <div class="cardish"><strong>Languages:</strong><br>${(state.languages||[]).map(escape).join(', ') || '—'}</div>
  `;
  openModal('modal-review');
}

function saveToLibrary(){
  const lib = loadLibrary();
  const id = cryptoRandomId();
  const payload = {
    id,
    name: state.name,
    class: state.selectedClass ? state.selectedClass.name : null,
    classYear: state.selectedClass ? state.selectedClass.year : null,
    species: state.species,
    background: state.background,
    skills: getAllSkillsCombined(),
    languages: state.languages || [],
    createdAt: new Date().toISOString()
  };
  lib.push(payload);
  localStorage.setItem(LIBRARY_KEY, JSON.stringify(lib));
  closeTopModal();
  alert('Saved to Library. This character will be available to the DM Toolkit via localStorage.');
}
function getAllSkillsCombined(){
  const bg = BACKGROUNDS.find(x=>x.name===state.background);
  const set = new Set([...(bg?bg.skills:[]), ...state.classSkillChoices]);
  return Array.from(set);
}
function loadLibrary(){ try { return JSON.parse(localStorage.getItem(LIBRARY_KEY)) || []; } catch(e){ return []; } }
function cryptoRandomId(){
  if(window.crypto?.randomUUID) return crypto.randomUUID();
  return 'id_' + Math.random().toString(36).slice(2);
}

/* ===== Modals ===== */
function openConfirm(onYes){
  const dlg = document.getElementById('modal-confirm');
  const yes = document.getElementById('confirm-yes');
  const closeBtns = dlg.querySelectorAll('[data-close]');
  const skipCk = document.getElementById('skip-confirm');

  const cleanup = ()=>{
    yes.onclick = null;
    closeBtns.forEach(b => b.onclick = null);
  };

  yes.onclick = ()=>{
    if(skipCk.checked){ sessionStorage.setItem(SESSION_SKIP_CONFIRM, '1'); }
    dlg.close(); cleanup(); onYes?.();
  };
  closeBtns.forEach(b => b.onclick = ()=>{ dlg.close(); cleanup(); });
  dlg.showModal();
}
function openModal(id){
  const dlg = document.getElementById(id);
  dlg.querySelectorAll('[data-close]').forEach(b => b.onclick = ()=>dlg.close());
  dlg.showModal();
}
function closeTopModal(){
  const dialogs = Array.from(document.querySelectorAll('dialog')).filter(d => d.open);
  if(dialogs.length){ dialogs[dialogs.length-1].close(); }
}

/* ===== Utils ===== */
function escape(s){ return String(s).replace(/[&<>\"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
function clone(sel){ return document.importNode(document.querySelector(sel).content, true); }

/* Expose for inline handlers */
window.selectClass = selectClass;
window.jump = jump;
window.setSpecies = setSpecies;
window.setBackground = setBackground;
window.toggleSkill = toggleSkill;
