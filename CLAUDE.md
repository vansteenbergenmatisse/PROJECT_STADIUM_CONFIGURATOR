# Stadium — project instructions

three.js stadium as plain ES modules (`index.html` = markup + import map + stylesheet links, `css/*.css`, `src/**/*.js`; three r160 from the jsDelivr CDN, no build step, no package manager).
The code map is `docs/book/02-architecture.md`; `src/main.js` is a thin boot file that calls the builders in the original order (the seeded random sequence depends on that order).
It is currently an **orange "Soccer City" (Johannesburg) style stadium in a green meadow**: calabash mosaic facade, a translucent ETFE-foil roof (40% opacity only while a section is selected),
78,397 seats in ONE `InstancedMesh` (straight aisles; only plain-orange seats are available), click-only camera plus a head turn at the seat level, prices shown only on hover cards and in the selection panel,
56 skyboxes, 4 entrances + 4 exits with ~180 walking fans on the access roads, matchday stalls and flagpoles, a pitch with ad boards / flags / dugouts / officials / stewards / photographers,
a fenced car park of 4 tinted lots (yellow bay lines = park, yellow hatch = no parking, gate portals) with 50 parked cars, a dense forest, blue sky with sun and clouds, an 11 v 11 demo match (Barcelona v Dortmund) with a live scoreboard, a demo checkout pop-up with matchday extras,
a Forge Forward branded UI that works on phones (price panel, scoreboard and view buttons can be folded away), an inline loading screen (SVG + CSS, `css/loader.css`, `src/ui/loader.js`) shown while the scene builds. No houses. Parking is not selectable. The AI photo render was removed (book entry 20); `proxy/` is unused.

## Repository and hosting
- GitHub: https://github.com/vansteenbergenmatisse/PROJECT_STADIUM_CONFIGURATOR (branch `main`). Live demo on GitHub Pages: https://vansteenbergenmatisse.github.io/PROJECT_STADIUM_CONFIGURATOR/ (deploys from `main`, root folder, no build).
- `proxy/` and `reference-3d-frame-aerial.png` are git-ignored on purpose (API key, cache, 6.9 MB image). Never commit `proxy/.env`.
- Commit and push only when the user asks. Every push to `main` redeploys the live page, so run the verify steps below first.

## Book index (auto-imported so it is always in context)
@docs/book/00-index.md

## After a context clear / compaction (do this FIRST)
1. Read this file.
2. Read `docs/book/00-index.md`, then the chapters it points to (at minimum `01-history.md`, `02-architecture.md`, `06-open-issues.md`).
3. Read the header comment at the top of `index.html` (the file map) and the `@fileoverview` header of every module you are about to edit before changing anything.
4. Trust the book + the header comment over memory. If the code disagrees with them, the code is the truth: fix the docs.

## Standing rules (the user asked for these)
- **Comment the code in detail, always.** The header comment of `index.html` (right after `<!doctype html>`) is the map of the files, and every module in `src/` starts with an `@fileoverview` header (what it builds, why it is separate, what it depends on). The header comment of `index.html` is the map of what the page
  currently contains. Every section marker (`/* ---- ... */`) must say what it builds and why. Whenever code changes, update the
  affected comments in the same edit. Never leave a comment describing something that no longer exists.
- **Keep the book.** `docs/book/` is a set of markdown chapters (index, history, architecture, pricing, camera/interaction,
  rendering/lighting/shadows, open issues). On every change, update the relevant chapter(s) AND append an entry to
  `01-history.md` (date, what changed, why, what was verified and what was NOT verified).
- **Update both together.** A change is not finished until the `index.html` map, the module headers and the book match the code.
- Report gaps as gaps. Do not write "works"/"fast"/"verified" in the book unless it was actually checked in this project;
  put unverified things under "Not verified" in `06-open-issues.md`.

## Hard requirements from the user (do not break without asking)
- All seats are drawn as **one `InstancedMesh`**; each instance id maps to tier / row / number / section / price via typed arrays.
- **Camera is locked**: no orbit, pan or zoom. It moves only through `flyTo()` when the user clicks something in the stadium
  (seat block, seat, skybox) or uses the Overview / Aerial / Descent buttons. Only exception (asked for): at the seat level the user can turn their head (drag / arrow keys), the position never changes.
- **Section first**: a seat can only be hovered / picked inside the selected section; hovering elsewhere shows the section price range. Seat colour changes on hover only.
- **No houses.** Cars were removed earlier and are BACK on request (50 parked cars in the 4 parking lots, batch 23). Small shops are present.
- **UI**: no title card, no bottom-left hint, no always-on price list (removed on request). The price panel appears only while a section / seat / skybox is selected. The 4 view buttons stay (bottom centre on desktop) because the camera is locked and they are the only way to Overview / Aerial / Descent.
- Start frame is a true **top-down** view (camera `[0,432,0.5]`). Descent = one straight line, no yaw/orbit, to the long stand.
- Selecting anything with several seats shows a **price range**; single seats show an exact price.
- Buying is a **pop-up** (cart, payment, ticket details) and is a pure demo: nothing is charged, stored or sent. Never add a real payment or send form data anywhere without asking.
- The UI follows the Forge Forward brand guide (Plus Jakarta Sans, `--ff-*` tokens, charcoal buttons, plain voice); the surroundings keep the plaza, parking ring and shops unless the user says otherwise.

## How to run / verify
- Serve: `cd` to this folder, `node proxy/server.mjs` (serves the page on 0.0.0.0:8765; the photo API in it is currently unused by the page), open `http://localhost:8765/index.html`. `python3 -m http.server 8765` works too. After editing, reload with cache bypass.
- Syntax check every module: `for f in $(find src -name '*.js'); do node --check "$f" || echo FAIL $f; done`.
- Parity check after any change to the scene build: run `tools/parity/fingerprint.js` in the page (see `tools/parity/README.md` for the expected values). Builders must keep the original call order or the seeded random sequence, and so the look, changes.
- Visual check with a browser tool: screenshot the Overview (top-down), Aerial, a section, a seat (match + scoreboard), the checkout pop-up and a phone width (resize to ~390 px); check the console is empty.
  The test browser can fire stray clicks: call `window.__stadium.go('overview')` and check `nav.level` first. Never put `*/` inside a `/* */` comment.
- Stop the server when done.

## Workflow notes
- Global rules still apply: brownfield (keep plain ES modules + CDN three, no build step), no commits/pushes/installs without approval.
- The Project OS / superpowers skills from the global config apply; this is a small creative repo, so keep process light.
