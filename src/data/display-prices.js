// @ts-check
/**
 * @fileoverview data/display-prices: createDisplayPrices: the display side of prices: availability rule, price ranges, skybox and parking prices, formatters.
 *
 * WHY: the hover card, the selection panel, the checkout and window.__stadium all need the same ranges and the same availability rule. They read the typed seat tables, so
 *      this is a factory over those tables (the pure price formulas stay in data/pricing.js). Everything here is computed once at boot except the per-section range cache.
 * BUILDS: nothing in the scene.
 * DEPENDS ON: config/constants.js, data/pricing.js.
 * USED BY: src/main.js (creates it), src/ui/price-panel.js, src/ui/hover-card.js, src/ui/checkout.js, src/debug/expose.js (tierRange).
 * LIFECYCLE: created once after the seats and skyboxes exist; holds a Map cache of section price ranges (filled lazily, never invalidated: prices do not change at runtime).
 * UNITS / CONVENTIONS: prices in euros (CUR); a range is [lowest, highest] over AVAILABLE seats; parking is per day: LOT_BASE x row factor, rounded to whole euros.
 * NOT HERE: the price formulas (data/pricing.js), the seat tables (world/seats.js), parking geometry (src/interaction/picking.js lotOf / rowOfD).
 */
import { GLASS_D, BOX_DEPTH } from '../config/constants.js';
import { CUR, DEMAND, SUITE_BASE, zoneFactors } from './pricing.js';

/**
 * Build the display-price helpers over the seat tables.
 * @param {{seatCount: number, seatTier: any, seatCode: any, seatPrice: any, sectionIds: Map<string, number[]>, suites: any[]}} src - seat tables from world/seats.js and the suite list from world/skyboxes.js.
 * @returns {object} { fmtRange, rangeOf, isAvail, availIn, tierRange, sectionRange, suitePrice, suiteRangeAll, lotPrice, lotRange, parkRangeAll, LOT_NAME }
 */
export function createDisplayPrices({ seatCount, seatTier, seatCode, seatPrice, sectionIds, suites }) {
  /** "€a" when both ends are equal, else "€a–€b" (en dash). */
  const fmtRange = ([a, b]) => a === b ? `${CUR}${a}` : `${CUR}${a}–${CUR}${b}`;
  /** [lowest, highest] seat price over `ids`, optionally only those passing `pred`. */
  const rangeOf = (ids, pred) => { let lo = Infinity, hi = 0; for (const i of ids) { if (pred && !pred(i)) continue; const p = seatPrice[i]; if (p < lo) lo = p; if (p > hi) hi = p; } return [lo, hi]; };
  /* AVAILABILITY (a made-up rule, not real inventory): only the plain-orange seats (colour code 0) can be bought. The seats with a different colour (light orange = code 1, pale gold lattice = code 2) are NOT available:
     they cannot be hovered, picked or added to a cart, and section counts / price ranges only use available seats. */
  const isAvail = i => seatCode[i] === 0;
  const availIn = ids => { let n = 0; for (const i of ids) if (isAvail(i)) n++; return n; };
  const tierRange = [0, 1, 2].map(ti => { let lo = Infinity, hi = 0; for (let i = 0; i < seatCount; i++) if (seatTier[i] === ti + 1 && isAvail(i)) { const p = seatPrice[i]; if (p < lo) lo = p; if (p > hi) hi = p; } return [lo, hi]; });
  const secRangeCache = new Map();
  const sectionRange = key => { let r = secRangeCache.get(key); if (!r) secRangeCache.set(key, r = rangeOf(sectionIds.get(key), isAvail)); return r; };
  const suiteD = GLASS_D + BOX_DEPTH / 2;
  const suitePrice = u => { const s = suites[u], f = zoneFactors(s.x, s.z, suiteD); return Math.round(SUITE_BASE * f.zone * f.centre * DEMAND / 10) * 10; };   // per seat
  const suiteRangeAll = (() => { let lo = Infinity, hi = 0; for (let u = 0; u < suites.length; u++) { const p = suitePrice(u); lo = Math.min(lo, p); hi = Math.max(hi, p); } return [lo, hi]; })();
  const LOT_BASE = { N: 40, S: 32, E: 22, W: 22 }, LOT_ROW = [1.25, 1.1, 1.0, 0.9];       // parking per day: lot × distance-to-gate row
  const lotPrice = (lot, row) => Math.round(LOT_BASE[lot] * LOT_ROW[row]);
  const lotRange = lot => [lotPrice(lot, 3), lotPrice(lot, 0)];
  const parkRangeAll = [lotPrice('E', 3), lotPrice('N', 0)];
  const LOT_NAME = { N: 'North', S: 'South', E: 'East', W: 'West' };
  return { fmtRange, rangeOf, isAvail, availIn, tierRange, sectionRange, suitePrice, suiteRangeAll, lotPrice, lotRange, parkRangeAll, LOT_NAME };
}
