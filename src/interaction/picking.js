// @ts-check
/**
 * @fileoverview interaction/picking: createPicker: turns a screen position into what is under it: a seat, a skybox or a parking lot (or nothing).
 *
 * WHY: picking a single seat out of 78,397 instances by raycasting the InstancedMesh would test every instance. Instead the ray hits the cheap terrace meshes (and the glass of the skyboxes),
 *      and the hit POINT is matched to the nearest seat through the spatial grid (3 x 3 cells of CELL metres, nearest seat centre within 1.1 m).
 *      The picker only reports; the section-first rule is applied by the callers (hover.js, input.js).
 *      SPEED: the terrace and glass rings hold about 140,000 triangles; three's default Mesh.raycast tests every one of them on every pick. The picker therefore builds ONCE a two level box hierarchy over the
 *      triangle order of each pick mesh (leaf = 16 triangles, group = 32 leaves) and only hands the surviving triangle runs to the ORIGINAL Mesh.raycast (through geometry.drawRange), so the triangle test,
 *      the hit distance and the hit point are exactly the ones three computes; ties keep the lowest triangle index and the earliest mesh of the pick list, as intersectObjects does.
 * BUILDS: nothing visible (one Raycaster, one Vector2 and the box hierarchy of the pick meshes are created once and reused for every call).
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

/* ---- ray acceleration: exact triangle culling by boxes (see SPEED in the header) ---- */
const LEAF = 16, GROUP = 32, PAD = 0.01;                                   // triangles per leaf, leaves per group, box padding in metres (the box test is only a conservative filter)
const _inv = new THREE.Matrix4(), _lray = new THREE.Ray(), _box = new THREE.Box3(), _hits = [];

/** Build the leaf and group boxes of an indexed mesh (min/max triples in local space). Returns null when the mesh is not indexed (then the default raycast is used). */
function buildBoxes(mesh) {
  const g = mesh.geometry, index = g.index, pos = g.attributes.position; if (!index) return null;
  const tris = index.count / 3, nLeaf = Math.ceil(tris / LEAF), nGroup = Math.ceil(nLeaf / GROUP);
  const leaf = new Float32Array(nLeaf * 6), group = new Float32Array(nGroup * 6);
  for (let l = 0; l < nLeaf; l++) {
    let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
    const t1 = Math.min(tris, (l + 1) * LEAF);
    for (let i = l * LEAF * 3; i < t1 * 3; i++) {
      const v = index.getX(i), x = pos.getX(v), y = pos.getY(v), z = pos.getZ(v);
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; if (z < z0) z0 = z; if (z > z1) z1 = z;
    }
    leaf.set([x0 - PAD, y0 - PAD, z0 - PAD, x1 + PAD, y1 + PAD, z1 + PAD], l * 6);
  }
  for (let q = 0; q < nGroup; q++) {
    const b = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
    for (let l = q * GROUP; l < Math.min(nLeaf, (q + 1) * GROUP); l++) for (let k = 0; k < 3; k++) { b[k] = Math.min(b[k], leaf[l * 6 + k]); b[k + 3] = Math.max(b[k + 3], leaf[l * 6 + k + 3]); }
    group.set(b, q * 6);
  }
  return { leaf, group, nLeaf, tris };
}
/** Does the local ray touch box number i of the flat array? */
function hitBox(arr, i) { _box.min.set(arr[i * 6], arr[i * 6 + 1], arr[i * 6 + 2]); _box.max.set(arr[i * 6 + 3], arr[i * 6 + 4], arr[i * 6 + 5]); return _lray.intersectsBox(_box); }
/**
 * Nearest hit of `ray` against one mesh, equal to Mesh.raycast + sort: the box hierarchy only decides which triangle runs are tested.
 * Returns {distance, point, object} or null. Restores geometry.drawRange.
 */
function nearestHit(ray, mesh, acc) {
  if (!mesh.layers.test(ray.layers)) return null;
  if (!acc) { _hits.length = 0; mesh.raycast(ray, _hits); _hits.sort((a, b) => a.distance - b.distance); return _hits[0] || null; }
  _inv.copy(mesh.matrixWorld).invert(); _lray.copy(ray.ray).applyMatrix4(_inv);
  const dr = mesh.geometry.drawRange, s0 = dr.start, c0 = dr.count;          // the page never sets a draw range on these meshes; restored anyway
  let best = null, runStart = -1;
  const flush = end => {                                                      // test the triangles of leaves [runStart, end) with the original raycast
    dr.start = runStart * LEAF * 3; dr.count = (Math.min(acc.tris, end * LEAF) - runStart * LEAF) * 3;
    _hits.length = 0; mesh.raycast(ray, _hits);
    for (const h of _hits) if (!best || h.distance < best.distance) best = h;   // strict <: the first (lowest triangle index) wins a tie, as the stable sort in intersectObjects
    runStart = -1;
  };
  for (let q = 0, nGroup = acc.group.length / 6; q < nGroup; q++) {
    const l0 = q * GROUP, l1 = Math.min(acc.nLeaf, l0 + GROUP);
    if (!hitBox(acc.group, q)) { if (runStart >= 0) flush(l0); continue; }
    for (let l = l0; l < l1; l++) {
      if (hitBox(acc.leaf, l)) { if (runStart < 0) runStart = l; } else if (runStart >= 0) flush(l);
    }
  }
  if (runStart >= 0) flush(acc.nLeaf);
  dr.start = s0; dr.count = c0;
  return best;
}

/**
 * Create the picker.
 * @param {{camera: any}} ctx - shared context (core/ctx.js).
 * @param {{terraces: any[], glassMesh: any, parkingMesh: any, grid: Map<string, number[]>, seatPos: any, suites: any[]}} src - terrace meshes (world/terraces.js), glass (world/skyboxes.js), parking mesh, seat grid and positions (world/seats.js), suite list.
 * @returns {{pick: (clientX: number, clientY: number) => ({type: 'suite', u: number} | {type: 'lot', lot: string, row: number} | {type: 'seat', id: number} | null)}} the picker.
 */
export function createPicker({ camera }, { terraces, glassMesh, parkingMesh, grid, seatPos, suites }) {
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const PICK = [...terraces, glassMesh];                          // parking is NOT selectable (removed on request); its prices stay in the list
  const ACC = PICK.map(buildBoxes);                                  // one box hierarchy per pick mesh, built once
  const nearestSuite = (x, z) => { let b = 0, bd = Infinity; suites.forEach((s, u) => { const dd = (s.x - x) ** 2 + (s.z - z) ** 2; if (dd < bd) { bd = dd; b = u; } }); return b; };
  /** What is at this screen position? null when the ray hits nothing pickable. */
  function pick(clientX, clientY) {
    ndc.set(clientX / innerWidth * 2 - 1, -(clientY / innerHeight) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    let hit = null;                                                   // nearest over the pick list; strict < keeps the earlier mesh on a tie (as intersectObjects)
    for (let k = 0; k < PICK.length; k++) { const h = nearestHit(ray, PICK[k], ACC[k]); if (h && (!hit || h.distance < hit.distance)) hit = h; }
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
