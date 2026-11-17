// @ts-check
/**
 * @fileoverview core/rng: the ONE shared seeded random generator and the deterministic sin hash.
 *
 * WHY: the scene is built from a seeded generator whose draws must stay in a fixed order (meadow, plaza, pitch, concrete, facade, shops, trees); a single shared instance exported from here, consumed by builders called in the original order, keeps every texture and tree identical to before.
 * BUILDS: nothing.
 * DEPENDS ON: nothing.
 * USED BY: core/ctx.js (ctx.rand), world/parking.js and world/matchday.js (own rng(seed) instances), world/seats.js (hash).
 * LIFECYCLE: the instance is created at import time but NO draw happens at import; draws happen only inside the builders, called from src/main.js in the original order. The unseeded Math.random() used by the match and the order id is elsewhere and untouched.
 * UNITS / CONVENTIONS: rand() returns a float in [0, 1).
 * NOT HERE: any new draw: adding or dropping one shifts everything built after it.
 */
export function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
/** The shared generator (seed 20260). */
export const rand = rng(20260);
/** Deterministic sin hash (not the seeded generator). */
export const hash = (a, b) => { const h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return h - Math.floor(h); };
