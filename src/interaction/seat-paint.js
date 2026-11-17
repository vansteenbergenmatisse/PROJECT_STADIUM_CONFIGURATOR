// @ts-check
/**
 * @fileoverview interaction/seat-paint: createSeatPaint: colours the seat InstancedMesh for hover, selection and dimming.
 *
 * WHY: seat colour is per-instance data (seats.instanceColor), so every highlight is a write into one typed array followed by needsUpdate. The rules (which colour for which seat) are kept in one place:
 *      natural colour by code (0 orange, 1 light orange, 2 pale gold), darkened (x0.45) for every block except the selected one while a section is selected, brighter for the hovered block,
 *      vivid magenta only for the hovered AVAILABLE seat inside the selected block (colour changes on hover only, never on click).
 * BUILDS: nothing in the scene; it extends the shared COL palette (world/seats.js) with the selection colours.
 * DEPENDS ON: three (Color), src/state/state.js.
 * USED BY: src/main.js (creates it), src/interaction/selection.js, src/interaction/hover.js.
 * LIFECYCLE: created once after the seats; COL is mutated once here (adds seat, redDim, blueDim, goldDim, hotGold, hotRed, hotBlue). No listeners.
 * UNITS / CONVENTIONS: seat id = instance id; seatTier / seatSection are 1-based in the tables, so selTi / selSe (zero-based) are compared with `- 1`; block key = "tier:section" (zero-based).
 * NOT HERE: availability (data/display-prices.js), which block is hovered or selected (state), the order of calls (selection.js, hover.js).
 */
import * as THREE from 'three';
import { state } from '../state/state.js';

/**
 * Create the painting helpers and add the selection colours to COL.
 * Side effects: mutates `COL`; writes seats.instanceColor when the returned functions are called.
 * @param {{seats: any, seatCode: any, seatTier: any, seatSection: any, seatCount: number, sectionIds: Map<string, number[]>, COL: any}} src - the seat mesh, tables and palette from world/seats.js.
 * @returns {{paint: (id: number, col: any) => void, baseCol: (id: number) => any, repaintAll: () => void, repaintKey: (k: string) => void, refresh: (keys: Iterable<string|null>) => void}} painting functions.
 */
export function createSeatPaint({ seats, seatCode, seatTier, seatSection, seatCount, sectionIds, COL }) {
  COL.seat = new THREE.Color(0xff00c8);                                  // the seat under the mouse (inside the selected block) = vivid magenta; nothing else is magenta. A click does not recolour it.
  COL.redDim = COL.red.clone().multiplyScalar(0.45); COL.blueDim = COL.blue.clone().multiplyScalar(0.45); COL.goldDim = COL.gold.clone().multiplyScalar(0.45); COL.hotGold = new THREE.Color(0xffe6a0);   // every other block while one section is selected
  COL.hotRed = new THREE.Color(0xff9640); COL.hotBlue = new THREE.Color(0xffb866);                          // hovered block: brighter orange, chairs stay readable
  const paint = (id, col) => seats.setColorAt(id, col);
  /** Natural colour of a seat, darkened when it is outside the selected block. */
  const baseCol = id => {
    const c = seatCode[id];
    if (state.dimOthers && (seatTier[id] - 1 !== state.selTi || seatSection[id] - 1 !== state.selSe)) return c === 2 ? COL.goldDim : c === 1 ? COL.blueDim : COL.redDim;
    return c === 2 ? COL.gold : c === 1 ? COL.blue : COL.red;
  };
  /** Repaint every seat (used when the dimming changes), then re-apply the hovered block. */
  function repaintAll() { for (let i = 0; i < seatCount; i++) paint(i, baseCol(i)); if (state.hoverKey) repaintKey(state.hoverKey); seats.instanceColor.needsUpdate = true; }
  /** Repaint one block: bright if it is hovered and not selected, else its base colours. */
  function repaintKey(k) { const ids = sectionIds.get(k); if (!ids) return; const hot = k === state.hoverKey && k !== state.selKey; for (const i of ids) paint(i, hot ? (seatCode[i] === 2 ? COL.hotGold : seatCode[i] ? COL.hotBlue : COL.hotRed) : baseCol(i)); }
  /** Repaint the given blocks (duplicates and nulls ignored), then the hovered seat in magenta. */
  function refresh(keys) {
    for (const k of new Set(keys)) if (k) repaintKey(k);
    if (state.hoverId >= 0) paint(state.hoverId, COL.seat);                      // colour change happens on hover only
    seats.instanceColor.needsUpdate = true;
  }
  return { paint, baseCol, repaintAll, repaintKey, refresh };
}
