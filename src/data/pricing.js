// @ts-check
/**
 * @fileoverview data/pricing: the seat price model (category / zone pricing) as pure functions and constants.
 *
 * WHY: prices are data, not scene code: the seat fill, the hover cards, the panel and the checkout all use the same formulas (docs/book/03-pricing.md).
 * BUILDS: nothing.
 * DEPENDS ON: config/constants.js.
 * USED BY: world/seats.js (seatPriceOf), src/data/display-prices.js, src/ui/price-panel.js, src/ui/checkout.js.
 * LIFECYCLE: pure; no state.
 * UNITS / CONVENTIONS: prices in euros, rounded to 5 for seats and 10 for suites; DEMAND is a per-fixture multiplier slot.
 * NOT HERE: availability, ranges and parking prices (they read the seat tables: src/data/display-prices.js).
 */
import { tiers, RUN, B0, EXP, PITCH_L } from '../config/constants.js';

export const CUR = '€';
export const DEMAND = 1.0;                  // DEMAND = per-fixture multiplier slot (match category A/B/C or live demand)
export const TIER_BASE = [95, 62, 38];                 // Lower / Middle / Upper
export const SUITE_BASE = 420;
export const SUITE_SEATS = 10;       // skybox: price per seat, sold as a suite
export const round5 = v => Math.round(v / 5) * 5;
export function zoneFactors(x, z, d) {                 // long-side centre = best view, behind the goals = cheapest
  const lf = Math.pow(Math.abs(z) / (B0 + d), EXP);                      // 1 on the long sides, 0 behind the goals
  const c = 1 - Math.min(1, Math.abs(x) / (PITCH_L / 2 + 20));           // 1 at the halfway line, 0 past the penalty areas
  return { zone: 0.80 + 0.42 * lf, centre: 1 + 0.30 * lf * c };
}
export function seatPriceParts(ti, r, x, z) {
  const t = tiers[ti], d = t.d0 + r * RUN + RUN / 2, f = zoneFactors(x, z, d);
  return { base: TIER_BASE[ti], zone: f.zone, centre: f.centre, row: 1 + 0.14 * (1 - r / (t.rows - 1)) };   // front rows +14%
}
export function seatPriceOf(ti, r, x, z) { const p = seatPriceParts(ti, r, x, z); return round5(p.base * p.zone * p.centre * p.row * DEMAND); }
