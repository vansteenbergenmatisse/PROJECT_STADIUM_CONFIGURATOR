// @ts-check
/**
 * @fileoverview ui/hover-card: createHoverCard: the floating price card (#tip) that follows the pointer.
 *
 * WHY: prices are shown only on hover cards and in the selection panel. The card tells the section-first story: outside the selected block it shows the BLOCK and its price range
 *      ("Click to pick this section first"); inside it, an available seat shows its exact price and a non-available seat says "Not available".
 * BUILDS: DOM only (innerHTML of #tip). Every value in the markup is our own text, a number or a formatted price (no user-typed value).
 * DEPENDS ON: config/constants.js (tiers), data/pricing.js (CUR, SUITE_SEATS), src/state/state.js (selKey), src/ui/ticket-card.js.
 * USED BY: src/main.js (creates it), src/interaction/input.js (show on pointer move, hide on leave / click).
 * LIFECYCLE: created once; no listeners; display style and position are set directly on #tip.
 * UNITS / CONVENTIONS: positions in CSS pixels; the card is kept at least 330 px from the right edge and 90 px from the bottom edge of the window.
 * NOT HERE: which element is under the pointer (interaction/picking.js), the card CSS (css/panel.css).
 */
import { tiers } from '../config/constants.js';
import { CUR, SUITE_SEATS } from '../data/pricing.js';
import { state } from '../state/state.js';
import { ticketCard } from './ticket-card.js';

/**
 * Create the hover card.
 * @param {{seatTier: any, seatRow: any, seatNumber: any, seatSection: any, seatPrice: any, sectionIds: Map<string, number[]>}} tables - seat tables (world/seats.js).
 * @param {any} prices - display prices (data/display-prices.js).
 * @param {{inSectionView: () => boolean, keyOf: (id: number) => string}} selection - section-first helpers (interaction/selection.js).
 * @returns {{show: (h: any, ev: {clientX: number, clientY: number}) => void, hide: () => void}} show positions and fills the card for pick result `h`; hide removes it.
 */
export function createHoverCard({ seatTier, seatRow, seatNumber, seatSection, seatPrice, sectionIds }, prices, { inSectionView, keyOf }) {
  const { fmtRange, isAvail, availIn, sectionRange, suitePrice, lotPrice, lotRange, LOT_NAME } = prices;
  const tip = document.getElementById('tip');
  /** The card markup for pick result `h`. */
  function tooltipFor(h) {
    if (h.type === 'seat' && !(inSectionView() && keyOf(h.id) === state.selKey)) {        // not inside the selected block yet: show the BLOCK and its price range
      const id = h.id, k = keyOf(id), n = availIn(sectionIds.get(k));
      return ticketCard(`${tiers[seatTier[id] - 1].name} tier`, `Section ${seatSection[id]}`, 'price range', fmtRange(sectionRange(k)), `${n} seats available. Click to pick this section first.`);
    }
    if (h.type === 'seat' && !isAvail(h.id)) { const id = h.id; return ticketCard(`${tiers[seatTier[id] - 1].name} tier · Section ${seatSection[id]}`, `Row ${seatRow[id]} · Seat ${seatNumber[id]}`, 'status', 'Not available', 'Pick a plain orange seat.'); }
    if (h.type === 'seat') { const id = h.id, k = keyOf(id); return ticketCard(`${tiers[seatTier[id] - 1].name} tier · Section ${seatSection[id]}`, `Row ${seatRow[id]} · Seat ${seatNumber[id]}`, 'per seat', `${CUR}${seatPrice[id]}`, `Block range ${fmtRange(sectionRange(k))}`); }
    if (h.type === 'suite') return ticketCard('VIP · Skybox', `Skybox ${h.u + 1}`, 'per seat', `${CUR}${suitePrice(h.u)}`, `${SUITE_SEATS} seats per suite`);
    return ticketCard(`Parking · ${LOT_NAME[h.lot]} lot`, `Row ${h.row + 1}`, 'per day', `${CUR}${lotPrice(h.lot, h.row)}`, `Lot range ${fmtRange(lotRange(h.lot))}`);
  }
  /** Fill the card for pick result `h` and place it next to the pointer (16 px right and below, kept inside the window). */
  function show(h, ev) {
    tip.innerHTML = tooltipFor(h); tip.style.display = 'block';
    tip.style.left = Math.min(ev.clientX + 16, innerWidth - 330) + 'px'; tip.style.top = Math.min(ev.clientY + 16, innerHeight - 90) + 'px';
  }
  /** Hide the card. */
  function hide() { tip.style.display = 'none'; }
  return { show, hide };
}
