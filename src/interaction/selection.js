// @ts-check
/**
 * @fileoverview interaction/selection: createSelection: navigation and selection: overview / aerial / descent, section, seat, skybox, parking lot, back.
 *
 * WHY: every click ends up here. The SECTION-FIRST rule lives here: a seat can only be selected after its section is selected (selectSeat falls back to selectSection otherwise).
 *      Each function resets or sets the shared selection fields in state, repaints the seats, moves the markers, starts ONE camera flight (flyTo) and asks the panel to redraw.
 * BUILDS: nothing in the scene.
 * DEPENDS ON: config/constants.js, data/bowl-math.js (shapePoint), src/state/state.js, src/interaction/camera-rig.js (presets, ease), world/markers.js (LOT_ARC).
 * USED BY: src/main.js (creates it), src/interaction/hover.js, src/interaction/input.js, src/ui/hover-card.js (inSectionView, keyOf), src/debug/expose.js.
 * LIFECYCLE: created once. The UI pieces it must call (panel redraw, active view tab, closing the checkout) are injected as `ui`, so there is no import from src/ui and no cycle.
 * UNITS / CONVENTIONS: block key = "tier:section" (zero-based); seat id = instance id (-1 none); nav.level is overview | section | seat | suite | lot (aerial and descent are "overview" with a view button active).
 *                      Camera targets: section view = 58 m back along the radial and 26 m up from the block centre; seat view = the seat position +1.15 m, looking at (0, 1, 0).
 * NOT HERE: the camera maths (camera-rig.js), hover handling (hover.js), pointer wiring (input.js), colours (seat-paint.js).
 */
import { Y1, PARK_IN, PARK_OUT } from '../config/constants.js';
import { shapePoint } from '../data/bowl-math.js';
import { state } from '../state/state.js';
import { LOT_ARC } from '../world/markers.js';
import { OVERVIEW, LONG_STAND, AERIAL, ease } from './camera-rig.js';

/**
 * Create the navigation / selection functions.
 * @param {{camera: any, controls: any}} ctx - shared context (core/ctx.js): the descent snaps the camera to the start frame before flying.
 * @param {{flyTo: Function}} rig - camera rig (camera-rig.js).
 * @param {{repaintAll: () => void, refresh: (keys: Iterable<string|null>) => void}} seatPaint - seat colouring (seat-paint.js).
 * @param {{selMarker: any, placeMarker: (m: any, u: number) => void, updateLots: () => void}} markers - highlight markers (world/markers.js).
 * @param {{renderSelection: () => void, setView: (name: string|null) => void, closeBuy: () => void}} ui - UI side effects (price-panel.js, view-buttons.js, checkout.js).
 * @param {{seatTier: any, seatSection: any, seatPos: any, sectionIds: Map<string, number[]>, suites: any[]}} src - seat tables and the suite list.
 * @returns {object} { inSectionView, keyOf, clearSel, goOverview, goAerial, descent, selectSection, selectSeat, selectSuite, viewFromSuite, selectLot, back }
 */
export function createSelection({ camera, controls }, rig, { repaintAll, refresh }, { selMarker, placeMarker, updateLots }, { renderSelection, setView, closeBuy }, { seatTier, seatSection, seatPos, sectionIds, suites }) {
  const { flyTo } = rig, nav = state.nav;
  /** Single seats can only be hovered / picked inside the selected block. */
  const inSectionView = () => (nav.level === 'section' || nav.level === 'seat') && state.selKey != null;
  /** Block key ("tier:section", zero-based) of a seat id. */
  const keyOf = id => (seatTier[id] - 1) + ':' + (seatSection[id] - 1);
  /** Clear the selection (and the checkout), repaint, hide the selected-suite marker and the lots. */
  function clearSel() {
    const k = state.selKey, wasDim = state.dimOthers; state.selKey = null; state.selSeat = -1; state.selSuite = -1; state.selLot = null; state.dimOthers = false; state.selTi = state.selSe = -1; closeBuy();
    if (wasDim) repaintAll(); else refresh([k]);
    placeMarker(selMarker, -1); updateLots();
  }
  /** Camera position and target for looking at the middle of a block (58 m back along the radial, 26 m up). */
  function sectionView(ti, s) {
    const ids = sectionIds.get(ti + ':' + s); let mx = 0, my = 0, mz = 0;
    for (const i of ids) { mx += seatPos[i * 3]; my += seatPos[i * 3 + 1]; mz += seatPos[i * 3 + 2]; }
    mx /= ids.length; my /= ids.length; mz /= ids.length;
    const L = Math.hypot(mx, mz) || 1, nx = -mx / L, nz = -mz / L;
    return { pos: [mx + nx * 58, my + 26, mz + nz * 58], tgt: [mx, my, mz] };
  }
  /** Overview button: clear everything and fly to the top-down start frame. */
  function goOverview() { clearSel(); nav.level = 'overview'; flyTo(OVERVIEW.pos, OVERVIEW.tgt); renderSelection(); setView('Overview'); }
  /** Aerial button: oblique drone angle. */
  function goAerial() { clearSel(); nav.level = 'overview'; renderSelection(); flyTo(AERIAL.pos, AERIAL.tgt); setView('Aerial'); }
  /** Descent button / D key: one straight line, constant heading (no yaw / orbit); pitch eases from straight down to the stand. */
  function descent() {
    clearSel(); nav.level = 'overview'; renderSelection();
    camera.position.set(...OVERVIEW.pos); controls.target.set(...OVERVIEW.tgt);
    flyTo(LONG_STAND.pos, LONG_STAND.tgt, 10000, ease); setView('Descent');       // keeps the original cubic ease so it still matches the reference video
  }
  /** Select a block (section first): dim the others and fly to it. */
  function selectSection(ti, s) {
    clearSel(); state.selKey = ti + ':' + s; nav.level = 'section'; state.selTi = ti; state.selSe = s; state.dimOthers = true; repaintAll();
    const v = sectionView(ti, s); flyTo(v.pos, v.tgt); renderSelection();
  }
  /** Select a seat; if its block is not the selected one yet, select the block instead (section-first rule). */
  function selectSeat(id) {
    if (!inSectionView() || keyOf(id) !== state.selKey) { selectSection(seatTier[id] - 1, seatSection[id] - 1); return; }   // a section must be selected before one of its seats
    const old = state.selKey, ti = seatTier[id] - 1, s = seatSection[id] - 1;
    state.selSuite = -1; state.selLot = null; placeMarker(selMarker, -1); updateLots();
    state.selKey = ti + ':' + s; state.selSeat = id; nav.level = 'seat'; refresh([old, state.selKey]);   // no recolour on click
    const x = seatPos[id * 3], y = seatPos[id * 3 + 1], z = seatPos[id * 3 + 2], L = Math.hypot(x, z) || 1;
    flyTo([x - x / L * 0.1, y + 1.15, z - z / L * 0.1], [0, 1, 0]); renderSelection();
  }
  /** Select skybox `u`: mark it and fly in front of it. */
  function selectSuite(u) {
    clearSel(); state.selSuite = u; nav.level = 'suite'; placeMarker(selMarker, u);
    const s = suites[u]; flyTo([s.x + s.nx * 34, Y1 + 13, s.z + s.nz * 34], [s.x, Y1 + 2.5, s.z]); renderSelection();
  }
  /** "View from this suite" button: fly to the suite's balcony looking at the pitch. */
  function viewFromSuite() {
    if (state.selSuite < 0) return; const s = suites[state.selSuite];
    flyTo([s.x - s.nx * 1.4, Y1 + 1.6, s.z - s.nz * 1.4], [0, 8, 0]);
  }
  /** Select a parking lot (not reachable from the page; kept for window.__stadium.selectLot). */
  function selectLot(lot) {
    clearSel(); state.selLot = lot; nav.level = 'lot'; updateLots();
    const [a0, a1] = LOT_ARC[lot], c = shapePoint((a0 + a1) / 2, (PARK_IN + PARK_OUT) / 2, [0, 0]), L = Math.hypot(c[0], c[1]) || 1;
    flyTo([c[0] - c[0] / L * 95, 85, c[1] - c[1] / L * 95], [c[0], 0, c[1]]); renderSelection();
  }
  /** Esc / Back: close the checkout if open; from a seat go back to its section; otherwise to the overview. */
  function back() {
    if (state.buy) { closeBuy(); return; }
    if (nav.level === 'seat') { const [ti, s] = state.selKey.split(':').map(Number); selectSection(ti, s); } else goOverview();
  }
  return { inSectionView, keyOf, clearSel, goOverview, goAerial, descent, selectSection, selectSeat, selectSuite, viewFromSuite, selectLot, back };
}
