// @ts-check
/**
 * @fileoverview world/roads: the road network: one loop plus 4 access spurs.
 *
 * WHY: curves, road samples and the two distance helpers are shared by the parking, shops, fans and trees, so they are returned.
 * BUILDS: 2 ribbons per road (verge + tarmac), 4 caps x 2, dashed centre line InstancedMesh.
 * DEPENDS ON: three, config/constants.js, data/bowl-math.js, core/materials.js.
 * USED BY: src/main.js.
 * LIFECYCLE: roadSamples is later extended by the shops builder before the trees read it (ORDER MATTERS).
 * UNITS / CONVENTIONS: metres, y up, angles in radians; plan coordinates are (x, z) with the pitch centre at the origin. heights are the Y_* constants.
 * NOT HERE: parking (world/parking.js).
 */
import * as THREE from 'three';
import { TAU, A0, B0, EXP, ACCESS_ANGLES, PARK_IN, PARK_OUT, LOOP_RX, LOOP_RZ, Y_PATH, Y_ROAD, Y_DASH } from '../config/constants.js';
import { shapePoint } from '../data/bowl-math.js';
import { std, dbl } from '../core/materials.js';

/**
 * Build the loop road, the 4 access spurs with rounded caps, and the dashed centre lines.
 * Side effects: adds ribbons, caps and 1 InstancedMesh to ctx.scene.
 * @param {object} ctx - shared context (core/ctx.js): scene.
 * @returns {object} { curves, roadSamples, spurSamples, roadDist, outsideStadium }
 */
export function buildRoads(ctx) {
  const { scene } = ctx;
  /* ------------------------------------------------------------------ park: roads (loop + 4 spurs ending in rounded caps), dashes, parking ring (painted bays here, the 4 lots + 50 cars in the PARKING LOTS block; not selectable), shops, MATCHDAY LIFE, trees + forest. No houses (removed on request). */
  const loopPoint = a => new THREE.Vector3(
    Math.cos(a) * (LOOP_RX + 34 * Math.sin(a * 3 + 1) + 22 * Math.cos(a * 2)), 0,
    Math.sin(a) * (LOOP_RZ + 30 * Math.cos(a * 3) + 18 * Math.sin(a * 2 + 0.5)));
  const loopPts = []; for (let k = 0; k < 16; k++) loopPts.push(loopPoint(k / 16 * TAU));
  const curves = [new THREE.CatmullRomCurve3(loopPts, true, 'catmullrom', 0.5)];
  /* Access roads (batch 25 fix). Each spur leaves the loop with a gentle bend, then runs on the exact radial line of its gate angle (a constant-theta line is straight, see shapePoint)
     through the fence gate and the whole parking ring, and ends in a rounded cap at the plaza edge (PARK_IN + 0.5). The old version ended in the middle of the parked rows (44 m from the
     facade), so the tarmac stopped inside the bays. Colinear control points keep the Catmull-Rom curve straight over the lot, so lot markings can follow it exactly. */
  const radialPoint = (a, d) => { const q = shapePoint(a, d, [0, 0]); return new THREE.Vector3(q[0], 0, q[1]); };
  for (const a of ACCESS_ANGLES) {
    const s = loopPoint(a), far = radialPoint(a, PARK_OUT + 50), gate = radialPoint(a, PARK_OUT + 6), e = radialPoint(a, PARK_IN + 0.5), mid = s.clone().lerp(far, 0.5);
    mid.x += Math.sin(a * 5) * 14; mid.z += Math.cos(a * 5) * 14;
    curves.push(new THREE.CatmullRomCurve3([s, mid, far, gate, radialPoint(a, PARK_OUT - 12), e], false, 'catmullrom', 0.5));
  }
  const roadSamples = [];                                         // obstacle points for trees / shops (radius ~11 m)
  function ribbon(curve, w, yy, mat, samples = 420) {
    const pts = curve.getSpacedPoints(samples), pos = [], idx = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      let tx = b.x - a.x, tz = b.z - a.z; const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
      pos.push(pts[i].x - tz * w, yy, pts[i].z + tx * w, pts[i].x + tz * w, yy, pts[i].z - tx * w);
      if (i) { const k = (i - 1) * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat); m.receiveShadow = true; return m;
  }
  const pathMat = dbl(0xdedcd2, { roughness: 1, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  const roadMat = dbl(0x1d1c21, { roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
  for (const c of curves) {
    scene.add(ribbon(c, 6.2, Y_PATH, pathMat)); scene.add(ribbon(c, 4.6, Y_ROAD, roadMat));
    if (c !== curves[0]) {                                                    // access spurs end in a rounded cap inside the parking ring (no square cut-off); the tarmac ends there and the fans walk on to the gate
      const e = c.getPoint(1);
      for (const [r, yy, mat] of [[6.2, Y_PATH, pathMat], [4.6, Y_ROAD, roadMat]]) { const cap = new THREE.Mesh(new THREE.CircleGeometry(r, 28).rotateX(-Math.PI / 2), mat); cap.position.set(e.x, yy, e.z); cap.receiveShadow = true; scene.add(cap); }
    }
    for (const pt of c.getSpacedPoints(300)) roadSamples.push(pt);
  }
  const spurSamples = []; for (const c of curves.slice(1)) for (const pt of c.getSpacedPoints(160)) spurSamples.push(pt);
  const roadDist = (x, z) => { let m = Infinity; for (const r of roadSamples) { const dx = r.x - x, dz = r.z - z, d2 = dx * dx + dz * dz; if (d2 < m) m = d2; } return Math.sqrt(m); };
  const outsideStadium = (x, z, margin) => Math.pow(Math.abs(x) / (A0 + PARK_OUT + margin), EXP) + Math.pow(Math.abs(z) / (B0 + PARK_OUT + margin), EXP) > 1;

  /* ---- road markings: dashed centre lines (one InstancedMesh) ---- */
  {
    const DASH_GAP = 14, dashes = [];
    for (const c of curves) {
      const L = c.getLength(), n = Math.floor(L / DASH_GAP);
      for (let i = 0; i < n; i++) { const u = (i + 0.5) / n; dashes.push([c.getPointAt(u), c.getTangentAt(u)]); }
    }
    const m = new THREE.InstancedMesh(new THREE.BoxGeometry(0.35, 0.03, 5), std(0xf3efe3, { roughness: 0.8 }), dashes.length);
    const dummy = new THREE.Object3D();
    dashes.forEach(([p, t], i) => { dummy.position.set(p.x, Y_DASH, p.z); dummy.rotation.set(0, Math.atan2(t.x, t.z), 0); dummy.updateMatrix(); m.setMatrixAt(i, dummy.matrix); });
    m.receiveShadow = true; scene.add(m);
  }
  return { curves, roadSamples, spurSamples, roadDist, outsideStadium };
}
