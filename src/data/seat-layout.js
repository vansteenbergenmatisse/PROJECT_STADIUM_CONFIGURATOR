// @ts-check
/**
 * @fileoverview data/seat-layout: where every seat sits: forEachSeat walks all seats tier by tier, row by row, section by section.
 *
 * WHY: the seat count, the instance fill and the section structure all come from one walk; sections are bounded by fixed plan angles so every aisle is a straight line.
 * BUILDS: nothing (pure iteration + the spatial grid helpers).
 * DEPENDS ON: config/constants.js, data/bowl-math.js.
 * USED BY: world/seats.js, src/interaction/picking.js (CELL and gkey).
 * LIFECYCLE: forEachSeat is called twice by world/seats.js (count pass, fill pass) and must visit seats in the same order both times.
 * UNITS / CONVENTIONS: metres, y up, angles in radians; plan coordinates are (x, z) with the pitch centre at the origin. the callback gets (tier, row, section, number 1-based, x, y, z, inward nx, nz, fraction along the row, row length).
 * NOT HERE: colours, prices and the InstancedMesh (world/seats.js, data/pricing.js).
 */
import { tiers, RUN, SEAT_PITCH, AISLE_HALF, TAU } from '../config/constants.js';
import { arcTable, arcAt, sAtTheta, thetaAtS } from './bowl-math.js';

// iterate every seat position; used once to count and once to fill
export function forEachSeat(cb) {
  for (let ti = 0; ti < tiers.length; ti++) {
    const t = tiers[ti];
    // section edges = fixed plan angles (equal arc length on the middle row of the tier), so every aisle is a straight line from front to back
    const refTab = arcTable(t.d0 + t.rows * RUN * 0.5), edge = [];
    for (let s = 0; s < t.sections; s++) edge.push(thetaAtS(refTab, s / t.sections * refTab.L));
    edge.push(TAU);
    for (let r = 0; r < t.rows; r++) {
      const dc = t.d0 + r * RUN + RUN * 0.5, yr = t.y0 + r * t.rise;
      const tab = arcTable(dc);
      for (let s = 0; s < t.sections; s++) {
        const sA = sAtTheta(tab, edge[s]), sB = sAtTheta(tab, edge[s + 1]);
        const usable = sB - sA - 2 * AISLE_HALF, n = Math.floor(usable / SEAT_PITCH);     // aisle (half width) kept free at both section edges
        if (n < 1) continue;
        const step = usable / n;
        for (let k = 0; k < n; k++) {
          const f = (sA + AISLE_HALF + (k + 0.5) * step) / tab.L, a = arcAt(tab, f);
          let nx = -a.tz, nz = a.tx;                                         // inward normal
          if (nx * -a.x + nz * -a.z < 0) { nx = -nx; nz = -nz; }
          cb(ti, r, s, k + 1, a.x, yr, a.z, nx, nz, f, tab.L);
        }
      }
    }
  }
}

/* ---- spatial grid used by picking: seats are bucketed into CELL x CELL metre cells keyed by gkey ---- */
export const CELL = 3;
export const gkey = (cx, cz) => (cx + 1000) * 4000 + (cz + 1000);
