// @ts-check
/**
 * @fileoverview data/bowl-math: plan-shape maths of the bowl (superellipse points, arc-length tables, theta <-> arc length).
 *
 * WHY: the seat layout, the facade, the roads and the picking code all need the same plan maths; it has no three.js dependency so it can be reused anywhere.
 * BUILDS: nothing (pure functions plus an arc-length table cache).
 * DEPENDS ON: config/constants.js (EXP, A0, B0, TAU).
 * USED BY: data/seat-layout.js, core/geometry.js, world/*, src/main.js.
 * LIFECYCLE: arcTable() caches by offset d for the life of the page; arcAt() returns ONE reused object (copy values out before the next call).
 * UNITS / CONVENTIONS: metres, y up, angles in radians; plan coordinates are (x, z) with the pitch centre at the origin. theta is the superellipse parameter, not the polar angle (a constant-theta line is straight).
 * NOT HERE: building meshes (core/geometry.js).
 */
import { EXP, A0, B0, TAU } from '../config/constants.js';

export const sgnPow = (v, p) => Math.sign(v) * Math.pow(Math.abs(v), p);
export function shapePoint(theta, d, out) {
  out[0] = sgnPow(Math.cos(theta), 2 / EXP) * (A0 + d);
  out[1] = sgnPow(Math.sin(theta), 2 / EXP) * (B0 + d);
  return out;
}

// arc-length table so seats are spaced evenly along any offset curve
const arcCache = new Map();
export function arcTable(d) {
  const key = d.toFixed(3);
  let t = arcCache.get(key);
  if (t) return t;
  const M = 2048, xs = new Float32Array(M + 1), zs = new Float32Array(M + 1), s = new Float32Array(M + 1), p = [0, 0];
  for (let i = 0; i <= M; i++) {
    shapePoint(i / M * TAU, d, p); xs[i] = p[0]; zs[i] = p[1];
    if (i) s[i] = s[i - 1] + Math.hypot(xs[i] - xs[i - 1], zs[i] - zs[i - 1]);
  }
  t = { xs, zs, s, L: s[M], M };
  arcCache.set(key, t);
  return t;
}
const arcRes = { x: 0, z: 0, tx: 0, tz: 0 };
export function arcAt(t, frac) {
  const target = frac * t.L;
  let lo = 0, hi = t.M;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (t.s[mid] <= target) lo = mid; else hi = mid; }
  const seg = (t.s[hi] - t.s[lo]) || 1, u = (target - t.s[lo]) / seg;
  arcRes.x = t.xs[lo] + (t.xs[hi] - t.xs[lo]) * u;
  arcRes.z = t.zs[lo] + (t.zs[hi] - t.zs[lo]) * u;
  arcRes.tx = (t.xs[hi] - t.xs[lo]) / seg;
  arcRes.tz = (t.zs[hi] - t.zs[lo]) / seg;
  return arcRes;
}

// theta <-> arc length on one offset curve. A line of constant theta is a STRAIGHT line in plan (shapePoint is linear in d), so section
// edges / aisles placed at fixed theta run perfectly straight from the first row to the last (placing them at a fixed fraction of each
// row's own length made them wander sideways from row to row).
export function sAtTheta(t, th) { const g = th / TAU * t.M, i = Math.min(t.M - 1, Math.floor(g)), u = g - i; return t.s[i] + (t.s[i + 1] - t.s[i]) * u; }
export function thetaAtS(t, sv) {
  let lo = 0, hi = t.M;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (t.s[mid] <= sv) lo = mid; else hi = mid; }
  const seg = (t.s[hi] - t.s[lo]) || 1;
  return (lo + (sv - t.s[lo]) / seg) / t.M * TAU;
}
