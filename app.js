const state = {
  terrain: 'Forest',
  selectedToken: null,
  party: [
    { id:'p1', name:'Aria', class:'Rogue', level:1 },
    { id:'p2', name:'Bronn', class:'Fighter', level:1 }
  ],
  enemies: [
    { id:'e1', name:'Skeleton A', class:'Wizard', ac:13, hp:13 }
  ]
};

function save(){}
function render(){
  renderDmPanel();
}

function terrainChips(){
  let chips = [];
  if(state.terrain==='Forest'){
    chips.push({label:'Undergrowth (difficult)', color:'var(--sage)'});
    chips.push({label:'Cover available', color:'var(--sage)'});
    chips.push({label:'Advantage hints: Aria', color:'var(--teal)'});
    chips.push({label:'Disadvantage hints: Bronn', color:'var(--red)'});
  }
  return chips;
}

function renderDmPanel(){
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="dm-panel">
      <h3>DM Panel</h3>
      <div class="section">
        <div class="small">Terrain</div>
        <select onchange="state.terrain=this.value; save(); render();">
          <option ${state.terrain==='Forest'?'selected':''}>Forest</option>
          <option ${state.terrain==='Swamp'?'selected':''}>Swamp</option>
          <option ${state.terrain==='Desert'?'selected':''}>Desert</option>
          <option ${state.terrain==='Mountain'?'selected':''}>Mountain</option>
          <option ${state.terrain==='Urban'?'selected':''}>Urban</option>
          <option ${state.terrain==='Dungeon'?'selected':''}>Dungeon</option>
          <option ${state.terrain==='Arctic'?'selected':''}>Arctic</option>
          <option ${state.terrain==='Coastal'?'selected':''}>Coastal</option>
        </select>
        <div style="margin-top:6px;font-size:12px">Environment effects update here</div>
        <div style="margin-top:8px">
          ${terrainChips().map(c=>`<span class="chip" style="background:${c.color}33;color:${c.color}">${c.label}</span>`).join('')}
        </div>
      </div>
      <div class="section">
        <div class="small">Party</div>
        ${state.party.map(p=>`
          <div class="item" style="margin-bottom:6px">
            <div style="display:flex;align-items:center;gap:8px">
              <div class="token"><img src="assets/class_icons/${p.class}.svg" width="24"></div>
              <div><div style="font-weight:600">${p.name}</div><div class="small">${p.class} L${p.level}</div></div>
            </div>
            <button onclick="state.selectedToken={id:'${p.id}',kind:'pc'}; save(); render();">Select</button>
          </div>`).join('')}
      </div>
      <div class="section">
        <div class="small">Enemies</div>
        ${state.enemies.map(e=>`
          <div class="item" style="margin-bottom:6px">
            <div style="display:flex;align-items:center;gap:8px">
              <div class="token"><img src="assets/class_icons/${e.class}.svg" width="24"></div>
              <div><div style="font-weight:600">${e.name}</div><div class="small">AC ${e.ac} • HP ${e.hp}</div></div>
            </div>
            <button onclick="state.selectedToken={id:'${e.id}',kind:'enemy'}; save(); render();">Select</button>
          </div>`).join('')}
      </div>
    </div>
  `;
}

window.onload = render;
