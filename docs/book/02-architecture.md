# 02 — Architecture of `index.html`

One file: HTML + CSS + `<script type="module">`. three.js r160 via an import map (jsDelivr). Addons used:
`BufferGeometryUtils.mergeGeometries`, `objects/Sky.js`. OrbitControls is NOT used any more (camera is a fixed rig).

## Section order in the script (search for the `/* ---- ... */` markers)
1. **geometry of the bowl** — `EXP=2.4, A0=72, B0=52` (superellipse inner-edge half extents, metres), pitch 105×68.
   `shapePoint(theta, d)` = plan point on the bowl offset outwards by `d`. `arcTable/arcAt` = arc-length tables for even spacing.
   `ringStrip(profile, material, opts)` extrudes a (d, y) profile round the bowl; makes UVs (u round the ring; v per segment, or cumulative with `cumV`);
   `t0/t1` limit the arc.
2. **stand layout** — tiers (rows 24 / 20 / 26, rise .42 / .5 / .62, run .85 m, 28 sections each), walkways, skybox band
   (`GLASS_D`, `BACK_D`, `BOX_H=3.4`), `FACADE_D`, `ROOF_OUT/ROOF_IN`, `FACADE_TOP`.
3. **renderer / scene** — renderer, ACES tone mapping (0.9), Sky->PMREM `envTex`, FogExp2, fixed camera rig (`controls` is a tiny object
   with `target` and `update()` = `lookAt`), hemisphere light (0.45), sun (`SUN_POS`), shadow settings.
4. **helpers** — seeded `rand`, `hash`, `std`/`dbl` material makers.
5. **ground, plaza, pitch** — `canvasTex` helper, dry earth texture, terracotta paving (`pavingTex`), pitch (stripes, lines, 1 m corner arcs, bump), goals + nets, then the **PITCH SURROUND** block (static, not pickable): LED ad strip `boards` + dark `boardsBack`, corner flags, 2 dugouts + technical-area lines, fourth official desk + electronic board, 2 assistant referees, 34 stewards (instanced), 12 photographers (instanced), 4 TV tripods (one merged geometry, instanced), spare balls. Local helpers there: `mk`, `person`.
6. **terraces** — concrete step texture (`concreteTex`), three terrace meshes (`terraces[0..2]`, also the pick targets), charcoal fascia rails,
   skybox floor/ceiling/back wall. **Calabash facade** (mosaic texture, bulge `FACADE_BULGE=11`), teal glazed band, blue-grey perimeter wall
   (4 arcs between the access-road angles `[0.35,1.9,3.45,5.0]`), planters.
7. **SEATS** — `seatGeometry()` (5 boxes, vertex colours), `forEachSeat` (positions, numbering; section edges are fixed plan angles via `sAtTheta` / `thetaAtS`, so aisles are straight), pricing model, ONE `InstancedMesh`,
   typed tables `seatTier/seatRow/seatNumber/seatSection/seatCode/seatPrice/seatPos`, `sectionIds` map, spatial `grid`.
8. **skyboxes** — glass ring (`glassMesh`), frame rails, 56 dividers, chairs, `suites[]` (centre + inward normal).
9. **roof (ETFE foil)** — diamond-lattice foil texture (`foil`, MeshPhysicalMaterial, transparent, `cast:false`), 104 radial steel ribs (one InstancedMesh, the only roof shadow), grey inner rim, dark soffit lip, outer lip. `roof` group (toggle with R; 40% fade only at section level).
10. **park** — roads (loop + 4 spurs, `curves`), dashed markings, parking ring (`parkingMesh`, bay lines), **PARKING MARKINGS + FENCE** block (yellow bay head lines, hatch strips, NO PARKING signs, chain-link fence, gate portals) and **PARKING LOTS** block (4 tinted lot strips, kerb islands + bushes, lot signposts, 50 cars = `carBody` / `carCab` / `carWheel` InstancedMeshes; own `lotAt` because `lotOf` is defined later), `paintGeo`, shops, **MATCHDAY LIFE** block (16 stalls, 8 flagpoles, bus stops, ~180 fans, `fansUpdate`), sparse oak/pine trees + forest.
11. **camera rig** — `OVERVIEW`, `LONG_STAND`, `flyTo`, `descent`.
12. **prices (display)** — `isAvail` / `availIn` (availability rule), ranges (available seats only), suite and lot prices, `dOf/lotOf/rowOfD`, `nearestSuite`.
13. **markers** — suite hover/selected boxes, parking-lot overlays.
14. **selection state** — `nav.level` (overview | section | seat | suite | lot), colour repainting, `selectSection/Seat/Suite/Lot`, `back()`.
15. **UI** — view buttons (`#views`: Overview, Aerial, Descent, Roof; the `#hud` title text is hidden), price panel (`#panel` shown only with a selection; `#legend` is hidden), hover card, matchday extras (`EXTRAS`), checkout, key handlers (D, R, Esc).
16. **picking** — raycast `terraces + glassMesh + parkingMesh` -> seat / suite / lot; hover tooltip; click handler.
17. **loop** — bake: shadow map frozen, matrices frozen (objects with `userData.dynamic` are skipped), `scene.environment`; render loop; `window.__stadium` debug handle.

## Data flow (seats)
`forEachSeat` -> arrays by instance id -> `InstancedMesh` matrices/colours. Picking: ray hits a terrace -> nearest seat via `grid` -> instance id ->
tables -> tier/section/row/number/price. Section highlight repaints the instance colours of that section (`sectionIds`).

## Conventions
- Metres, y up. Superellipse parameter `theta` is NOT the polar angle; fraction-of-perimeter and theta differ.
- Materials with DoubleSide are used for the ring strips (winding is not guaranteed); shadow acne is handled with `normalBias`.
- `paintGeo()` is a hoisted function declaration (used by seats before its position in the file).
- Do not put `//` comments in the middle of a line that has code after it.

## Added sections (history entries 13-15)
- **sky** (in renderer / scene): `skyGroup` = gradient dome with sun, cloud dome (shader), sun-glow sprite; `updateSky()` re-centres it on the camera every frame. `applySky` + baked `envTex` are for reflections only.
- **gates** (after the facade): `ACCESS_ANGLES`, `gate()` builds a porch, a dark opening and a sign (canvas texture) per entrance / exit. The red / green approach lanes were removed (entry 23 era request).
- **trees + forest**: `FOREST` block inside the tree section; roads end in caps (park section).
- **11 v 11 match**: `match` (instanced bodies / heads / legs / blob shadows + ball, simple rules). **selection state**: `dimOthers`, `baseCol`, `repaintAll`, `inSectionView`.
- **UI**: HUD tabs, price panel (`.opt` = hidden on phones), `#scorecard` (`updateScore`), checkout `#modal` (`buyItem`, `renderModal`, `confirmPay`, `barcodeSVG`, `gateFor`), `setRoofFade`, head turn (`look`, `updateLook`, `turnHead`), `fitFov`.

## UI layer (brand)
HTML/CSS at the top of `index.html` follows the Forge Forward brand guide: `--ff-*` tokens in `:root`, Plus Jakarta Sans (Google Fonts link, system-ui fallback),
view buttons (`setView`), price panel, ticket cards (`ticketCard`), VIP ticket, `.btn` buttons, scoreboard card, checkout pop-up. Removed on request: the red promise bar (entry 14), the title card + seat count, the bottom-left hint (`#help`), the always-on price list, the photo feature (entry 20). `#vignette` is a CSS overlay.
No CSS transitions or animations in the UI chrome.

## Other things in the folder
- `proxy/` — `server.mjs` (Node, no dependencies; serves `index.html` plus a fal render API), `.env` (git-ignored, holds a key), `cache/`, `spend.json`. The page no longer calls the API (entry 20). Kept so the feature can be wired in again; delete the folder if it is not wanted.
- `docs/book/` — this book. `CLAUDE.md` — project rules.
- `window.__stadium` (debug handle) exposes `scene`, `sun`, `renderer`, `camera`, `selectSection/Seat/Suite/Lot`, `go()`; `window.__parkedCars` = 50.

## Added in batch 25 (history entry 25)
- **Boot** (top of the script): `boot` / `mark()` / `yieldToPaint()`. The script awaits `yieldToPaint()` at the start and before each big section (ground, terraces, seats, skyboxes, park, shops, trees, camera rig) so the loading screen can draw; `window.__boot` holds `[name, ms since navigation]` pairs. The loading screen is `#loading` (an iframe of `assets/loader.html`), removed after two rAFs following the first render call.
- **Heights** in the park section: `Y_LOT 0.38`, `Y_MARK 0.41`, `Y_PATH 0.46`, `Y_ROAD 0.56`, `Y_DASH 0.58` (meadow 0, plaza 0.15). Cars, fence, signs and fans use them (fan paths carry a 5th value = ground height).
- **Access roads**: `radialPoint(a, d)`; each spur bends off the loop, then runs on the straight radial line of its gate angle and ends at `PARK_IN + 0.5`.
- **Fold buttons**: `.fold` buttons in `#hud`, `#panel`, `#scorecard`; JS block before the picking section toggles `is-folded` and `aria-expanded`; folded cards are fully hidden (28 px "+" dot), `H` toggles all.
- **Bay grid** (before the bay lines): `BAY_ROWS`, `BAY_EDGES` (theta, even arc spacing on the lot middle), `radialYaw`; painted lines and parked cars both read it.
