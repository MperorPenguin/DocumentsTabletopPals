# Encounter Builder — Calculator (DocumentsTabletopPals)

Calculator-first encounter tool for DMs. No battlemap. Reads Party from the Character Creator via `localStorage['tp_cc_characters']`. Themed with Lime Green (primary buttons) and Midnight Blue (surfaces), font “Arvo”.

## Install
1) Copy the entire `/encounters/` folder into your project root beside your `index.html`.

2) Add a tile/button on your landing page that links to `/encounters/` (see `/root-integrations/patch-index.html-snippet.txt`).

3) Ensure your Character Creator stores characters like `{ id, name, level, ac, hp, hpMax }` in `localStorage['tp_cc_characters']`.


## LocalStorage Keys
- `tp_cc_characters` — Party (source of truth shared with DM Party tab)

- `tp_dm_encounters` — Saved encounter blueprints

- `tp_dm_enc_builder` — Builder cache (current UI state)


## Tabs
- **Setup:** select party subset; add enemy/NPC groups (Name, CR, XP, AC, HP, optional attack profile, Count)

- **Difficulty:** 2014-style thresholds (placeholder for 2024 toggle)

- **Calculators:** Attack vs AC, Save vs DC, Concentration

- **Results:** Manual HP adjustments → optional write-back to `tp_cc_characters`

- **Library:** Save/Load encounter blueprints


## Legal
- Uses SRD-safe data & concepts. See `LEGAL.md` and `LICENSE.md` included.
