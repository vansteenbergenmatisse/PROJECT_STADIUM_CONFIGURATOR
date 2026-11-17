// @ts-check
/**
 * @fileoverview interaction/hover: createHover: applies what the pointer is over to the hover state, the seat colours, the skybox marker and the lot strips.
 *
 * WHY: SECTION FIRST: in the overview (or over another block) hovering a seat highlights the WHOLE block and never a single seat; only inside the selected block, and only for an AVAILABLE seat
 *      (plain orange), does a single seat get the magenta hover colour. Hover changes only colours and markers, never the camera.
 * BUILDS: nothing.
 * DEPENDS ON: src/state/state.js.
 * USED BY: src/main.js (creates it), src/interaction/input.js (setHover on pointer move / leave).
 * LIFECYCLE: created once; keeps no private state (hoverId, hoverKey, hoverSuite, hoverLot are in state).
 * UNITS / CONVENTIONS: `h` is a pick result (interaction/picking.js) or null; hoverId = -1 means no single seat; hoverKey = "tier:section" of the hovered block or null.
 * NOT HERE: the hover card text (ui/hover-card.js), raycasting (picking.js), colour rules (seat-paint.js).
 */
import { state } from '../state/state.js';

/**
 * Create the hover handler.
 * @param {{paint: (id: number, col: any) => void, baseCol: (id: number) => any, refresh: (keys: Iterable<string|null>) => void}} seatPaint - seat colouring (seat-paint.js).
 * @param {{hoverMarker: any, placeMarker: (m: any, u: number) => void, updateLots: () => void}} markers - highlight markers (world/markers.js).
 * @param {{inSectionView: () => boolean, keyOf: (id: number) => string}} selection - section-first helpers (selection.js).
 * @param {{isAvail: (i: number) => boolean}} prices - availability rule (data/display-prices.js).
 * @returns {{setHover: (h: any) => void}} the hover handler.
 */
export function createHover({ paint, baseCol, refresh }, { hoverMarker, placeMarker, updateLots }, { inSectionView, keyOf }, { isAvail }) {
  /** Update the hover state for pick result `h` (or null) and repaint / move markers only where something changed. */
  function setHover(h) {
    const isSeat = h && h.type === 'seat', nKey = isSeat ? keyOf(h.id) : null;
    const nId = isSeat && inSectionView() && nKey === state.selKey && isAvail(h.id) ? h.id : -1;          // overview or another block: highlight the whole block, never a single seat
    const nSuite = h && h.type === 'suite' ? h.u : -1, nLot = h && h.type === 'lot' ? h.lot : null;
    if (nId !== state.hoverId || nKey !== state.hoverKey) {
      const oldKey = state.hoverKey, oldId = state.hoverId; state.hoverId = nId; state.hoverKey = nKey;
      if (oldId >= 0) paint(oldId, baseCol(oldId));
      refresh([oldKey, nKey]);
    }
    if (nSuite !== state.hoverSuite) { state.hoverSuite = nSuite; placeMarker(hoverMarker, nSuite === state.selSuite ? -1 : nSuite); }
    if (nLot !== state.hoverLot) { state.hoverLot = nLot; updateLots(); }
  }
  return { setHover };
}
