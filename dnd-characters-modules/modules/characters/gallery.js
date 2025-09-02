// modules/characters/gallery.js
import { listCharacters, deleteCharacters, onStoreChange } from './storage.js';
import { navigate } from '../router.js';

export function mountGallery(root, { focusId = null } = {}){
  root.innerHTML = `
    <section class="gallery-head">
      <h2 class="gallery-title">Characters</h2>
      <div class="gallery-actions">
        <button class="btn" id="new-char">New Character</button>
        <button class="btn ghost" id="print-selected">Print Selected</button>
        <button class="btn ghost" id="delete-selected">Delete Selected</button>
      </div>
    </section>
    <section class="gallery-tools">
      <input type="search" id="gallery-search" placeholder="Search by name, class, species" />
      <span class="tiny muted">Tip: Press <strong>Esc</strong> for quick actions.</span>
    </section>
    <ul class="gallery-grid" id="gallery-grid"></ul>

    <div class="esc-menu" id="esc-menu" hidden>
      <div class="esc-menu__inner panel">
        <h3>Quick Actions</h3>
        <div class="esc-menu__row">
          <button class="btn" id="esc-new">New Character</button>
          <button class="btn" id="esc-print">Print Selected</button>
          <button class="btn ghost" id="esc-delete">Delete Selected</button>
          <button class="btn ghost" id="esc-close">Close</button>
        </div>
      </div>
    </div>

    <div id="print-area" class="print-area" hidden></div>
  `;

  const elGrid = root.querySelector('#gallery-grid');
  const elSearch = root.querySelector('#gallery-search');
  const escMenu = root.querySelector('#esc-menu');
  const selection = new Set();

  root.querySelector('#new-char').addEventListener('click', ()=>navigate('#characters/new'));
  root.querySelector('#print-selected').addEventListener('click', ()=>printSelected());
  root.querySelector('#delete-selected').addEventListener('click', ()=>bulkDelete());

  root.querySelector('#esc-new').addEventListener('click', ()=>navigate('#characters/new'));
  root.querySelector('#esc-print').addEventListener('click', ()=>printSelected());
  root.querySelector('#esc-delete').addEventListener('click', ()=>bulkDelete());
  root.querySelector('#esc-close').addEventListener('click', ()=>toggleEsc(false));

  document.addEventListener('keydown', onKey);

  const unsub = onStoreChange(()=> render());
  render();

  function onKey(e){
    if(e.key === 'Escape'){
      toggleEsc(escMenu.hasAttribute('hidden'));
    }
  }
  function toggleEsc(open){
    if(open){ escMenu.removeAttribute('hidden'); }
    else { escMenu.setAttribute('hidden',''); }
  }

  elSearch.addEventListener('input', render);

  function render(){
    const q = (elSearch.value || '').toLowerCase();
    const list = listCharacters()
      .filter(c => `${c.name||''} ${c.class||''} ${c.species||''}`.toLowerCase().includes(q))
      .sort((a,b)=> (b.updatedAt||b.createdAt||'').localeCompare(a.updatedAt||a.createdAt||''));

    elGrid.innerHTML = list.map(c => `
      <li class="gal-card ${selection.has(c.id)?'selected':''}" data-id="${c.id}">
        <div class="gal-card__head">
          <input type="checkbox" class="gal-card__ck" ${selection.has(c.id)?'checked':''} />
          <div class="gal-card__name">${esc(c.name||'Unnamed')}</div>
        </div>
        <div class="gal-card__meta tiny">
          <span>${esc(c.class||'—')}${c.classYear?` (${c.classYear})`:''}</span> ·
          <span>${esc(c.species||'—')}</span> ·
          <span>${esc(c.background||'—')}</span>
        </div>
        <div class="gal-card__tags tiny">
          ${(c.languages||[]).map(l => `<span class="tag">${esc(l)}</span>`).join('')}
        </div>
        <div class="gal-card__foot">
          <button class="btn ghost" data-edit>Edit</button>
          <button class="btn" data-print-one>Print</button>
        </div>
      </li>
    `).join('');

    if(focusId && list.some(c => c.id===focusId)){
      const focusEl = elGrid.querySelector(`[data-id="${focusId}"]`);
      focusEl?.scrollIntoView({ behavior:'smooth', block:'center' });
      focusEl?.classList.add('pulse');
      setTimeout(()=> focusEl?.classList.remove('pulse'), 800);
      focusId = null;
    }

    elGrid.querySelectorAll('.gal-card').forEach(card => {
      const id = card.getAttribute('data-id');
      card.querySelector('.gal-card__ck').addEventListener('change', (e)=>{
        e.currentTarget.checked ? selection.add(id) : selection.delete(id);
        card.classList.toggle('selected', e.currentTarget.checked);
      });
      card.querySelector('[data-edit]').addEventListener('click', ()=> navigate('#characters/edit', { id }));
      card.querySelector('[data-print-one]').addEventListener('click', ()=> printSelected([id]));
      card.addEventListener('dblclick', ()=> navigate('#characters/edit', { id }));
    });
  }

  function bulkDelete(){
    if(selection.size === 0) return;
    if(!confirm(`Delete ${selection.size} character(s)? This cannot be undone.`)) return;
    deleteCharacters(Array.from(selection));
    selection.clear();
  }

  function printSelected(forceIds){
    const ids = forceIds || Array.from(selection);
    if(ids.length === 0) return;
    const chars = listCharacters().filter(c => ids.includes(c.id));
    const area = root.querySelector('#print-area');
    area.innerHTML = chars.map(sheetHTML).join('');
    area.removeAttribute('hidden');
    window.print();
    area.setAttribute('hidden','');
  }

  function sheetHTML(c){
    const skills = (c.skills||[]).sort();
    return `
      <section class="print-sheet">
        <h2>${esc(c.name||'Unnamed')}</h2>
        <div class="print-row"><strong>Class:</strong> ${esc(c.class||'—')}${c.classYear?` (${c.classYear})`:''}</div>
        <div class="print-row"><strong>Species:</strong> ${esc(c.species||'—')}</div>
        <div class="print-row"><strong>Background:</strong> ${esc(c.background||'—')}</div>
        <div class="print-row"><strong>Languages:</strong> ${(c.languages||[]).map(esc).join(', ')||'—'}</div>
        <div class="print-row"><strong>Skills:</strong> ${skills.map(esc).join(', ')||'—'}</div>
        <div class="tiny muted">Printed ${new Date().toLocaleString()}</div>
      </section>
    `;
  }

  function esc(s){ return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[m])); }

  return () => { unsub(); document.removeEventListener('keydown', onKey); };
}
