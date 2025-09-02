// modules/characters/creator.js
import { getCharacter, saveCharacter } from './storage.js';

const ALL_SKILLS = [
  'Acrobatics','Animal Handling','Arcana','Athletics','Deception','History','Insight',
  'Intimidation','Investigation','Medicine','Nature','Perception','Performance',
  'Persuasion','Religion','Sleight of Hand','Stealth','Survival'
];

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

export function mountCreator(root, opts = {}){
  const state = loadInitial(opts.id);

  root.innerHTML = `
    <div class="cc">
      <header class="cc-top">
        <div class="cc-top__left">
          <div class="cc-brand-mark"></div>
          <h1 class="cc-title">Character Creator <span class="ver">v2.2.2</span></h1>
        </div>
        <div class="cc-top__actions">
          <button class="btn ghost" id="btn-review">Review</button>
          <button class="btn" id="btn-save">Save</button>
        </div>
      </header>

      <div class="cc-layout">
        <aside class="cc-left">
          <div class="cc-search-row">
            <input id="class-search" type="search" placeholder="Search Classes" class="cc-search" />
            <div class="cc-chips">
              <button id="chip-featured" class="chip ${state.filterFeatured?'active':''}" type="button" aria-pressed="${state.filterFeatured}">Featured</button>
              <button id="chip-2024" class="chip ${state.filter2024?'active':''}" type="button" aria-pressed="${state.filter2024}">2024</button>
            </div>
          </div>
            <ul id="class-grid" class="grid"></ul>
        </aside>

        <section class="cc-right" id="creator-right">
          ${rightHTML()}
        </section>
      </div>

      <footer class="cc-footer">
        <nav class="steps">
          <ul id="step-links" class="step-links"></ul>
          <div class="step-where" id="step-where"></div>
        </nav>
        <div class="step-ctas">
          <button id="btn-back" class="btn ghost" type="button">Back</button>
          <button id="btn-next" class="btn" type="button" disabled>Next</button>
        </div>
      </footer>
    </div>

    <dialog id="modal-review" class="modal">
      <div class="modal__inner">
        <header class="modal__header">
          <h2>Review Character</h2>
          <button class="modal__close" data-close>&times;<span class="sr">Close</span></button>
        </header>
        <div class="modal__content">
          <div id="review-body" class="review"></div>
        </div>
        <footer class="modal__footer">
          <button class="btn ghost" data-close>Close</button>
          <button id="btn-save-2" class="btn">Save to Library</button>
        </footer>
      </div>
    </dialog>
  `;

  const elGrid = root.querySelector('#class-grid');
  const elSearch = root.querySelector('#class-search');
  const chipFeatured = root.querySelector('#chip-featured');
  const chip2024 = root.querySelector('#chip-2024');
  const elStepLinks = root.querySelector('#step-links');
  const elWhere = root.querySelector('#step-where');
  const elNext = root.querySelector('#btn-next');
  const elBack = root.querySelector('#btn-back');

  elSearch.value = state.search;
  elSearch.addEventListener('input', ()=>{ state.search = elSearch.value; renderClassGrid(); });

  chipFeatured.addEventListener('click', ()=>{ state.filterFeatured = !state.filterFeatured; chipFeatured.classList.toggle('active', state.filterFeatured); chipFeatured.setAttribute('aria-pressed', String(state.filterFeatured)); renderClassGrid(); });
  chip2024.addEventListener('click', ()=>{ state.filter2024 = !state.filter2024; chip2024.classList.toggle('active', state.filter2024); chip2024.setAttribute('aria-pressed', String(state.filter2024)); renderClassGrid(); });

  root.querySelector('#btn-review').addEventListener('click', openReview);
  root.querySelector('#btn-save').addEventListener('click', saveNow);
  root.querySelector('#btn-save-2').addEventListener('click', saveNow);

  elNext.addEventListener('click', ()=> go(+1));
  elBack.addEventListener('click', ()=> go(-1));

  render();

  function render(){
    renderSteps();
    renderClassGrid();
    renderRight();
    updateStepIndicators();
  }

  function renderSteps(){
    elStepLinks.innerHTML = steps().map((s, i)=>`<li><button class="btn ${i===state.step?'active':''}" type="button" data-jump="${i}">${s.label}</button></li>`).join('');
    elStepLinks.querySelectorAll('[data-jump]').forEach(b => b.addEventListener('click', e=>{
      const i = +e.currentTarget.getAttribute('data-jump');
      if(i<0 || i>=steps().length) return;
      if(!canContinue(curStep().id)) return;
      state.step = i; render();
    }));
  }

  function renderClassGrid(){
    const list = CLASSES.filter(row => {
      if(state.filterFeatured && !row.featured) return false;
      if(state.filter2024 && row.year !== 2024) return false;
      if(state.search && !((row.name + ' ' + row.year).toLowerCase().includes(state.search.toLowerCase()))) return false;
      return true;
    });

    elGrid.innerHTML = list.map(row => {
      const isSel = isSelected(row);
      return `<li>
        <button class="card ${isSel?'selected':''}" data-bg="${row.name}" type="button" data-class="${row.name}" data-year="${row.year}">
          <span class="tag">${row.year}</span>
          <div class="inner"><span class="name">${row.name}</span><span class="pub"></span></div>
        </button>
      </li>`;
    }).join('');

    elGrid.querySelectorAll('[data-class]').forEach(btn => btn.addEventListener('click', ()=>{
      const name = btn.getAttribute('data-class');
      const year = +btn.getAttribute('data-year');
      state.selectedClass = { name, year };
      state.classSkillChoices = state.classSkillChoices.filter(s => ALL_SKILLS.includes(s));
      render();
    }));
  }

  function renderRight(){
    const mount = root.querySelector('#creator-right');
    const id = curStep().id;
    if(id==='class'){
      mount.innerHTML = rightHTML();
    }
    if(id==='species'){
      mount.innerHTML = `<div class="panel"><h2>Species</h2><div class="pillwrap" id="species-list"></div></div>`;
      const wrap = mount.querySelector('#species-list');
      wrap.innerHTML = SPECIES.map(sp => `<button type="button" class="pill ${state.species===sp?'active':''}" data-sp="${sp}">${sp}</button>`).join('');
      wrap.querySelectorAll('[data-sp]').forEach(b => b.addEventListener('click', ()=>{ state.species = b.getAttribute('data-sp'); render(); }));
    }
    if(id==='background'){
      mount.innerHTML = `<div class="panel"><h2>Background</h2><div class="pillwrap" id="bg-list"></div><div id="bg-info" class="small" style="margin-top:8px;"></div></div>`;
      const wrap = mount.querySelector('#bg-list');
      wrap.innerHTML = BACKGROUNDS.map(b => `<button type="button" class="pill ${state.background===b.name?'active':''}" data-bg="${b.name}">${b.name}</button>`).join('');
      wrap.querySelectorAll('[data-bg]').forEach(b => b.addEventListener('click', ()=>{ state.background = b.getAttribute('data-bg'); renderRight(); updateStepIndicators(); }));
      updateBgInfo();
    }
    if(id==='skills'){
      mount.innerHTML = `<div class="panel"><h2>Skills</h2><div id="skills-rules" class="small"></div><div id="skills-grid" class="skills-grid"></div></div>`;
      drawSkills();
    }
    if(id==='about'){
      mount.innerHTML = `
        <div class="panel"><h2>About</h2>
          <div class="grid2">
            <label class="field"><span>Name</span>
              <input id="cc-name" type="text" placeholder="E.g., Kael Stormborn" />
              <div class="helper tiny">Tip: choose something memorable. You can change it later.</div>
            </label>
            <label class="field"><span>Languages <span class="tiny muted">(optional)</span></span>
              <button id="lang-toggle" class="select like-input" type="button" aria-expanded="false">Select languages</button>
              <div id="lang-panel" class="dropdown" hidden></div>
            </label>
          </div>
        </div>`;
      const nameEl = mount.querySelector('#cc-name');
      nameEl.value = state.name || '';
      nameEl.addEventListener('input', ()=>{ state.name = nameEl.value; updateStepIndicators(); });
      setupLangDropdown(mount);
    }
  }

  function steps(){ return [
    { id:'class', label:'Class' },
    { id:'species', label:'Species' },
    { id:'background', label:'Background' },
    { id:'skills', label:'Skills' },
    { id:'about', label:'About' },
  ];}
  function curStep(){ return steps()[state.step]; }

  function updateStepIndicators(){
    const step = curStep().id;
    elWhere.textContent = `Step ${state.step+1} of ${steps().length}: ${curStep().label}`;
    elBack.disabled = state.step === 0;
    elNext.disabled = !canContinue(step);
    elNext.textContent = state.step === steps().length-1 ? 'Finish' : 'Next';
  }

  function go(delta){
    const id = curStep().id;
    if(!canContinue(id)) return;
    let next = state.step + delta;
    if(next<0) next=0;
    if(next>=steps().length){
      openReview();
      return;
    }
    state.step = next; render();
  }

  function canContinue(id){
    switch(id){
      case 'class': return !!state.selectedClass;
      case 'species': return !!state.species;
      case 'background': return !!state.background;
      case 'skills': {
        const row = getClassRow();
        return row && state.classSkillChoices.length === row.skillChoices;
      }
      case 'about': return !!(state.name && state.name.trim().length>0);
    }
    return false;
  }

  function getClassRow(){
    return state.selectedClass ? CLASSES.find(c => c.name===state.selectedClass.name && c.year===state.selectedClass.year) : null;
  }
  function isSelected(row){
    return !!state.selectedClass && state.selectedClass.name===row.name && state.selectedClass.year===row.year;
  }
  function updateBgInfo(){
    const el = root.querySelector('#bg-info');
    if(!el) return;
    const b = BACKGROUNDS.find(x=>x.name===state.background);
    el.textContent = b ? `Grants skills: ${b.skills.join(', ')}${b.languages?', Languages: choose '+b.languages:''}` : '';
  }

  function drawSkills(){
    const mount = root.querySelector('#skills-grid');
    const row = getClassRow();
    const fixed = new Set((BACKGROUNDS.find(b=>b.name===state.background)?.skills) || []);
    const picksAllowed = row?.skillChoices ?? 0;
    root.querySelector('#skills-rules').textContent =
      row ? `Choose ${picksAllowed} skill${picksAllowed>1?'s':''} for your class. ` +
      (fixed.size ? `Background grants: ${Array.from(fixed).join(', ')}.` : 'Background grants: none.')
      : 'Choose a class first.';

    if(!row){ mount.innerHTML = ''; return; }

    const candidates = row.list.slice();
    mount.innerHTML = ALL_SKILLS.map(sk => {
      const disabled = fixed.has(sk);
      const checked = disabled || state.classSkillChoices.includes(sk);
      const suggested = candidates.includes(sk);
      return `<label class="skill ${suggested?'suggested':''}">
        <input type="checkbox" ${checked?'checked':''} ${disabled?'disabled':''} data-skill="${sk}" />
        <span>${sk}${disabled?' (from background):':''}</span>
      </label>`;
    }).join('');

    mount.querySelectorAll('[data-skill]').forEach(inp => inp.addEventListener('change', (e)=>{
      const sk = e.currentTarget.getAttribute('data-skill');
      if(e.currentTarget.checked){
        if(!state.classSkillChoices.includes(sk)){
          if(state.classSkillChoices.length >= picksAllowed){
            e.currentTarget.checked = false;
            return;
          }
          state.classSkillChoices.push(sk);
        }
      }else{
        state.classSkillChoices = state.classSkillChoices.filter(s => s!==sk);
      }
      updateStepIndicators();
    }));
  }

  function setupLangDropdown(scope){
    const btn = scope.querySelector('#lang-toggle');
    const panel = scope.querySelector('#lang-panel');

    function rebuild(){
      const chosen = new Set(state.languages || []);
      panel.innerHTML = LANGUAGES.map(l => {
        const ck = chosen.has(l) ? 'checked' : '';
        return `<label class="check"><input type="checkbox" ${ck} data-lang="${l}" /> <span>${l}</span></label>`;
      }).join('');
      btn.textContent = chosen.size ? Array.from(chosen).join(', ') : 'Select languages';
    }

    btn.addEventListener('click', ()=>{
      const open = !panel.hasAttribute('hidden');
      if(open){ panel.setAttribute('hidden',''); btn.setAttribute('aria-expanded','false'); }
      else { panel.removeAttribute('hidden'); btn.setAttribute('aria-expanded','true'); }
    });
    document.addEventListener('click', (ev)=>{ if(!scope.contains(ev.target)){ panel.setAttribute('hidden',''); btn.setAttribute('aria-expanded','false'); }});
    panel.addEventListener('change', (ev)=>{
      const t = ev.target;
      if(t && t.hasAttribute('data-lang')){
        const l = t.getAttribute('data-lang');
        const set = new Set(state.languages || []);
        if(t.checked) set.add(l); else set.delete(l);
        state.languages = Array.from(set);
        rebuild();
      }
    });

    rebuild();
  }

  function openReview(){
    const div = root.querySelector('#review-body');
    const bg = BACKGROUNDS.find(x=>x.name===state.background);
    const skills = [...(bg?bg.skills:[]), ...state.classSkillChoices];
    div.innerHTML = `
      <div class="cardish"><strong>Name:</strong><br>${esc(state.name||'—')}</div>
      <div class="cardish"><strong>Class:</strong><br>${esc(state.selectedClass?`${state.selectedClass.name} (${state.selectedClass.year})`:'—')}</div>
      <div class="cardish"><strong>Species:</strong><br>${esc(state.species||'—')}</div>
      <div class="cardish"><strong>Background:</strong><br>${esc(state.background||'—')}</div>
      <div class="cardish"><strong>Skills:</strong><br>${skills.map(esc).join(', ')||'—'}</div>
      <div class="cardish"><strong>Languages:</strong><br>${(state.languages||[]).map(esc).join(', ')||'—'}</div>
    `;
    root.querySelector('#modal-review').showModal();
    root.querySelectorAll('[data-close]').forEach(b => b.onclick = ()=> root.querySelector('#modal-review').close());
  }

  function saveNow(){
    const payload = {
      id: state.id || undefined,
      name: state.name,
      class: state.selectedClass?.name || null,
      classYear: state.selectedClass?.year || null,
      species: state.species || null,
      background: state.background || null,
      skills: getAllSkillsCombined(state),
      languages: state.languages || [],
      inParty: state.inParty || false
    };
    const id = saveCharacter(payload);
    root.querySelector('#modal-review')?.close();
    opts.onSave?.(id);
  }

  function getAllSkillsCombined(st){
    const bg = BACKGROUNDS.find(x=>x.name===st.background);
    const set = new Set([...(bg?bg.skills:[]), ...st.classSkillChoices]);
    return Array.from(set);
  }

  function rightHTML(){
    return `
      <div class="panel">
        <h2>Choose your Class</h2>
        <p>Every adventurer belongs to a class. Your class shapes your combat style, special talents, and how you solve problems.</p>
      </div>
      <div class="panel">
        <h3>Where to Start?</h3>
        <p>Think about playstyle:</p>
        <div class="guide-block"><p><strong>I like charging in with steel.</strong></p><div class="suggested"><span>Barbarian</span><span>Fighter</span></div></div>
        <div class="guide-block"><p><strong>I want to sling spells.</strong></p><div class="suggested"><span>Wizard</span><span>Warlock</span><span>Sorcerer</span></div></div>
        <div class="guide-block"><p><strong>I want to support the party.</strong></p><div class="suggested"><span>Cleric</span><span>Bard</span><span>Druid</span></div></div>
      </div>
    `;
  }

  function loadInitial(id){
    if(!id) return {
      id:null, step:0, selectedClass:null, species:null, background:null,
      classSkillChoices:[], name:'', languages:[], search:'', filterFeatured:true, filter2024:false, inParty:false
    };
    const c = getCharacter(id);
    if(!c) return { id:null, step:0, selectedClass:null, species:null, background:null,
      classSkillChoices:[], name:'', languages:[], search:'', filterFeatured:true, filter2024:false, inParty:false };
    return {
      id: c.id,
      step:0,
      selectedClass: c.class ? { name:c.class, year:c.classYear } : null,
      species: c.species || null,
      background: c.background || null,
      classSkillChoices: (c.skills||[]).filter(s => ALL_SKILLS.includes(s)),
      name: c.name || '',
      languages: c.languages || [],
      search:'', filterFeatured:true, filter2024:false,
      inParty: !!c.inParty
    };
  }

  function esc(s){ return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[m])); }
}
