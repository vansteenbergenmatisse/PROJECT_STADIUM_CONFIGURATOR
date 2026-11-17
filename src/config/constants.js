// @ts-check
/**
 * @fileoverview config/constants: every fixed number that shapes the bowl, the stand layout and the park ring.
 *
 * WHY: the bowl numbers were top-level constants of the one big script and are read by almost every builder; one module keeps a single source of truth.
 * BUILDS: nothing (pure data). It computes the stand layout (tiers[].d0 / y0, T1_END_D .. FACADE_TOP) once, at import time.
 * DEPENDS ON: nothing.
 * USED BY: data/bowl-math.js, data/pricing.js, data/seat-layout.js, core/geometry.js and every world/* builder, src/main.js.
 * LIFECYCLE: evaluated once on import; tiers[] gets its d0 / y0 fields added there and is never changed afterwards.
 * UNITS / CONVENTIONS: metres, y up, angles in radians; plan coordinates are (x, z) with the pitch centre at the origin. d = distance outwards from the inner edge of the bowl (m); y = height above the meadow (m).
 * NOT HERE: colours and per-feature tuning numbers stay in the builder that owns them.
 */

/* ---- bowl plan: superellipse |x/a|^n + |z/b|^n = 1, offset outwards by d (see data/bowl-math.js) ---- */
export const EXP = 2.4, A0 = 72, B0 = 52;          // half extents of the inner edge (metres)
export const PITCH_L = 105, PITCH_W = 68;
export const TAU = Math.PI * 2;
export const RUN = 0.85;
export const SKY_DEPTH_FRONT = 2;     // walkway in front of the skyboxes
export const BOX_H = 3.4, BOX_DEPTH = 5;
export const tiers = [
  { name: 'Lower',  rows: 24, rise: 0.42, sections: 28, blue: 0.07 },
  { name: 'Middle', rows: 20, rise: 0.50, sections: 28, blue: 0.10 },
  { name: 'Upper',  rows: 26, rise: 0.62, sections: 28, blue: 0.16 },
];
let d = 0, y = 1.5;
tiers[0].d0 = d; tiers[0].y0 = y;
d += tiers[0].rows * RUN; y += tiers[0].rows * tiers[0].rise;       // end of tier 1
export const T1_END_D = d, Y1 = y;
export const GLASS_D = T1_END_D + SKY_DEPTH_FRONT;
export const BOX_TOP = Y1 + BOX_H, FASCIA_TOP = Y1 + 4.9;
export const BACK_D = GLASS_D + BOX_DEPTH;
tiers[1].d0 = BACK_D; tiers[1].y0 = FASCIA_TOP;
d = BACK_D + tiers[1].rows * RUN; y = FASCIA_TOP + tiers[1].rows * tiers[1].rise;
export const T2_END_D = d, Y2 = y;
export const WALK2 = 4;
tiers[2].d0 = T2_END_D + WALK2; tiers[2].y0 = Y2 + 0.9;
d = tiers[2].d0 + tiers[2].rows * RUN; y = tiers[2].y0 + tiers[2].rows * tiers[2].rise;
export const T3_END_D = d, Y3 = y;
export const FACADE_D = T3_END_D + 2.6;
export const ROOF_OUT = { d: FACADE_D + 4, y: Y3 + 13 }, ROOF_IN = { d: tiers[2].d0 - 2, y: Y3 - 1.5 };
export const FACADE_TOP = ROOF_OUT.y;

/* ---- gate angles: the 4 entrances sit on these plan angles (theta, radians) where the access roads arrive; exits sit halfway between them ---- */
export const ACCESS_ANGLES = [0.35, 1.9, 3.45, 5.0];

/* ---- seat spacing (m): SEAT_PITCH along a row, AISLE_HALF = half the free aisle at each section edge ---- */
export const SEAT_PITCH = 0.52, AISLE_HALF = 0.85;

/* Heights (batch 25): the road and the lot used to sit only 0.18-0.26 m above the meadow, so they z-fought with it (and with each other) from the top view. Now: meadow 0, plaza 0.15,
   lot surface 0.38, painted markings 0.41, road verge 0.46, tarmac 0.56, dashed centre line 0.58. Everything standing on them (cars, fence, signs, fans) uses these constants. */
export const Y_LOT = 0.38, Y_MARK = 0.41, Y_PATH = 0.46, Y_ROAD = 0.56, Y_DASH = 0.58;
export const PARK_IN = FACADE_D + 26, PARK_OUT = FACADE_D + 60;       // parking ring around the plaza (metres from the bowl edge)
export const LOOP_RX = 305, LOOP_RZ = 268;
