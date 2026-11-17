# 01 — History

Newest entries go at the bottom. Format: what changed / why / verified / NOT verified.
Dates are 2026-11-16 (single working session) unless noted.

## 1. First build — three.js stadium
- **What:** single-file `index.html`; oval bowl, three tiers of red seats with scattered blue, aisles, glass skyboxes, white membrane
  roof, green park. All seats as one `InstancedMesh` (tier / row / number / section tables indexed by instance id).
- **Why:** original brief, plus reference images (top-down "3D from above", "the long stand") and an Instagram reel
  (ticketing-site demo: orange block highlight on hover, click a seat for its view, skyboxes).
- **Verified:** loads, hover tooltip, section highlight, camera presets by screenshot. **Not verified:** touch input, phones.

## 2. Photographic pass (materials + light only)
- **What:** warm late-afternoon sun, sky gradient, deep red glossy seats (clearcoat), weathered concrete, natural grass.
- **Why:** "ultra-photorealistic drone photo, change only materials and light". An image-to-image model was not available, so the brief
  was applied inside the scene.
- **Learned:** a scene-wide environment map washes everything out in r160 (no `scene.environmentIntensity`). Reflections were
  restricted to seats / glass.

## 3. Roads, flying cars, shops, descent
- **What:** dashed road markings, 92 cars hovering above the roads, 65 small shops, a "Descent" shot (straight line from top-down to the
  long stand, no yaw), page starts top-down.
- **Verified:** top-down start frame, descent start / mid / end frames by screenshot (the 10 s playback itself was not watched live).

## 4. Research with three agents, then optimisation / lighting / shadow changes
- **What:** three research agents (lighting, shadows, render optimisation). Adopted: procedural Sky baked to a PMREM for reflections,
  exponential fog, `PCFSoftShadowMap` (removed the dead `shadow.radius`), tighter shadow depth range and smaller biases, frozen shadow map,
  anisotropy cap, `powerPreference: high-performance`, frozen static matrices, cheaper glass / car materials.
- **Rejected on purpose:** splitting seats into chunk meshes (breaks the "one InstancedMesh" requirement); render-on-demand (cars animated
  every frame at the time); AgX tone mapping (tested: desaturated seats and grass); bloom and screen-space AO (cost, wash-out).
- **Bug found:** a `//` comment inserted mid-line swallowed the rest of a loop body and killed the whole module (syntax error). Fix: put
  comments on their own line. Check with `node --check` after edits.

## 5. Parking, forest, houses, price panel, locked camera, 6 road cars
- **What:** parking ring (4 rows of bays, parked cars), dense oak + pine forest, house clusters, 6 road-bound cars with no shadows,
  camera locked (click-only), ticket price model and panel (see 03-pricing.md), skybox and parking picking.
- **Verified:** screenshot of top-down view; hover tooltip, click block -> section view, price panel text.

## 6. Soccer City redesign (current)
- **What:** user sent a photo of Soccer City and asked for the stadium and its surroundings to match, houses and cars removed, plus better
  render quality for pitch, glass, seats, stairs. Done: rounder calabash bowl (superellipse exponent 2.4), orange seats, bulging
  mosaic facade, ribbed cream-gold roof, teal glazed band, paved plaza, blue-grey perimeter wall (4 arcs), planters, dry earth, sparse
  trees, empty paved parking ring; 5-box seats with baked shading, stair texture (lit nosing / dark inner corner), pitch stripes + bump,
  goal nets, framed dark glass. Added an "Aerial" button (oblique angle like the photo).
- **Not done / not possible:** the pasted prompt targets an image-to-image model, which was not run. True screen-space AO / global
  illumination was not added.
- **Verified:** loads with empty console; top-down and aerial screenshots; scripted hover -> click block -> click seat -> Esc flow.
- **Not verified:** the 10 s descent on the new bowl, close-up seat / stair quality, phone layout.

## 7. Documentation system added
- **What:** `CLAUDE.md` (project rules + "read these first after a context clear"), this book (`docs/book/`), and a detailed header comment at the top of `index.html`
  (plus fixing two stale comments that still mentioned houses / traffic).
- **Why:** the user asked that both the in-HTML comments and a markdown book always describe what has been built, be updated together on every change, and be
  consulted after any context clear.
- **Verified:** the module script still passes `node --check`. **Not verified:** the page was not reloaded in a browser after this comment-only edit.

## 8. Descent run live and end frame checked (Soccer City bowl)
- **What:** no code change. Started a local server, loaded the page, pressed the descent (`__stadium.go('descent')`) and sampled the camera at t = 0.3, 2.5, 5, 7.5, 9.8, 10.6 s
  (wall-clock), then screenshotted the final frame.
- **Measured camera (position / pitch):** start `[0,432,0.5]` -89.9° ; 2.5 s `[0,409.2,2.2]` -89.1° ; 5 s `[0,248.2,14.2]` -78.5° ;
  7.5 s `[0,84.9,26.3]` -37.9° ; 9.8 s and 10.6 s `[0,62,28]` -26.1° (= `LONG_STAND`, motion finished before 10 s of wall-clock because the first frames
  are the slow part of the cubic ease).
- **Result:** x stayed exactly 0 and the view direction x-component stayed 0 for the whole run, so there is no yaw / orbit, only pitch changes. The console was empty.
  End-frame screenshot: orange lower and middle tier, dark skybox band with dividers and chairs, upper tier, roof ribs at the top edge, pitch and halfway line at
  the bottom, i.e. it matches the "long stand" reference framing. The price panel and HUD stay on screen during the shot (by design).
- **Still NOT verified:** frame rate during the move (not measured), close-up seat / stair quality, phone layout, other browsers.

## 9. Slower, more premium selection flights
- **What:** `flyTo(pos, tgt, ms, easing)` now picks the duration from the distance travelled (`clamp(2600 + 9*dist, 2800, 5200)` ms) when `ms` is omitted, and defaults to a
  quintic in-out ease (`easePremium`). All selection flights (block, seat, suite, lot, view-from-suite, Overview, Aerial) use it; their fixed 1.5-1.8 s values were removed.
  The 10 s descent passes `10000` and the old cubic `ease` explicitly, so it is unchanged. The animation loop uses `tween.ease`.
- **Why:** the user asked for a slower, more premium camera move when a part of the stadium is selected.
- **Verified:** module script passes `node --check`. Live: `selectSection(1,5)` from the overview moved `[0,432,1]` -> `[13,47,32]`, camera barely moved for the first ~1 s,
  was still moving at ~4.3 s and settled by ~4.8-5.3 s (sampled every 250 ms in wall-clock, so approximate); console empty.
- **Not verified:** how it feels on a real machine (duration / ease values are a first proposal, not tuned), frame rate during the move, phones.
- **Also noted:** the pasted video prompt (drone descent start image -> end image) and the "3D mask -> orange post" screenshot target external image/video tools; nothing in
  `index.html` was built for them yet.

## 10. Photoreal render hook on every flight + ticket-card price UI
- **What (hook):** new "photoreal render hook" block next to `flyTo`. When a flight ends and `window.STADIUM_RENDER` is a function, the finished canvas frame (PNG) is passed to
  `STADIUM_RENDER(frameBlob, RENDER_PROMPT, {level, camera, target})`; the returned Blob / image URL fades in over the canvas (`#shot`, same size = same camera and framing).
  Starting any new flight removes the overlay and drops late answers (sequence counter). `RENDER_PROMPT` is the user's pasted prompt. **No provider, endpoint or key is built in**;
  the user chose the "hook for my model" option, and nothing leaves the machine unless that function sends it. HUD and panel got `z-index:2` so they stay above the overlay.
- **What (pricing UI):** the user's screenshot ("Pick your seat, get the ticket") was applied to the existing price model, no new prices: hover tooltip and the panel's seat card are
  white ticket cards (`ticketCard()`), skyboxes get a dark VIP ticket with seats / entry / barcode / per-seat price, `Choose your VIP seat` maps to the existing "View from this suite" button.
  Left out on purpose: photo thumbnails, "level 2", sold-out grey seats, AED (currency stays `CUR = €`).
- **Why:** the user asked that every zoom be a brand-new photorealistic render, and for the ticket-card look with pricing.
- **Verified:** `node --check` passes (one bug caught: a `*/` inside my block comment). Live with a stand-in function (sepia filter, not a real model): called once per flight with the right
  prompt and `level`, the result fades in over the canvas, a new flight hides it, console empty. Screenshots: hover tooltip card, seat card, skybox VIP ticket.
- **Not verified:** any real image model (none was connected; result quality, latency, cost, rate limits are unknown); the frame is the full-resolution canvas (~6 MB PNG in the test), upload size
  limits unchecked; phone layout of the new cards; on the first stand-in call the overlay was not yet visible 2 s after the flight ended (stand-in took longer), later ones were.

## 11. Section first, vivid selected seat, straight aisles
- **What:** (a) hover / click order: in the overview or in another block a seat hover shows the BLOCK card with its price range and highlights the block; the first click selects the block; only inside it can one seat be hovered or picked
  (`inSectionView()`, guard in `selectSeat()`). (b) selected seat colour cyan -> vivid magenta `0xff00c8`. (c) aisles: section edges used to be a fixed fraction of each row's own length, so aisles wandered from row to row;
  they are now fixed plan angles (a constant-theta line is straight because `shapePoint` is linear in `d`), taken from the middle row of each tier. `forEachSeat` now packs each section's seats between those lines.
- **Side effect:** seat count 79,340 -> 78,397 (docs updated). Price ranges per block shifted slightly because blocks hold different seats.
- **Verified:** `node --check`; measured 18 aisle edges (3 tiers x 3 sections x first/last seat per row): max sideways deviation <= 0.01 m over 16-22 m; live: overview hover = block card, `selectSeat` from overview selects the section,
  click order overview -> section -> seat; screenshot of the magenta seat; console empty. **Not verified:** all 28 sections of each tier by eye; phone.

## 12. Forge Forward brand applied to the ticket UI
- **What (the red promise bar described here was REMOVED on request, see entry 14):** read the 11 brand-guide files (`BrandCover/Logo/Color/Type/Layout/Components/Sections/Details/Voice/Apps/Tokens.dc.html`, from the Desktop). Applied: Plus Jakarta Sans everywhere (Google Fonts), `--ff-*` tokens, ivory/white cards with warm 1 px borders and the guide's shadows,
  charcoal primary buttons (never red), tab group with a red active tab, red promise bar with four facts computed from the price model (and the 7 s shine, 4 s on phones, off with reduced motion), red "VIP" badge, charcoal VIP ticket, sand hint box,
  plain voice (short sentences, no em dashes), no transitions or fades (the render overlay no longer fades). Prices are charcoal ExtraBold, not red.
- **Not used on purpose:** logo (no official files supplied, guide forbids retyping it), the guide's sample claims ("$297", "30-day money-back"), tool strip, FAQ, calculator, reviews. The stadium's own 3D colours (orange seats, magenta selected seat) are unchanged.
- **Verified:** `node --check`; loaded page: Plus Jakarta Sans 400/500/600/800 loaded, promise bar, tabs (active tab follows Overview / Aerial / Descent, clears on a selection), panel, hover card, seat card and VIP ticket screenshots, console empty.
- **Not verified:** phone widths, other browsers, keyboard-focus ring by eye, contrast of every pair beyond the guide's own approved pairings.

## 13. Seat painting, sky, meadow + forest, 11 v 11 match (one working session, 2026-11-16)
- **Seat painting:** the cream "selected block" colour washed the chairs out. Now the selected section keeps its natural colours and every OTHER block is darkened (x0.45, `dimOthers`, `repaintAll`);
  a hovered block (overview) is a brighter orange; the seat under the mouse inside the selected section turns vivid magenta; a click does NOT recolour it (colour change on hover only, as asked).
- **Sky:** blue gradient dome with a sun disc + glow, drifting procedural clouds (own shaders), light blue FogExp2 haze, all re-centred on the camera. The stock `Sky` shader was tried first and washed out under ACES,
  so it is now used only for the baked reflection map (original parameters, so the seats look as before). Verified by screenshots at the horizon and looking at the sun.
- **Surroundings:** mottled green meadow texture, roads darker, many more oak/pine trees (860 + 560 lone), plus ONE dense forest (760 trees, mostly pines, radius 110 m, centre `(-215,-120)`) visible in the overview and aerial views.
  The plaza, priced parking ring and shops were kept (parking click-through was a hard requirement; shops need an OK before removal).
- **Match:** while one seat is selected, 22 instanced figures + a ball play 4-4-2 v 4-4-2 (dribble, pass, shoot, restart); Barcelona = garnet shirts / blue shorts (team 0, attacks +x), Dortmund = yellow / black.
  Colours only, no crests. Figures are 1.25x life size. It is a visual simulation, not match data.
- **Verified:** screenshots of meadow, forest, sky, horizon, match; the console was empty. **Not verified:** frame rate with the match running; the match rules were not tuned (score changes were not observed over a long run).

## 14. Gates, roads, parking, head turn, roof fade, hi-res frames, promise bar removed
- **Gates:** 4 entrances (A-D, green sign + porch + green 11 m lane) on the road angles and 4 exits (1-4, red) halfway between them (`ACCESS_ANGLES`, `gate()`); lanes are constant-width strips on the same straight radial lines as the aisles.
- **Roads:** the four spurs used to stop with a square cut at the paving. They now end in rounded asphalt caps inside the parking ring (`FACADE_D + 44`) and the pedestrian lane carries on to the gate.
- **Parking** is no longer selectable (`PICK` excludes `parkingMesh`; `selectLot` is unreachable); the price row in the list stays. Verified: clicking the ring does nothing.
- **Head turn:** at the seat level, drag or arrow keys turn the view (yaw +-112 deg, pitch -34..+23 deg); the camera position does not move. Verified: the view direction changes with the keys.
- **Roof fade:** at section and seat level the roof materials are drawn at 40% opacity (`setRoofFade`), instant switch; verified with a screenshot of the upper tier.
- **Hi-res frames:** the render-hook frame is re-rendered up to 3x pixel ratio so it is >= ~2560 px wide (on the test window it was already 3024 px wide, so no upscale was triggered). No real image model was connected.
- **Promise bar removed** (markup, CSS, JS) on request. Anisotropy cap 8 -> 16.
- **Not verified:** the hi-res re-render path itself (only the "already wide enough" path ran), real photoreal output, entrance letters for every section.

## 15. Mobile pass, live scoreboard, checkout pop-up
- **Mobile (<= 760 px):** compact HUD, slim bottom bar (30dvh max; optional lines tagged `.opt` are hidden; in the seat view only the seat card + buttons), 44 px controls, 16 px inputs, safe-area insets, wider vertical field of view on tall screens
  (`fitFov`, <= 75 deg), pixel ratio <= 1.5, no hover tooltips on touch (`hover:none`), checkout becomes a bottom sheet. Measured at a 500 px wide window: bar 60 px (overview), 180 px (section), 196 px (seat) of 746 px; no sideways scroll.
- **Live scoreboard:** `#scorecard` (dark card, Live notch, club-colour discs, score pill, clock pill) replaces the small HUD pill; compact row under the HUD below 1100 px. The clock is real seconds since you sat down.
- **Checkout pop-up** (cart -> payment -> ticket details), see 03-pricing.md. Bug found and fixed: a comma expression assigning undeclared variables in the thumbnail capture threw in the module (ReferenceError in the loop).
- **Verified:** cart (picture, stepper 2 seats, DEMO10 = 10%), payment validation error, successful pay -> ticket with order number, entrance letter and bar code, card number not left in the DOM, Esc closes the pop-up; phone screenshots of the cart sheet, the scoreboard row and the seat bar; console empty.
- **Not verified:** a real phone (only a narrowed desktop window was used), touch drag for the head turn, keyboard focus order inside the pop-up, browsers other than the test tool's.

## 16. Pitch surround: ad boards, corner flags, dugouts (2026-11-16)
- **What:** after the goals block in `index.html`: LED advertising strip (6 made-up sponsors, emissive, repeats every 36 m) along a rounded rectangle 56.5 x 37.5 m, plain dark back side; 4 corner flags; 2 dugouts on the +z touchline (low walls so front rows still see the pitch); 1 m corner arcs added to the pitch texture. Goals already existed (posts, bar, nets).
- **Why:** user asked for banners, advertisements, flagpoles and goals on the sidelines.
- **Verified:** module syntax (`node --check`); console had no errors/warnings; boards seen readable from two seat views; dugouts seen from a long-side seat and from a seat behind a goal.
- **NOT verified:** corner flags and corner arcs were not inspected close up; phone width; frame rate impact.
- **Gotcha:** Chrome served a stale `index.html` after the edit; reload with cache bypass (`fetch('/index.html',{cache:'reload'})` then reload).

## 17. Matchday life, cart extras, photo proxy (2026-11-16)
- **What:** (1) 16 plaza stalls, 8 flagpoles, ~180 walking fans (instanced, own rng so trees did not move). (2) Cart "Matchday extras": 13 items in 5 groups, made-up demo prices (categories from a web search on stadium merch/food/programmes; prices are NOT from any club). Promo DEMO10 applies to tickets only. (3) `proxy/server.mjs` (Node 22, no dependencies): serves only `/` and `/index.html` plus `/api/status` and `/api/render`; model `fal-ai/flux-pro/kontext/max`; key in git-ignored `proxy/.env`; fixed server prompt; $5 cap from the list price ($0.08 x n), written to `proxy/spend.json` before each call, refunded on a provider 403; per-IP 6/min; same-origin check; in-memory cache. (4) Page: Photo button, seat-level auto render, chip messages, photo fades in, clears on head turn. Dugouts lowered.
- **Verified:** module syntax, server syntax, `/api/status`, page 200, `.env` and docs 404 over HTTP, console clean, fans visible on the entrance lane, cart extras add up (165 + 34 = 199), scroll kept on +/-.
- **NOT verified:** a successful render. The provider answered 403 "User is locked. Reason: Exhausted balance" (the key is accepted, the fal account has no credit). Unknown still: whether `image_url` accepts the base64 data URI, real latency, how well Kontext keeps seats/board text, real cost. Stalls close up, phone width, frame rate.
- **Not done:** no change to the WebGL lighting/shadows in this batch (the photo path is the "fancy" route).

## 18. Auto photos, roads for the crowd, 3D polish (2026-11-16)
- **What:** (1) Photo mode renders automatically at start (overview) and at the end of every flight (overview / section / seat / suite); the client sends a view key (level + camera + target + landscape/portrait) and the proxy caches by it in memory and in `proxy/cache/` (300 files max), so a view rendered once is free and instant for everybody. Per-level server prompts. Pointer move at overview / section shows the live 3D for 2.5 s (hover colours). `?nophoto` in the URL disables it. (2) Red / green approach lanes removed. (3) Fans start at a bus stop beside each access road and follow the road kerb to the gate; exits send a few across the plaza. (4) Seats: baked directional shading, pale-gold diamond lattice. (5) Lighting: hemisphere 0.45 -> 0.62, IBL 0.13 -> 0.2. (6) Dugouts lighter.
- **Verified:** syntax of page and proxy; overview photo returned automatically (about 8 s); lanes gone and people on the road kerbs (screenshot); gold lattice and brighter seat view (screenshot, `?nophoto`).
- **NOT verified:** section and suite photos after this change; the model does NOT keep the top-down camera (the overview photo came back oblique even with a stricter prompt), so hover / click use the live 3D underneath; frame rate and cost of the new seat shading (same 60 tris); phone width; shadows are still one frozen 4096 map (unchanged).

## 19. Photo mode off by default, lighting audit (2026-11-16)
- **What:** photo mode is now OFF unless the URL has `?photo` (code and proxy kept). Scene census (page, desktop test browser): 357 meshes, 341 draw calls, 5.39 M triangles of which 4.70 M are the 78,397 seats (60 tris each); lights = hemisphere 0.62 + one shadow-casting sun 3.2 + (new) cool fill 0.4 without shadow + IBL; ACES 0.9; PCFSoft; 264 shadow casters, 261 receivers; seats receive but do not cast. New: cool fill light, CSS vignette overlay, `scene` and `sun` exposed on `window.__stadium`.
- **Tried and rejected (measured in the test browser, idle frame about 43 ms there):** (a) seats casting shadows: first frame of a flight stalled about 1.4 s; (b) re-fitting the shadow frustum to +-170 m inside the bowl (2x sharper texels): still a 741 ms stall at flight start. Both removed; comments in `index.html` say so.
- **Verified:** syntax; section/seat screenshot shows the fill and vignette; census numbers above.
- **NOT verified:** frame rate on a real GPU or phone (the test browser is slow, so those stall numbers are not what a real GPU will show); effect of the vignette on phones.

## 20. Photo feature removed from the page (2026-11-16)
- **What:** removed from `index.html`: Photo button, "Developing the photo" chip, `#shot` overlay, render hook (`STADIUM_RENDER`, `captureShot`, `clearShot`), PHOTO MODE block, the `/api/status` call, related CSS and header comment lines. `proxy/` (server, `.env`, cache) is left in place but the page no longer calls it. A copy of the file before removal is only in the session scratchpad, not in the project.
- **Verified:** module syntax; page loads, console empty, a seat flight works, no photo button / chip / overlay in the DOM.
- **NOT verified:** phone width. Book chapters 02, 04 and 06 may still mention the render hook or photo mode: treat those mentions as historical.

## 21. Roof changed to translucent ETFE foil (2026-11-16)
- **What:** the opaque ribbed cream-gold roof is now a see-through foil ring: diamond-lattice texture (steel lines + puffed cushion centres, tile about 11 m), MeshPhysicalMaterial with clearcoat and sky reflections, `cast: false`; plus 104 radial steel ribs as one InstancedMesh (they cast the roof shadow). Inner rim, soffit lip, outer lip unchanged. The 40% roof fade still works (it scales material opacity).
- **Why / reference:** the user asked for a glass-film roof copied from real stadiums. A web search named the Allianz Arena and U.S. Bank Stadium as ETFE foil-cushion stadiums with diamond panel layouts; the look here is my interpretation of that (diamond lattice, milky cushions, steel frame), not a measured copy of either roof.
- **Verified:** syntax; overview screenshot shows the lattice and ribs; seat-level screenshot with the roof faded.
- **NOT verified:** frame rate with the extra transparent layer (transparent surfaces cost fill rate); phone width; the look at the roof toggle (R); how the lack of roof shadow changes seat-level lighting on a real GPU.

## 22. Roof opaque at seat level, availability, prices only on hover (2026-11-16)
- **What:** (1) `setRoofFade` now only at the section level (40%); with a single seat selected the roof is drawn at full opacity. (2) Availability rule (my interpretation of the user's words, not real inventory): seats with a different colour (light orange code 1, pale gold code 2) are not available: no hover highlight, not clickable, not added as neighbour seats in the cart; section tooltip says "N seats available", panel says "X of Y seats available"; section / tier price ranges use available seats only; a hovered unavailable seat inside the selected block shows "Not available". (3) The generic tier/skybox/parking price list is hidden (`#legend`); prices show only on the hover card and the selection panel; the overview hint text was reworded. Consequence: parking prices are no longer shown anywhere (parking is not selectable).
- **Verified:** syntax; console empty; page facts: legend hidden, section 7 panel "568 of 684 seats available", roof opacity 0.4 at section and 1 at seat.
- **NOT verified:** a real mouse click on an unavailable seat (guard is in the pointer-up handler; `window.__stadium.selectSeat` bypasses it), the "Not available" hover card by eye, phone text.

## 23. UI cleanup, pitch life, parking lots with 50 cars (2026-11-16)
- **What:** (1) Removed the top-left title / seat count and the bottom-left hint. The price panel is hidden unless a section, seat or skybox is selected. The four view buttons (Overview / Aerial / Descent / Roof) are kept and moved bottom centre on desktop (phones: still top, compact), because the camera is locked and they are the only way to move it back (my judgement; easy to hide). (2) Pitch: dugouts moved to 0.9 m from the touchline (in front of the ad boards), technical-area lines, fourth official desk with an electronic board (7 / 11), 2 assistant referees with flags, 34 stewards in hi-vis facing the stands (instanced), 12 photographers behind the goals, 4 TV tripods, 3 spare balls. A web search covered only technical areas and the fourth official (1 m either side of the bench, up to 1 m from the touchline; official between the benches); the other items come from general knowledge, not a source. (3) Parking ring: 4 lots (E, S, W, N = quarters in plan angle, same rule as `lotOf`) with their own pavement tint, kerb islands with bushes on the 4 boundaries, a signpost per lot, and 50 instanced cars (13 / 13 / 12 / 12, more in the rows near the stadium; body + cabin + wheels = 3 InstancedMeshes). Cars are back because the user asked (earlier removed): CLAUDE.md updated.
- **Verified:** syntax; console empty; `window.__parkedCars === 50`; panel hidden at overview and visible with a seat; screenshots of the overview, a parking close-up (tints, islands, signs, cars) and a seat view (dugouts, stewards).
- **NOT verified:** photographers, TV tripods, the electronic board and the assistant referees close up; car look from the ground; frame rate; phone width; whether stewards look grounded from every seat (they looked slightly floating over the dark pit in one view).

## 24. Docs and comments brought up to date (2026-11-16)
- **What:** rewrote the `index.html` header comment (it had gaps and duplicate bullets), fixed stale section comments (parking "empty: no cars", pedestrian lane, green lane, roof fade "section or seat"), and updated `00-index`, `02`, `03`, `04`, `05`, `06` and `CLAUDE.md` to the current code (foil roof, availability, extras, UI removals, parking lots + cars, pitch life, photo feature removed, `proxy/` unused). Entries 1-23 above stay as the history and may mention things that were later changed or removed.
- **Verified:** module syntax after the comment edits (`node --check`).
- **NOT verified:** that every sentence in the chapters was re-checked against the code; numbers copied from earlier entries (e.g. 357 meshes, 5.39 M triangles, 568 of 684 seats) are from earlier measurements, not re-measured now.

## 25. Car park, loading screen, fold buttons, repository (2026-11-16)
- **What:** (1) Parking ring turned into a car park: asphalt texture (own rng), faint lot tints, yellow bay lines (side + head lines), yellow hatch strips with NO PARKING signs along both sides of each access road, solid yellow line on the plaza edge, chain-link fence round the outer edge with an 18 m opening and a "PARKING - ENTRANCE" gate portal per road. (2) Road bug: the spurs ended in a cap in the middle of the parked rows; they now run straight and radial over the lot and end at the plaza edge (fans walk on from there; fan paths carry a ground height). (3) Heights: lot 0.38, markings 0.41, road verge 0.46, tarmac 0.56 (were 0.18-0.26) after the user reported z-fighting with the ground and between road and lot. (4) `assets/loader.html` (the user's animated loading screen, 224 KB, CSS only) shown in an iframe from the first byte; font stylesheet no longer render-blocking; three.js modulepreloaded; the build yields to the browser between big sections; `window.__boot` marks; loader fades out after the first drawn frame. (5) Fold buttons (Hide / Show) on the price panel, scoreboard and view buttons. (6) Git repository prepared for https://github.com/vansteenbergenmatisse/PROJECT_STADIUM_CONFIGURATOR (README, .gitignore; `proxy/` and the 6.9 MB reference image are NOT published).
- **Why:** user requests. The user's attached image for the fold request was not visible to me, so "put this away and put it back" was read as: every floating card can be folded (my reading, easy to narrow).
- **Verified:** module syntax (`node --check`); console empty after load; close-up and top-down screenshots of the lot, fence, gate portal, hatch and road end; loader visible full-screen during the build; fold buttons toggle `is-folded`/`aria-expanded` on desktop and in a 500 px wide window (folded cards shrink to the button, no sideways scroll).
- **Measured (test browser, software-rendered, slow; cold cache):** from navigation start: module start 195-357 ms (warm) / 4.9 s (cold CDN), build marks span about 1.3-3 s, then the first render call alone takes about 5.5 s (shader compile + 4096 shadow bake + 5.4 M triangles). Cause of the 5.5 s not isolated.
- **NOT verified:** frame rate / first-frame time on a real GPU or phone; that the loader animation keeps moving while the main thread is busy (it is an iframe, so it may stall during the first render call); z-fighting from every camera angle (only top-down and two oblique poses were checked); fans' height on the road edge close up; fold buttons on a real phone; `renderer.compileAsync` was tried and never resolved in the test browser, so it was removed.

## 26. Car park clean-up after the user's screen recording, hide behaviour (2026-11-16)
- **What:** (1) The user's 7 s recording (`Screen Recording 2026-11-16 at 21.11.19.mov`) is only the top-down zoom-in: it shows the lots rendering as dark saturated blue / brown blocks with shimmering fine lines, and it ends before any close-up. I then inspected close-ups in the browser and found: bay lines of the back-to-back rows drifting against each other (each row had its own bay count) so cars sat between no lines; blotchy, brownish asphalt (big dark patches and crack scribbles read as dirt); over-saturated lot tints; a coarse fence mesh. Fixed: one shared bay grid (`BAY_EDGES`, radial side lines through all rows, cars use the same grid), neutral asphalt without cracks and with very faint patches, paler tints, finer fence mesh. (2) Hide now really hides: a hidden card is gone and only a 28 px "+" dot remains; `H` hides / shows all cards.
- **Why:** user: "when I say hide, I mean literally hide it" and "around the parking lot ... a lot of places where it's really trash".
- **Verified:** syntax; console empty; close-up screenshots before and after (aligned bays, cars inside bays, neutral asphalt); hide leaves a 28 x 28 transparent dot, restores on click, `H` toggles all three cards.
- **NOT verified:** every spot the user saw in their own full recording (I only saw the 7 s overview clip and my own close-ups of the west lot, the east gate and a kerb island); that the lots no longer shimmer at distance (fine lines alias; no mipmap/line-width change was made); the hide dot on a real phone.
