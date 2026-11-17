// @ts-check
/**
 * @fileoverview main: the thin boot file (entry module): creates the context, calls the builders in the ORIGINAL order, wires interaction / UI / simulation, starts the loop, hides the loading screen (ui/loader.js).
 *
 * WHY: everything else lives in its own module (see the SCRIPT MAP in index.html). What remains here is the one thing only the entry point can do: decide the ORDER. The order is part of the scene,
 *      because the world builders share one seeded random generator (core/rng.js) and the scene graph order is part of the parity fingerprint.
 * BUILDS: nothing itself; it calls createCtx() and the buildX(ctx) factories (src/core, src/world), then the markers and the 11 v 11 match, then the interaction / UI modules.
 * DEPENDS ON: every module under src/ (config -> data -> core -> world -> sim -> interaction -> ui -> debug), src/state/state.js. The modules never import main.js and there are no import cycles:
 *             ui modules do not import interaction, and interaction gets the few UI functions it needs injected here.
 * USED BY: index.html (<script type="module" src="./src/main.js">).
 * LIFECYCLE: runs once at load with top-level awaits (yieldToPaint between the big builds, so the loading screen can paint); registers every listener through ONE listener group (never aborted: the page never unmounts);
 *            ends by removing the loading screen and assigning window.__boot (here), window.__parkedCars (world/parking.js) and window.__stadium (debug/expose.js).
 * UNITS / CONVENTIONS: metres, y up, angles in radians; shared mutable values live in state (src/state/state.js). `mark(name)` stores milliseconds since navigation start in window.__boot (13 marks, names unchanged).
 * NOT HERE: scene content (src/world), constants (src/config), data and price formulas (src/data), renderer / scene / lights / loop (src/core), match (src/sim), input / camera / selection (src/interaction), DOM views (src/ui).
 */
import { createCtx } from './core/ctx.js';
import { createListenerGroup } from './core/listeners.js';
import { buildLighting } from './core/lighting.js';
import { prepareStaticScene, startLoop } from './core/loop.js';
import { tiers } from './config/constants.js';
import { createDisplayPrices } from './data/display-prices.js';
import { buildSky } from './world/sky.js';
import { buildGround } from './world/ground.js';
import { buildPitch } from './world/pitch.js';
import { buildTerraces } from './world/terraces.js';
import { buildFacade } from './world/facade.js';
import { buildGates } from './world/gates.js';
import { buildSeats } from './world/seats.js';
import { buildSkyboxes } from './world/skyboxes.js';
import { buildRoof } from './world/roof.js';
import { buildRoads } from './world/roads.js';
import { buildParking } from './world/parking.js';
import { buildShops } from './world/shops.js';
import { buildMatchday } from './world/matchday.js';
import { buildTrees } from './world/trees.js';
import { buildMarkers } from './world/markers.js';
import { createMatch } from './sim/match.js';
import { createCameraRig, OVERVIEW } from './interaction/camera-rig.js';
import { createSeatPaint } from './interaction/seat-paint.js';
import { createRoofControl } from './interaction/roof-control.js';
import { createSelection } from './interaction/selection.js';
import { createPicker } from './interaction/picking.js';
import { createHover } from './interaction/hover.js';
import { wireInput } from './interaction/input.js';
import { createViewButtons } from './ui/view-buttons.js';
import { createPricePanel } from './ui/price-panel.js';
import { createHoverCard } from './ui/hover-card.js';
import { createCheckout } from './ui/checkout.js';
import { createScoreboardView } from './ui/scoreboard-view.js';
import { wireFoldButtons } from './ui/fold-buttons.js';
import { exposeDebug } from './debug/expose.js';
import { state } from './state/state.js';
import { createLoader, setProgress, progressFromMark, hideLoader } from './ui/loader.js';

/* ------------------------------------------------------------------ boot: loading screen first, scene second
   The scene is built synchronously (a few hundred ms to seconds of main-thread work). `yieldToPaint()` hands the thread back so the browser can draw the loading screen before the next heavy block
   starts (rAF when the tab is visible, a short timer otherwise so a background tab still finishes). `mark()` records milliseconds since navigation start in window.__boot for profiling. */
const boot = window.__boot = [];
const mark = name => { boot.push([name, Math.round(performance.now())]); const f = progressFromMark(name); if (f) setProgress(f); };   // the 9 scene marks also move the loader bar
createLoader();
const yieldToPaint = () => new Promise(done => { const t = setTimeout(done, 80); requestAnimationFrame(() => { clearTimeout(t); setTimeout(done, 0); }); });
mark('module start');await yieldToPaint();

/* ------------------------------------------------------------------ renderer / scene / camera rig / sky / lights: built by src/core and src/world/sky.js (see their headers) */
const ctx = createCtx();
const { renderer, scene, camera, controls } = ctx;
const { updateSky } = buildSky(ctx);
const { sun } = buildLighting(ctx);


mark('ground'); await yieldToPaint();
buildGround(ctx);
buildPitch(ctx);


mark('terraces'); await yieldToPaint();
const { terraces, white } = buildTerraces(ctx);
buildFacade(ctx);
buildGates(ctx);


mark('seats'); await yieldToPaint();
const { seats, seatCount, seatTier, seatRow, seatNumber, seatSection, seatCode, seatPrice, seatPos, sectionIds, grid, COL, seatInfo } = buildSeats(ctx);


mark('skyboxes'); await yieldToPaint();
const { glassMesh, suites, SUITE_W } = buildSkyboxes(ctx, { white });
const { roof } = buildRoof(ctx, { white });


mark('park'); await yieldToPaint();
const { curves, roadSamples, spurSamples, roadDist, outsideStadium } = buildRoads(ctx);
const { parkingMesh } = buildParking(ctx, { curves, spurSamples, outsideStadium });


mark('shops'); await yieldToPaint();
buildShops(ctx, { curves, roadSamples, spurSamples });
const { fansUpdate } = buildMatchday(ctx, { curves });


mark('trees'); await yieldToPaint();
buildTrees(ctx, { curves, roadSamples, roadDist, outsideStadium });



mark('camera rig'); await yieldToPaint();
/* ------------------------------------------------------------------ camera rig, prices, markers, match, selection, UI, input: each in its own module, created here in dependency order.
   Scene objects are added in the original order: the 2 suite markers and 4 lot strips first, then the match group. */
const views = createViewButtons();                                          // DOM only: tab group + Roof button; the actions are bound below, once the selection exists
const rig = createCameraRig(ctx, { setView: views.setView });
const tables = { seatTier, seatRow, seatNumber, seatSection, seatPos, seatPrice, sectionIds };   // what the UI modules read (window.__stadium.tables below exposes only the first five, as before)
const prices = createDisplayPrices({ seatCount, seatTier, seatCode, seatPrice, sectionIds, suites });
const markers = buildMarkers(ctx, { suites, SUITE_W });
const match = createMatch(ctx);
const seatPaint = createSeatPaint({ seats, seatCode, seatTier, seatSection, seatCount, sectionIds, COL });
const roofControl = createRoofControl({ roof, renderer }, { setRoofPressed: views.setRoofPressed });
const checkout = createCheckout(tables, prices);
const pricePanel = createPricePanel(tables, prices, roofControl, match);
const selection = createSelection(ctx, rig, seatPaint, markers, { renderSelection: pricePanel.renderSelection, setView: views.setView, closeBuy: checkout.closeBuy }, { seatTier, seatSection, seatPos, sectionIds, suites });
views.addTab('Overview', selection.goOverview); views.addTab('Aerial', selection.goAerial); views.addTab('Descent', selection.descent);
views.setView('Overview');
views.bindRoof(roofControl.toggleRoof);
const hover = createHover(seatPaint, markers, selection, prices);
const hoverCard = createHoverCard(tables, prices, selection);
const { pick } = createPicker(ctx, { terraces, glassMesh, parkingMesh, grid, seatPos, suites });
const { updateScore } = createScoreboardView(match);
const listeners = createListenerGroup();
wireInput(listeners, { canvas: renderer.domElement, panel: pricePanel.panel, modalEl: document.getElementById('modal') },
  { pick, setHover: hover.setHover, selection, rig, hoverCard, checkout, isAvail: prices.isAvail, toggleRoof: roofControl.toggleRoof });
wireFoldButtons(listeners);
pricePanel.renderSelection();

/* ------------------------------------------------------------------ loop: resize listener, first frame, shadow bake + matrix freeze (core/loop.js), then the render loop after one more yield */
prepareStaticScene(ctx, listeners, OVERVIEW);
mark('bake done');
await yieldToPaint();
startLoop(ctx, { fansUpdate, updateSky, match, updateLook: rig.updateLook, updateScore, checkout, mark });
document.getElementById('stats').textContent = `${seatCount.toLocaleString()} seats in 3 tiers`;

mark('scene built');
{                                                                  // remove the loading screen after the first frame has really been drawn (two rAFs), fading out unless reduced motion is on
  requestAnimationFrame(() => requestAnimationFrame(() => { mark('first frame'); hideLoader(); }));   // hideLoader fades the screen (class done) and removes it; safe if it is already gone
}
if (location.hash === '#descent') setTimeout(selection.descent, 1500);      // autoplay for capture: index.html#descent

// exposed for inspection / tests (debug/expose.js keeps the key set unchanged)
exposeDebug({ scene, sun, renderer, camera, controls, seats, seatInfo, seatCount, seatPrice, tiers, tierRange: prices.tierRange, nav: state.nav, suites,
  tables: { seatTier, seatRow, seatNumber, seatSection, seatPos }, goOverview: selection.goOverview, descent: selection.descent,
  selectSection: selection.selectSection, selectSeat: selection.selectSeat, selectSuite: selection.selectSuite, selectLot: selection.selectLot });
