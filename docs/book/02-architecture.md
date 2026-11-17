# 02 — Architecture of `index.html` and `src/`

One HTML file (markup + import map), eight stylesheets in `css/` (see "Stylesheets" below) and ES modules in `src/` (see "Source layout" below; the entry is `<script type="module" src="./src/main.js">`). three.js r160 via an import map (jsDelivr). Addons used:
`BufferGeometryUtils.mergeGeometries`, `objects/Sky.js`. OrbitControls is NOT used any more (camera is a fixed rig).

## Section order in the script (search for the `/* ---- ... */` markers)
Since history entry 29 this order is the BUILD ORDER of `src/main.js`; sections 1-10 and the sky / lights now live in `src/` modules (map below), sections 11-17 moved out in step 3b (history entry 30; map in "Source layout" below: camera rig -> interaction/camera-rig.js, prices -> data/display-prices.js, markers -> world/markers.js, selection + painting -> interaction/, UI -> ui/, picking -> interaction/picking.js + hover.js + input.js, loop -> core/loop.js, window.__stadium -> debug/expose.js).
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
- `paintGeo()` lives in `src/core/geometry.js` (imported by the pitch, trees and parking modules).
- Do not put `//` comments in the middle of a line that has code after it.

## Added sections (history entries 13-15)
- **sky** (in renderer / scene): `skyGroup` = gradient dome with sun, cloud dome (shader), sun-glow sprite; `updateSky()` re-centres it on the camera every frame. `applySky` + baked `envTex` are for reflections only.
- **gates** (after the facade): `ACCESS_ANGLES`, `gate()` builds a porch, a dark opening and a sign (canvas texture) per entrance / exit. The red / green approach lanes were removed (entry 23 era request).
- **trees + forest**: `FOREST` block inside the tree section; roads end in caps (park section).
- **11 v 11 match**: `match` (instanced bodies / heads / legs / blob shadows + ball, simple rules). **selection state**: `dimOthers`, `baseCol`, `repaintAll`, `inSectionView`.
- **UI**: HUD tabs, price panel (`.opt` = hidden on phones), `#scorecard` (`updateScore`), checkout `#modal` (`buyItem`, `renderModal`, `confirmPay`, `barcodeSVG`, `gateFor`), `setRoofFade`, head turn (`look`, `updateLook`, `turnHead`), `fitFov`.

## UI layer (brand)
HTML at the top of `index.html` and the CSS in `css/` follow the Forge Forward brand guide: `--ff-*` tokens in `:root`, Plus Jakarta Sans (Google Fonts link, system-ui fallback),
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

## Stylesheets (history entry 28)
No inline `<style>` any more. `index.html` links `css/*.css` in this exact order (plain `<link>` tags, no `@import`). The files are the original single stylesheet cut into contiguous chunks, so the cascade and specificity are unchanged. Do not reorder them.
| Order | File | Holds |
|---|---|---|
| 1 | `tokens.css` | `--ff-*` custom properties in `:root` |
| 2 | `base.css` | resets, html/body, canvas, button font, focus ring |
| 3 | `hud.css` | `#hud`, `#views`, tabs, shared `.btn`, hidden title / hint rules |
| 4 | `panel.css` | `#panel`, `#selection`, ticket cards (`#tip`, seat, VIP), `.badge` |
| 5 | `scoreboard.css` | `#scorecard`, `.sc-*`, `.disc` and their media queries |
| 6 | `checkout.css` | `#modal`, `.sheet`, payment, ticket details |
| 7 | `overlays.css` | `#vignette`, `#help`, `#loading`, `.sr-only`, fold buttons |
| 8 | `responsive.css` | phone layout (max 760 px), touch, short landscape; LAST on purpose |
The hover card (`#tip`) lives in `panel.css`, not `hud.css`, and the scoreboard has its own file, because a split by purpose that also keeps the original rule order needs contiguous chunks. The Google Fonts link is unchanged (still in `index.html`).

## Source layout (history entries 29 and 30, refactor steps 3a and 3b)
`src/main.js` is now a thin boot file (about 150 lines): the boot block (`window.__boot`, `mark()`, `yieldToPaint()`), the builders in EXACTLY the original order (the shared seeded generator depends on it), then it creates and wires the step 3b modules in dependency order, calls `prepareStaticScene`, `startLoop`, removes the loading screen and calls `exposeDebug`. The 13 `mark()` names and `yieldToPaint()` calls are unchanged.
Dependency direction: `config` -> `data` -> `core` -> `world` -> `sim` -> `interaction` -> `ui` -> `debug` -> `main`; `ui` does not import `interaction` (main injects the few functions needed, e.g. `setView`, `closeBuy`, `onDone`). Checked for cycles with a script over all 50 modules: none. No cycles, named exports only, no new globals. Every module starts with an `@fileoverview` header (what / why / builds / depends / used by / lifecycle / units / not here).
| Folder | File | Holds |
|---|---|---|
| `config` | `constants.js` | bowl numbers, stand layout (`tiers[].d0/y0`, `FACADE_D`, `ROOF_*`), `ACCESS_ANGLES`, seat spacing, park heights and ring (`Y_*`, `PARK_IN/OUT`) |
| `data` | `bowl-math.js` | `shapePoint`, `arcTable/arcAt`, `sAtTheta/thetaAtS`, `sgnPow` (pure maths) |
| `data` | `seat-layout.js` | `forEachSeat`, picking grid `CELL` / `gkey` |
| `data` | `pricing.js` | `CUR`, `DEMAND`, `TIER_BASE`, `SUITE_*`, `zoneFactors`, `seatPriceParts`, `seatPriceOf` |
| `core` | `rng.js` | the ONE shared `rand` (seed 20260), `rng(seed)` for the own-seed generators, `hash` |
| `core` | `materials.js`, `textures.js`, `geometry.js` | `std` / `dbl`; `makeCanvasTex`; `ringStrip`, `paintGeo` |
| `core` | `renderer.js`, `scene.js`, `lighting.js`, `ctx.js` | renderer; scene + baked `envTex` + camera + rig; `SUN_POS` + lights; `createCtx()` (the shared ctx: renderer, scene, camera, controls, fitFov, envTex, MAX_ANISO, rand, canvasTex) |
| `world` | `sky`, `ground`, `pitch`, `terraces`, `facade`, `gates`, `seats`, `skyboxes`, `roof`, `roads`, `parking`, `shops`, `matchday`, `trees` | `buildX(ctx, deps)` factories; the return values main needs (`terraces`, `white`, seat tables, `glassMesh`, `suites`, `SUITE_W`, `roof`, `curves`, `roadSamples`, `spurSamples`, `roadDist`, `outsideStadium`, `parkingMesh`, `fansUpdate`, `updateSky`, `sun`) |
| `data` | `display-prices.js` | `createDisplayPrices(tables)`: `fmtRange`, `rangeOf`, availability rule `isAvail` / `availIn` (only colour code 0), `tierRange`, `sectionRange` (cached), suite and parking prices, `LOT_NAME` |
| `core` | `listeners.js` | `createListenerGroup()`: ONE AbortController; every window / canvas / panel `addEventListener` goes through `on(...)` (button `onclick` properties stay as they were) |
| `core` | `loop.js` | `prepareStaticScene` (resize listener, first frame, shadow bake, env intensity, matrix freeze) and `startLoop` (tween -> controls -> fans -> match -> sky -> head turn -> scoreboard -> render -> cart picture), original order |
| `world` | `markers.js` | `buildMarkers`: hover and selected skybox boxes, 4 lot strips, `LOT_ARC`, `placeMarker`, `updateLots` |
| `sim` | `match.js`, `scoreboard-model.js` | `createMatch(ctx)` (22 figures + ball, `Math.random` kept on purpose); pure score / clock text formats |
| `interaction` | `camera-rig.js` | `OVERVIEW`, `AERIAL`, `LONG_STAND`, eases, `createCameraRig` -> `flyTo`, `updateLook`, `turnHead` (locked camera) |
| `interaction` | `seat-paint.js`, `roof-control.js` | seat colouring (`paint`, `baseCol`, `repaintAll`, `repaintKey`, `refresh`; extends `COL`); roof fade at section level and the roof toggle |
| `interaction` | `selection.js` | `createSelection`: `goOverview`, `goAerial`, `descent`, `selectSection/Seat/Suite/Lot`, `viewFromSuite`, `back`, `clearSel`, `inSectionView`, `keyOf` (section-first rule) |
| `interaction` | `picking.js`, `hover.js`, `input.js` | ray -> seat / suite / lot (`dOf`, `lotOf`, `rowOfD` live here); `setHover`; all keyboard / pointer handlers |
| `ui` | `view-buttons.js`, `price-panel.js`, `hover-card.js`, `ticket-card.js` | tabs + Roof button (actions bound by main); `renderSelection` (also roof fade + match switch); `#tip` card; shared card markup |
| `ui` | `checkout.js`, `scoreboard-view.js`, `fold-buttons.js` | demo pop-up (`startBuy`, `closeBuy`, `onModalClick(e, onDone)`, `captureThumb`); `updateScore`; fold buttons + H key |
| `debug` | `expose.js` | `exposeDebug`: `window.__stadium` with the same 19 keys as before |
| `state` | `state.js` | the shared mutable state object (nav, selection, hover, buy, tween, look, thumbWanted, roofFaded). `nav` and `look` are objects mutated in place (main.js aliases them); the rest is read / written as `state.<name>` |
Build order and RNG: `buildGround` (rand: meadow, paving), `buildPitch` (rand), `buildTerraces` (rand), `buildFacade` (rand), `buildGates`, `buildSeats`, `buildSkyboxes`, `buildRoof`, `buildRoads`, `buildParking` (rng 777, rng 4242), `buildShops` (rand; appends to `roadSamples`), `buildMatchday` (rng 7777), `buildTrees` (rand, reads `roadSamples`). Moving any of these changes the scene.
Import map stays in `index.html` (modules import the bare `three` and `three/addons/...`); own imports are relative with the `.js` extension, so the page works from a sub-path.
