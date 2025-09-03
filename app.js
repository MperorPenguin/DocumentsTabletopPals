/* DM Toolkit — App Core
   P0/P1 updates:
   - Encounter link path -> ./encounters/
   - World: explicit Fit/Actual button
   - Focus-visible handled in CSS
   - Arvo preconnect in index.html
   P2:
   - Export / Import / Reset for tp_state_v26 + tp_cc_characters
   Extras:
   - Burger menu, unified tiles, delegated nav
*/

const STATE_KEY = "tp_state_v26";
const CC_KEY = "tp_cc_characters";

const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

const state = loadState();

/* ---------- Bootstrap ---------- */
window.addEventListener("DOMContentLoaded", () => {
  wireBurger();
  wireGlobalNav();
  initTabsFromHash();

  initHomeTiles();
  initWorld();
  initDice();
  initNotes();
  initDM();
  initFrames();

  // Keep hash in sync when navigating:
  window.addEventListener("hashchange", () => {
    const tab = location.hash.replace("#", "") || "home";
    nav(tab);
  });
});

/* ---------- Storage ---------- */
function loadState() {
  try {
    return JSON.parse(localStorage.getItem(STATE_KEY)) || {
      activeTab: "home",
      notes: "",
      dice: [],   // e.g. [4, 6, 20]
      world: { list: [], current: null, scale: "fit" }
    };
  } catch {
    return { activeTab: "home", notes: "", dice: [], world: { list: [], current: null, scale: "fit" } };
  }
}
function saveState() {
  localStorage.setItem(STATE_KEY, JSON.stringify(state));
}

/* ---------- Nav ---------- */
function wireGlobalNav() {
  // Delegated click for anything with data-nav
  document.addEventListener("click", (e) => {
    const target = e.target.closest("[data-nav]");
    if (!target) return;

    const tab = target.getAttribute("data-nav");
    e.preventDefault();
    nav(tab);
  });

  // Set initial
  nav(state.activeTab || "home");
}
function initTabsFromHash() {
  const fromHash = location.hash.replace("#", "");
  if (fromHash) state.activeTab = fromHash;
}
function nav(tab) {
  // Hide all, show one
  $$(".tabpanel").forEach(sec => sec.hidden = true);
  const sec = $(`#section-${tab}`) || $("#section-home");
  sec.hidden = false;

  // Mark active in topnav
  $$(".navbtn").forEach(b => b.removeAttribute("aria-current"));
  const activeBtn = $(`.navbtn[data-nav="${tab}"]`);
  if (activeBtn) activeBtn.setAttribute("aria-current", "page");

  // Close burger menu on selection
  $("#topnav")?.classList.remove("open");
  const burger = $("#burger");
  if (burger) burger.setAttribute("aria-expanded", "false");

  state.activeTab = tab;
  saveState();

  // Keep hash up to date
  if (location.hash !== `#${tab}`) {
    history.replaceState(null, "", `#${tab}`);
  }
}

/* ---------- Burger ---------- */
function wireBurger() {
  const burger = $("#burger");
  const topnav = $("#topnav");
  if (!burger || !topnav) return;

  burger.addEventListener("click", () => {
    const open = topnav.classList.toggle("open");
    burger.setAttribute("aria-expanded", String(open));
  });
  document.addEventListener("click", (e) => {
    if (!topnav.classList.contains("open")) return;
    const within = e.target.closest("#topnav, #burger");
    if (!within) {
      topnav.classList.remove("open");
      burger.setAttribute("aria-expanded", "false");
    }
  });
}

/* ---------- Home tiles ---------- */
function initHomeTiles() {
  // Already handled via [data-nav]; nothing else needed here.
}

/* ---------- World Viewer ---------- */
async function initWorld() {
  const listEl = $("#map-list");
  const imgEl = $("#world-img");
  const caption = $("#world-caption");
  const btnFit = $("#btn-world-fit");
  const btnFull = $("#btn-world-full");
  const btnPop = $("#btn-world-pop");

  if (!listEl || !imgEl) return;

  // Load list (index.json preferred, fallback to index.js that sets window.MAPS)
  let maps = [];
  try {
    const res = await fetch("./MapsKit/assets/maps/index.json", { cache: "no-store" });
    if (res.ok) {
      maps = await res.json();
    } else {
      // fallback to index.js
      await loadScript("./MapsKit/assets/maps/index.js");
      maps = Array.isArray(window.MAPS) ? window.MAPS : [];
    }
  } catch {
    // final fallback
    maps = [];
  }

  state.world.list = maps;
  renderMapList(maps);

  // Restore selection
  if (state.world.current) {
    setMap(state.world.current);
  } else if (maps[0]) {
    setMap(maps[0]);
  }

  // Fit/Actual explicit toggle
  btnFit?.addEventListener("click", () => {
    state.world.scale = state.world.scale === "fit" ? "actual" : "fit";
    applyWorldScale(imgEl);
    saveState();
  });

  // Double-click image toggles too
  imgEl.addEventListener("dblclick", () => {
    state.world.scale = state.world.scale === "fit" ? "actual" : "fit";
    applyWorldScale(imgEl);
    saveState();
  });

  // Fullscreen
  btnFull?.addEventListener("click", () => {
    if (imgEl.requestFullscreen) imgEl.requestFullscreen().catch(() => {});
  });

  // Pop-out
  btnPop?.addEventListener("click", () => {
    popoutMap();
  });

  function renderMapList(items) {
    listEl.innerHTML = "";
    if (!items.length) {
      listEl.innerHTML = `<li class="tiny muted">No maps found in <code>MapsKit/assets/maps/</code>.</li>`;
      return;
    }
    items.forEach(map => {
      const btn = document.createElement("button");
      btn.className = "btn ghost";
      btn.type = "button";
      btn.textContent = map.name || map.title || map.file || "Map";
      btn.addEventListener("click", () => setMap(map));
      const li = document.createElement("li");
      li.appendChild(btn);
      listEl.appendChild(li);
    });
  }

  function setMap(map) {
    state.world.current = map;
    imgEl.src = map.url || `./MapsKit/assets/maps/${map.file || ""}`;
    caption.textContent = map.name || map.title || "";
    applyWorldScale(imgEl);
    saveState();
  }

  function applyWorldScale(img) {
    if (state.world.scale === "actual") {
      img.style.maxWidth = "none";
      img.style.maxHeight = "none";
      img.style.width = "auto";
      img.style.height = "auto";
    } else {
      img.style.maxWidth = "";
      img.style.maxHeight = "";
      img.style.width = "";
      img.style.height = "";
    }
  }

  function popoutMap() {
    const w = window.open("", "mapcast", "width=1200,height=800,noopener,noreferrer");
    if (!w) return;
    const map = state.world.current;
    const src = map ? (map.url || `./MapsKit/assets/maps/${map.file || ""}`) : "";
    w.document.write(`
      <!doctype html>
      <html><head><meta charset="utf-8">
        <title>Map — Cast</title>
        <style>
          html,body{margin:0;height:100%;background:#000e1b}
          img{display:block;margin:auto;max-width:100%;max-height:100vh}
        </style>
      </head>
      <body><img src="${src}" alt="Map"></body>
      </html>
    `);
    w.document.close();
  }
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

/* ---------- Dice ---------- */
function initDice() {
  const pool = $("#dicepool");
  const out = $("#dice-result");
  const btnRoll = $("#btn-roll");
  const btnClear = $("#btn-clear");

  if (!pool || !btnRoll || !btnClear) return;

  // Render initial
  renderPool();

  $$(".die").forEach(btn => {
    btn.addEventListener("click", () => {
      const d = parseInt(btn.dataset.d, 10);
      state.dice.push(d);
      saveState();
      renderPool();
    });
  });

  btnClear.addEventListener("click", () => {
    state.dice = [];
    saveState();
    renderPool();
    out.textContent = "";
  });

  btnRoll.addEventListener("click", async () => {
    if (!state.dice.length) return;
    out.textContent = "Rolling…";
    // Tiny animation: jitter numbers
    const animMs = 700;
    const start = performance.now();
    let raf;
    const animate = (t) => {
      const rolls = state.dice.map(d => 1 + Math.floor(Math.random() * d));
      out.textContent = `🎲 ${rolls.join(" + ")}`;
      if (t - start < animMs) {
        raf = requestAnimationFrame(animate);
      } else {
        cancelAnimationFrame(raf);
        const final = state.dice.map(d => 1 + Math.floor(Math.random() * d));
        const total = final.reduce((a,b)=>a+b,0);
        out.textContent = `Result: ${final.join(" + ")} = ${total}`;
      }
    };
    raf = requestAnimationFrame(animate);
  });

  function renderPool() {
    pool.innerHTML = state.dice.length ? "" : "Add dice to roll…";
    state.dice.forEach((d, i) => {
      const chip = document.createElement("span");
      chip.className = "diechip";
      chip.textContent = `d${d}`;
      chip.title = "Click to remove die";
      chip.tabIndex = 0;
      chip.addEventListener("click", () => {
        state.dice.splice(i, 1);
        saveState();
        renderPool();
      });
      pool.appendChild(chip);
    });
  }
}

/* ---------- Notes ---------- */
function initNotes() {
  const notes = $("#notes");
  if (!notes) return;
  notes.value = state.notes || "";
  notes.addEventListener("input", () => {
    state.notes = notes.value;
    saveState();
  });
}

/* ---------- DM (Party + Backup) ---------- */
function initDM() {
  const partyEl = $("#party");
  renderParty(partyEl);

  window.addEventListener("storage", (e) => {
    if (e.key === CC_KEY) renderParty(partyEl);
  });

  const btnExport = $("#btn-export");
  const fileImport = $("#file-import");
  const btnReset = $("#btn-reset");

  btnExport?.addEventListener("click", doExport);
  fileImport?.addEventListener("change", doImport);
  btnReset?.addEventListener("click", doReset);
}

function renderParty(el) {
  if (!el) return;
  let party = [];
  try {
    const data = JSON.parse(localStorage.getItem(CC_KEY) || "[]");
    party = Array.isArray(data) ? data.filter(p => p && p.inParty) : [];
  } catch { party = []; }

  if (!party.length) {
    el.textContent = "No party members yet.";
    return;
  }

  el.innerHTML = "";
  party.forEach(p => {
    const row = document.createElement("div");
    row.className = "card";
    row.innerHTML = `
      <strong>${escapeHTML(p.name || "Unnamed")}</strong>
      <div class="tiny muted">${escapeHTML(p.class || p.cls || "")} ${escapeHTML(p.level ? "Lv. " + p.level : "")}</div>
    `;
    el.appendChild(row);
  });
}

/* ---------- Backup / Restore ---------- */
function doExport() {
  const payload = {
    _meta: { app: "DocumentsTabletopPals", when: new Date().toISOString(), version: "v26" },
    tp_state_v26: null,
    tp_cc_characters: null
  };
  try { payload.tp_state_v26 = JSON.parse(localStorage.getItem(STATE_KEY) || "null"); } catch { payload.tp_state_v26 = null; }
  try { payload.tp_cc_characters = JSON.parse(localStorage.getItem(CC_KEY) || "null"); } catch { payload.tp_cc_characters = null; }

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  const stamp = new Date().toISOString().slice(0,19).replace(/[:T]/g,"-");
  a.href = URL.createObjectURL(blob);
  a.download = `DocumentsTabletopPals-backup-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

function doImport(ev) {
  const file = ev.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(String(reader.result || "{}"));
      if ("tp_state_v26" in data) {
        localStorage.setItem(STATE_KEY, JSON.stringify(data.tp_state_v26));
      }
      if ("tp_cc_characters" in data) {
        localStorage.setItem(CC_KEY, JSON.stringify(data.tp_cc_characters));
      }
      alert("Import complete. The page will reload.");
      location.reload();
    } catch (err) {
      alert("Import failed: invalid file.");
    }
  };
  reader.readAsText(file);
  // Reset input so the same file can be selected again
  ev.target.value = "";
}

function doReset() {
  if (!confirm("This will clear all toolkit data on this device.\n\nContinue?")) return;
  localStorage.removeItem(STATE_KEY);
  localStorage.removeItem(CC_KEY);
  location.reload();
}

/* ---------- Frames (Logbook/Characters) ---------- */
function initFrames() {
  const charFrame = $("#characters-frame");
  const logFrame = $("#logbook-frame");

  // If paths differ in your repo, adjust these src values in index.html.
  charFrame?.addEventListener("error", () => {
    console.warn("Characters frame failed to load.");
  });
  logFrame?.addEventListener("error", () => {
    console.warn("Logbook frame failed to load.");
  });
}

/* ---------- Utils ---------- */
function escapeHTML(str) {
  return String(str || "").replace(/[&<>"']/g, s => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[s]));
}
