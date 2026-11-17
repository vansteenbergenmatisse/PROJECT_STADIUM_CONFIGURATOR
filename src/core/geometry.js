// @ts-check
/**
 * @fileoverview core/geometry: two shared mesh helpers: ringStrip (extrude a profile round the bowl) and paintGeo (flat vertex colours).
 *
 * WHY: the terraces, facade, roof, gates, parking and fence all extrude (d, y) profiles round the same bowl; paintGeo is used by the pitch props, the trees and the seat parts.
 * BUILDS: nothing by itself; both functions return new geometry / meshes for the caller to add.
 * DEPENDS ON: three, data/bowl-math.js, config/constants.js.
 * USED BY: world/* builders, src/world/markers.js (lot highlight strips).
 * LIFECYCLE: pure functions; the caller owns and adds the result.
 * UNITS / CONVENTIONS: metres, y up, angles in radians; plan coordinates are (x, z) with the pitch centre at the origin. uv: u runs round the ring, v along the profile.
 * NOT HERE: material creation (core/materials.js).
 */
import * as THREE from 'three';
import { shapePoint } from '../data/bowl-math.js';
import { TAU } from '../config/constants.js';

// Extrude a (d, y) profile around the whole bowl. Each profile segment gets its own vertices (flat across, smooth along).
export function ringStrip(profile, material, { N = 480, cast = true, receive = true, t0 = 0, t1 = TAU, cumV = false } = {}) {
  const p = [0, 0];
  const rings = profile.map(pt => {
    const a = new Float32Array((N + 1) * 3);
    for (let j = 0; j <= N; j++) { shapePoint(t0 + (t1 - t0) * j / N, pt.d, p); a[j * 3] = p[0]; a[j * 3 + 1] = pt.y; a[j * 3 + 2] = p[1]; }
    return a;
  });
  const cum = [0]; for (let k = 1; k < profile.length; k++) cum.push(cum[k - 1] + Math.hypot(profile[k].d - profile[k - 1].d, profile[k].y - profile[k - 1].y));
  const total = cum[cum.length - 1] || 1;
  const pos = [], uv = [], idx = []; let base = 0;
  for (let k = 0; k < profile.length - 1; k++) {
    if (Math.abs(profile[k].d - profile[k + 1].d) < 1e-6 && Math.abs(profile[k].y - profile[k + 1].y) < 1e-6) continue;
    for (const v of rings[k]) pos.push(v);
    for (const v of rings[k + 1]) pos.push(v);
    // uv: u runs round the ring; v is the cumulative profile length (cumV) or 0..1 per segment (flipped on risers so v=0 is always the top edge)
    let va = cumV ? cum[k] / total : 0, vb = cumV ? cum[k + 1] / total : 1;
    if (!cumV && Math.abs(profile[k].d - profile[k + 1].d) < 1e-6) { va = 1; vb = 0; }
    for (let j = 0; j <= N; j++) uv.push(j / N, va);
    for (let j = 0; j <= N; j++) uv.push(j / N, vb);
    for (let j = 0; j < N; j++) {
      const a = base + j, b = a + 1, c = base + N + 1 + j, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
    base += 2 * (N + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, material);
  m.castShadow = cast; m.receiveShadow = receive;
  return m;
}

/* ---- vertex colours: paint every vertex of a geometry one flat colour and drop its uv. mergeGeometries needs all parts indexed or all non-indexed, so callers pass toNonIndexed() geometry. ---- */
export function paintGeo(g, r, gr, b) {
  const n = g.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = r; a[i * 3 + 1] = gr; a[i * 3 + 2] = b; }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3)); g.deleteAttribute('uv'); return g;
}
