// @ts-check
/**
 * @fileoverview interaction/picking: createPicker: turns a screen position into what is under it: a seat, a skybox or a parking lot (or nothing).
 *
 * WHY: picking a single seat out of 78,397 instances by raycasting the InstancedMesh would test every instance. Instead the ray hits the cheap terrace meshes (and the glass of the skyboxes),
 *      and the hit POINT is matched to the nearest seat through the spatial grid (3 x 3 cells of CELL metres, nearest seat centre within 1.1 m).
 *      The picker only reports; the section-first rule is applied by the callers (hover.js, input.js).
 * BUILDS: nothing (one Raycaster and one Vector2 are reused for every call).
 * DEPENDS ON: three, config/constants.js, data/seat-layout.js (CELL, gkey).
 * USED BY: src/main.js (creates it), src/interaction/input.js.
 * LIFECYCLE: created once after the world exists; no listeners; reads innerWidth / innerHeight on every call (the canvas fills the window).
 * UNITS / CONVENTIONS: clientX / clientY in CSS pixels; metres; "d" = offset distance of a plan point from the bowl edge (found by bisection on the superellipse); lot = 'E' | 'S' | 'W' | 'N'.
 *                      Parking is NOT selectable (removed on request): the parking mesh is not in the pick list, the lot branch is kept only because the hover code and window.__stadium.selectLot still support lots.
 * NOT HERE: hover / selection reactions (hover.js, selection.js), the pointer events (input.js).
 */
import * as THREE from 'three';
import { EXP, A0, B0, GLASS_D, FASCIA_TOP, BACK_D, FACADE_D } from '../config/constants.js';
import { CELL, gkey } from '../data/seat-layout.js';

/** Offset distance d of a plan point from the bowl edge (bisection on the superellipse). */
function dOf(x, z) {
  let lo = -20, hi = 260;
  for (let i = 0; i < 28; i++) { const m = (lo + hi) / 2, v = Math.pow(Math.abs(x) / (A0 + m), EXP) + Math.pow(Math.abs(z) / (B0 + m), EXP); if (v > 1) lo = m; else hi = m; }
  return (lo + hi) / 2;
}
/** Parking lot letter of a plan point (same quarter rule as the lots in world/parking.js). */
const lotOf = (x, z, d) => { const ax = Math.abs(x) / (A0 + d), az = Math.abs(z) / (B0 + d); return az >= ax ? (z > 0 ? 'S' : 'N') : (x > 0 ? 'E' : 'W'); };
/** Row (0 = closest to the gate) of a parking point from its offset distance. */
const rowOfD = d => { const o = d - FACADE_D; return o < 35.3 ? 0 : o < 42.7 ? 1 : o < 50 ? 2 : 3; };

/**
 * Create the picker.
 * @param {{camera: any}} ctx - shared context (core/ctx.js).
 * @param {{terraces: any[], glassMesh: any, parkingMesh: any, grid: Map<string, number[]>, seatPos: any, suites: any[]}} src - terrace meshes (world/terraces.js), glass (world/skyboxes.js), parking mesh, seat grid and positions (world/seats.js), suite list.
 * @returns {{pick: (clientX: number, clientY: number) => ({type: 'suite', u: number} | {type: 'lot', lot: string, row: number} | {type: 'seat', id: number} | null)}} the picker.
 */
export function createPicker({ camera }, { terraces, glassMesh, parkingMesh, grid, seatPos, suites }) {
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const PICK = [...terraces, glassMesh];                          // parking is NOT selectable (removed on request); its prices stay in the list
  const nearestSuite = (x, z) => { let b = 0, bd = Infinity; suites.forEach((s, u) => { const dd = (s.x - x) ** 2 + (s.z - z) ** 2; if (dd < bd) { bd = dd; b = u; } }); return b; };
  /** What is at this screen position? null when the ray hits nothing pickable. */
  function pick(clientX, clientY) {
    ndc.set(clientX / innerWidth * 2 - 1, -(clientY / innerHeight) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(PICK, false)[0];
    if (!hit) return null;
    const { x, y: hy, z } = hit.point;
    if (hit.object === glassMesh) return { type: 'suite', u: nearestSuite(x, z) };
    const d = dOf(x, z);
    if (hit.object === parkingMesh) { const lot = lotOf(x, z, d), rw = rowOfD(d); return { type: 'lot', lot, row: rw }; }
    if (hit.object === terraces[1] && d >= GLASS_D - 0.4 && d <= BACK_D + 0.1 && hy > FASCIA_TOP - 0.5) return { type: 'suite', u: nearestSuite(x, z) };
    const cx = Math.floor(x / CELL), cz = Math.floor(z / CELL);
    let best = -1, bd = 1.2;
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
      const arr = grid.get(gkey(cx + i, cz + j)); if (!arr) continue;
      for (const id of arr) {
        const dx = seatPos[id * 3] - x, dy = seatPos[id * 3 + 1] + 0.4 - hy, dz = seatPos[id * 3 + 2] - z, dd = dx * dx + dy * dy + dz * dz;
        if (dd < bd) { bd = dd; best = id; }
      }
    }
    return best >= 0 ? { type: 'seat', id: best } : null;
  }
  return { pick };
}
