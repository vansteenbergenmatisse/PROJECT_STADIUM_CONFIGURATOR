// @ts-check
/**
 * @fileoverview ui/price-panel: createPricePanel: renders the selection panel (#panel / #selection) for the current navigation level, and applies the roof fade and the match switch that go with it.
 *
 * WHY: the panel is the only place with prices besides the hover card (the generic price list is hidden on request). renderSelection() is called after every navigation change, so it is also where the
 *      two level-dependent side effects live: the roof drops to 40% only at the section level, and the 11 v 11 match runs only at the seat level.
 * BUILDS: DOM only (innerHTML of #selection and the hidden #legend). All markup is made from our own numbers and tier names (no user-typed value), see the UNITS note.
 * DEPENDS ON: config/constants.js (tiers), data/pricing.js (CUR, SUITE_SEATS, seatPriceParts), src/state/state.js, src/ui/ticket-card.js.
 * USED BY: src/main.js (creates it), src/interaction/selection.js (renderSelection after every change), src/interaction/input.js (the panel click wiring uses `panel`).
 * LIFECYCLE: created once at boot (it also fills the hidden legend); renderSelection is called synchronously by the navigation functions. No listeners here.
 * UNITS / CONVENTIONS: prices in euros; classes d-only / m-only show desktop / phone wording; "opt" marks text the phone bar hides; data-act="buy" | "back" | "suite-eye" are the panel buttons (handled in input.js).
 * NOT HERE: the demo checkout (src/ui/checkout.js), the hover card (src/ui/hover-card.js), the fold button (src/ui/fold-buttons.js), the price rules (src/data/display-prices.js).
 */
import { tiers } from '../config/constants.js';
import { CUR, SUITE_SEATS, seatPriceParts } from '../data/pricing.js';
import { state } from '../state/state.js';
import { ticketCard } from './ticket-card.js';

/**
 * Create the panel renderer and fill the (hidden) legend.
 * @param {{seatTier: any, seatRow: any, seatNumber: any, seatPos: any, seatPrice: any, sectionIds: Map<string, number[]>}} tables - seat tables (world/seats.js).
 * @param {any} prices - display prices (data/display-prices.js).
 * @param {{setRoofFade: (on: boolean) => void}} roofControl - interaction/roof-control.js.
 * @param {{active: boolean}} match - the match handle (sim/match.js); `active` is switched here.
 * @returns {{renderSelection: () => void, panel: HTMLElement}} renderSelection redraws the panel; panel is the #panel element (for the click wiring).
 */
export function createPricePanel({ seatTier, seatRow, seatNumber, seatPos, seatPrice, sectionIds }, prices, { setRoofFade }, match) {
  const { fmtRange, rangeOf, isAvail, availIn, tierRange, sectionRange, suitePrice, suiteRangeAll, lotPrice, lotRange, parkRangeAll, LOT_NAME } = prices;
  const nav = state.nav;
  const legEl = document.getElementById('legend'), selEl = document.getElementById('selection'), panel = document.getElementById('panel');
  const row = (k, v) => `<div class="row"><span>${k}</span><b>${v}</b></div>`;
  legEl.hidden = true;                                                   // the generic price list is hidden: prices show only over a section / seat (hover card + selection panel)
  legEl.innerHTML = [
    ...tiers.map((t, i) => row(`${t.name} tier`, fmtRange(tierRange[i]))),
    row('Skyboxes · per seat', fmtRange(suiteRangeAll)),
    row('Parking · per day', fmtRange(parkRangeAll)),
  ].join('');
  /** The price formula of one seat as text (base x view zone x centre x row). */
  function breakdown(id) {
    const ti = seatTier[id] - 1, r = seatRow[id] - 1, p = seatPriceParts(ti, r, seatPos[id * 3], seatPos[id * 3 + 2]);
    return `base ${CUR}${p.base} × view zone ${p.zone.toFixed(2)} × centre ${p.centre.toFixed(2)} × row ${p.row.toFixed(2)}`;
  }
  /** Redraw the panel for nav.level and apply the roof fade and the match switch. */
  function renderSelection() {
    panel.classList.toggle('has-sel', nav.level !== 'overview');
    panel.classList.toggle('is-seat', nav.level === 'seat');            // phones: in the seat view the bar shows only the seat card and the buttons
    setRoofFade(nav.level === 'section');   // roof at 40% opacity only while a section is selected (to pick a seat); inside a seat the roof is drawn normally
    match.active = nav.level === 'seat';                           // the 11 v 11 game runs while a single seat is selected
    let h = '';
    if (nav.level === 'overview') h = `<p class="hint"><span class="d-only">Move over a section to see how many seats are available and the price range, then click it. Skyboxes work the same way.</span><span class="m-only">Tap a section to see how many seats are available and what they cost.</span></p>`;
    else if (nav.level === 'section' || nav.level === 'seat') {
      const [ti, s] = state.selKey.split(':').map(Number), ids = sectionIds.get(state.selKey), r = sectionRange(state.selKey);
      h += `<h3>${tiers[ti].name} tier · Section ${s + 1}</h3><div class="big">${fmtRange(r)}</div><p class="opt">${availIn(ids)} of ${ids.length} seats available. Price range for this section.</p>`;
      if (nav.level === 'seat') {
        const id = state.selSeat, rr = rangeOf(ids, i => isAvail(i) && seatRow[i] === seatRow[id]);
        h += `<div class="seat"><div class="tkwrap">${ticketCard(`${tiers[ti].name} tier · Section ${s + 1}`, `Row ${seatRow[id]} · Seat ${seatNumber[id]}`, 'per seat', `${CUR}${seatPrice[id]}`, `Row ${seatRow[id]} range ${fmtRange(rr)}`)}</div><p class="note opt">${breakdown(id)}</p><button class="btn btn--primary" data-act="buy">Buy ticket</button></div>`;
      }
      if (nav.level === 'section') h += '<p class="hint"><span class="d-only">Now pick a seat. The seat under your mouse turns <span class="dot"></span><b>magenta</b>.</span><span class="m-only">Now tap a seat.</span></p>';
      h += `<p class="opt">${tiers[ti].name} tier overall ${fmtRange(tierRange[ti])}</p><p class="note opt">Closer rows cost more. So does the centre of the long sides. Behind the goals is cheapest.</p>`;
    } else if (nav.level === 'suite') {
      const p = suitePrice(state.selSuite);
      h += `<div class="vip"><div class="vip-main"><span class="badge">VIP</span><b>Skybox ${state.selSuite + 1}</b><div class="vip-meta"><div><small>Seats</small><b>${SUITE_SEATS}</b></div><div><small>Entry</small><b>VIP</b></div></div></div>` +
        `<div class="vip-stub"><small>Per seat</small><i class="bar" aria-hidden="true"></i><em>${CUR}${p}</em></div></div><p class="opt">${SUITE_SEATS} seats · ${CUR}${(p * SUITE_SEATS).toLocaleString()} per suite</p><p class="opt">All skyboxes ${fmtRange(suiteRangeAll)} per seat</p><button class="btn btn--primary" data-act="buy">Buy skybox</button><button class="btn" data-act="suite-eye">View from this suite</button>`;
    } else if (nav.level === 'lot') {
      h += `<h3>Parking · ${LOT_NAME[state.selLot]} lot</h3><div class="big">${fmtRange(lotRange(state.selLot))} <small>per day</small></div>` +
        [0, 1, 2, 3].map(i => row(`Row ${i + 1}${i === 0 ? ' (closest)' : ''}`, `${CUR}${lotPrice(state.selLot, i)}`)).join('') +
        `<p class="opt">All lots ${fmtRange(parkRangeAll)}</p>`;
    }
    if (nav.level !== 'overview') h += '<button class="btn" data-act="back">Back</button>';
    selEl.innerHTML = h;
  }
  return { renderSelection, panel };
}
