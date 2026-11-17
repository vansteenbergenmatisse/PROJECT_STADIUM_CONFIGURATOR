// @ts-check
/**
 * @fileoverview world/matchday: matchday life around the gates: stalls, flagpoles, bus stops and walking fans.
 *
 * WHY: the fans are the only moving scenery besides clouds and the match; their update function is returned for the render loop.
 * BUILDS: 16 stalls and 8 flagpoles (static meshes), 4 bus shelters, 200 fans (bodies + heads InstancedMeshes, userData.dynamic).
 * DEPENDS ON: three, config/constants.js, data/bowl-math.js, core/materials.js, core/rng.js.
 * USED BY: src/main.js (loop calls fansUpdate(now / 1000)).
 * LIFECYCLE: fans use absolute time, not dt.
 * UNITS / CONVENTIONS: metres, y up, angles in radians; plan coordinates are (x, z) with the pitch centre at the origin. fans follow the road curves at 1.0 to 1.9 m/s.
 * NOT HERE: the match simulation (src/sim/match.js).
 */
import * as THREE from 'three';
import { rng } from '../core/rng.js';
import { TAU, FACADE_D, ACCESS_ANGLES, Y_PATH } from '../config/constants.js';
import { shapePoint } from '../data/bowl-math.js';
import { std, dbl } from '../core/materials.js';

/**
 * Build 16 stalls, 8 flagpoles, 4 bus stops and the walking fans (2 InstancedMeshes).
 * Side effects: uses its own rng 7777; adds objects to ctx.scene; fansUpdate(0) is called once to place the fans.
 * @param {object} ctx - shared context (core/ctx.js): scene, MAX_ANISO.
 * @param {{curves: any}} deps - values built earlier (see src/main.js for the order).
 * @returns {object} { fansUpdate }
 */
export function buildMatchday(ctx, { curves }) {
  const { scene, MAX_ANISO } = ctx;
  /* ---- matchday life around the gates: 16 market stalls (food, drinks, programmes, fan shop, scarves, ice cream), 8 flagpoles with waving-shaped flags, and ~180 walking fans
     (instanced, the only moving part: they follow the 4 access roads to the entrances, a few leave from the exits). Own rng (rr) so tree positions do not change.
     Stalls and poles are static (frozen with the rest of the scene, they cast into the baked shadow map). The stall kinds match the "Matchday extras" in the cart. */
  let fansUpdate = null;
  {
    const rr = rng(7777), q0 = [0, 0], q1 = [0, 0];
    const lane = a => { shapePoint(a, FACADE_D, q0); shapePoint(a, FACADE_D + 1, q1); let nx = q1[0] - q0[0], nz = q1[1] - q0[1]; const L = Math.hypot(nx, nz) || 1; return { nx: nx / L, nz: nz / L }; };   // outward unit vector of a radial line
    const at = (a, d, lat) => { const n = lane(a); shapePoint(a, FACADE_D + d, q0); return { x: q0[0] - n.nz * lat, z: q0[1] + n.nx * lat, nx: n.nx, nz: n.nz }; };            // lat = metres along the tangent
    const signTex = (txt, bg) => { const c = document.createElement('canvas'); c.width = 512; c.height = 128; const g = c.getContext('2d');
      g.fillStyle = bg; g.fillRect(0, 0, 512, 128); g.strokeStyle = '#fff'; g.lineWidth = 5; g.strokeRect(7, 7, 498, 114);
      g.fillStyle = '#fff'; g.font = '800 62px "Plus Jakarta Sans", system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, 256, 68);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = MAX_ANISO; return t; };
    const stripeTex = (a, b) => { const c = document.createElement('canvas'); c.width = 64; c.height = 16; const g = c.getContext('2d'); g.fillStyle = a; g.fillRect(0, 0, 32, 16); g.fillStyle = b; g.fillRect(32, 0, 32, 16);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.repeat.set(6, 1); return t; };
    const KINDS = [['FOOD', '#b8302a', 0xf0c14b], ['DRINKS', '#0b3d91', 0x6fb3e0], ['PROGRAMMES', '#17663F', 0xf4f4ee], ['FAN SHOP', '#0E1220', 0xa50044], ['SCARVES', '#a50044', 0xfde100], ['ICE CREAM', '#d97706', 0xf6c6d8]];
    const kindMat = KINDS.map(([name, bg, goods]) => ({ sign: new THREE.MeshBasicMaterial({ map: signTex(name, bg) }), awning: std(0xffffff, { map: stripeTex(bg, '#f4f4ee'), roughness: 0.8, side: THREE.DoubleSide }), goods: std(goods, { roughness: 0.6 }) }));
    const wallM = std(0xf1ead9, { roughness: 0.9 }), counterM = std(0x5a4636, { roughness: 0.7 }), backM = std(0xd8cfbc, { roughness: 0.9 });
    const mk = (geo, mat, x, y, z, rx = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.x = rx; m.castShadow = true; m.receiveShadow = true; return m; };
    const stall = (x, z, fx, fz, k) => {                                // front faces (fx, fz); local +z is the front
      const g = new THREE.Group(), km = kindMat[k % KINDS.length]; g.position.set(x, 0.15, z); g.rotation.y = Math.atan2(fx, fz); g.scale.setScalar(1.45);       // 1.45x so the stalls are not dwarfed by the 9 m shops
      g.add(mk(new THREE.BoxGeometry(4.2, 2.7, 0.2), backM, 0, 1.35, -1.1));
      for (const sx of [-2.0, 2.0]) g.add(mk(new THREE.BoxGeometry(0.2, 2.7, 2.2), wallM, sx, 1.35, 0));
      g.add(mk(new THREE.BoxGeometry(4.0, 1.0, 0.7), counterM, 0, 0.5, 0.75));
      g.add(mk(new THREE.BoxGeometry(4.6, 0.16, 3.0), wallM, 0, 2.78, 0.2));
      g.add(mk(new THREE.BoxGeometry(4.6, 0.07, 1.5), km.awning, 0, 2.55, 1.75, 0.38));
      for (let i = -1; i <= 1; i++) g.add(mk(new THREE.BoxGeometry(0.7, 0.35, 0.5), km.goods, i * 1.2, 1.18, 0.75));
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 1.1), km.sign); sign.position.set(0, 3.5, 1.2); g.add(sign);
      g.add(mk(new THREE.BoxGeometry(4.4, 0.12, 0.12), counterM, 0, 2.93, 1.2));
      scene.add(g);
    };
    const FLAGC = [0xa50044, 0xfde100, 0x17663F, 0xf4f4ee];
    const pole = (x, z, fx, fz, c) => {                                // 14 m pole, flag streams along (fx, fz)
      const p = mk(new THREE.CylinderGeometry(0.07, 0.11, 14, 8), std(0xe8e8e2, { roughness: 0.4, metalness: 0.4 }), x, 7.15, z); scene.add(p);
      const fg = new THREE.PlaneGeometry(5.2, 3.0, 14, 1).translate(2.6, 0, 0), pp = fg.attributes.position;
      for (let i = 0; i < pp.count; i++) pp.setZ(i, Math.sin(pp.getX(i) * 1.5) * 0.3 * (pp.getX(i) / 5.2 + 0.15));        // frozen wave, more at the free end
      fg.computeVertexNormals();
      const f = new THREE.Mesh(fg, dbl(c, { roughness: 0.7 })); f.position.set(x, 12.4, z); f.rotation.y = Math.atan2(-fz, fx); f.castShadow = true; scene.add(f);
      scene.add(mk(new THREE.SphereGeometry(0.16, 8, 6), std(0xd4af37, { metalness: 0.7, roughness: 0.3 }), x, 14.25, z));
    };
    let kIdx = 0;
    ACCESS_ANGLES.forEach((a, gi) => {
      for (const side of [-1, 1]) for (const [lat, d] of [[17, 7], [27, 7]]) {
        const P = at(a, d, side * lat), tx = -P.nz, tz = P.nx;            // tangent
        stall(P.x, P.z, -side * tx, -side * tz, kIdx++);                  // front faces the entrance axis (the road the fans walk along)
      }
      for (const side of [-1, 1]) { const P = at(a, 8, side * 12.5); pole(P.x, P.z, -P.nz * side, P.nx * side, FLAGC[(gi + (side > 0 ? 1 : 0)) % FLAGC.length]); }
    });

    // bus stops: one shelter beside the start of every access road. The fans appear here, so they "come from somewhere".
    const busTex = (() => { const c = document.createElement('canvas'); c.width = 256; c.height = 96; const g = c.getContext('2d'); g.fillStyle = '#0b3d91'; g.fillRect(0, 0, 256, 96); g.fillStyle = '#fff'; g.font = '800 54px "Plus Jakarta Sans", system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('BUS', 128, 52); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
    const glassM = new THREE.MeshStandardMaterial({ color: 0xbfd6e6, roughness: 0.1, transparent: true, opacity: 0.35 }), frameM = std(0x2a2e39, { roughness: 0.5 });
    // walking fans follow the ROADS: along each access road from its start to the end of the tarmac, then straight on to the gate (entrances); exits send a few people out across the plaza
    const polyline = (c, a) => { const n = Math.max(2, Math.round(c.getLength())), P = c.getSpacedPoints(n), pts = [];
      for (let k = 0; k < P.length; k++) { const A = P[Math.max(0, k - 1)], B = P[Math.min(P.length - 1, k + 1)]; let tx = B.x - A.x, tz = B.z - A.z; const l = Math.hypot(tx, tz) || 1; pts.push([P[k].x, P[k].z, tx / l, tz / l, Y_PATH]); }
      const e = P[P.length - 1], g = at(a, 12, 0), dx = g.x - e.x, dz = g.z - e.z, gl = Math.hypot(dx, dz) || 1, m = Math.max(1, Math.round(gl));
      for (let k = 1; k <= m; k++) pts.push([e.x + dx * k / m, e.z + dz * k / m, dx / gl, dz / gl, 0.2]); return pts; };   // 5th value = ground height under the walker: road verge on the road, plaza after it
    const paths = ACCESS_ANGLES.map((a, i) => polyline(curves[i + 1], a));
    paths.forEach(pts => {                                               // shelter on the right of the road start, facing the road
      const [x, z, tx, tz] = pts[0], nx = -tz, nz = tx, g = new THREE.Group(); g.position.set(x + nx * 9.5, 0.2, z + nz * 9.5); g.rotation.y = Math.atan2(-nx, -nz);
      g.add(mk(new THREE.BoxGeometry(4.4, 0.16, 2.0), frameM, 0, 2.6, 0)); g.add(mk(new THREE.BoxGeometry(4.2, 2.4, 0.06), glassM, 0, 1.3, -0.9));
      for (const sx of [-2.1, 2.1]) g.add(mk(new THREE.BoxGeometry(0.1, 2.6, 0.1), frameM, sx, 1.3, 0.9));
      g.add(mk(new THREE.BoxGeometry(3.6, 0.1, 0.5), std(0x6b5a48, { roughness: 0.8 }), 0, 0.5, -0.55));
      const sg = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.6), new THREE.MeshBasicMaterial({ map: busTex })); sg.position.set(1.2, 3.1, 1.0); g.add(sg);
      scene.add(g);
    });
    const people = [];
    paths.forEach((pts, i) => { for (let k = 0; k < 40; k++) people.push({ pts, lat: (rr() < 0.5 ? -1 : 1) * (4.7 + rr() * 1.0), s0: rr() * (pts.length - 1), v: 1.0 + rr() * 0.9, ph: rr() * 6.28, sc: 0.92 + rr() * 0.16, col: (rr() * 7) | 0 }); });
    ACCESS_ANGLES.forEach((a, i) => { const b = ACCESS_ANGLES[(i + 1) % 4] + (i === 3 ? TAU : 0), ex = ((a + b) / 2) % TAU, g0 = at(ex, 12, 0), g1 = at(ex, 44, 0), n = 33, pts = [];
      for (let k = 0; k <= n; k++) pts.push([g0.x + (g1.x - g0.x) * k / n, g0.z + (g1.z - g0.z) * k / n, g1.x - g0.x, g1.z - g0.z].map((v, q) => q > 1 ? v / (Math.hypot(g1.x - g0.x, g1.z - g0.z) || 1) : v));
      for (let k = 0; k < 10; k++) people.push({ pts, lat: (rr() * 2 - 1) * 2.8, s0: rr() * n, v: 1.0 + rr() * 0.9, ph: rr() * 6.28, sc: 0.92 + rr() * 0.16, col: (rr() * 7) | 0 }); });
    const N = people.length, cloth = [0xa50044, 0xfde100, 0x2f6db5, 0xf4f4ee, 0x1a1a1a, 0xd93a31, 0x2e8b57].map(h => new THREE.Color(h));
    const bodies = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.27, 0.95, 3, 8).translate(0, 0.8, 0), std(0xffffff, { roughness: 0.8 }), N);
    const heads = new THREE.InstancedMesh(new THREE.SphereGeometry(0.16, 8, 6).translate(0, 1.72, 0), std(0xe0b090, { roughness: 0.7 }), N);
    for (const m of [bodies, heads]) { m.userData.dynamic = true; m.frustumCulled = false; scene.add(m); }
    people.forEach((pp, i) => bodies.setColorAt(i, cloth[pp.col])); bodies.instanceColor.needsUpdate = true;
    const dm = new THREE.Object3D();
    fansUpdate = tSec => {
      for (let i = 0; i < N; i++) {
        const pp = people[i], pts = pp.pts, last = pts.length - 1, s = (pp.s0 + tSec * pp.v) % last, k = Math.floor(s), f = s - k, A = pts[k], B = pts[Math.min(last, k + 1)];
        const tx = A[2] + (B[2] - A[2]) * f, tz = A[3] + (B[3] - A[3]) * f, tl = Math.hypot(tx, tz) || 1, ux = tx / tl, uz = tz / tl;
        dm.position.set(A[0] + (B[0] - A[0]) * f - uz * pp.lat, (A[4] ?? 0.2) + ((B[4] ?? 0.2) - (A[4] ?? 0.2)) * f + Math.abs(Math.sin(pp.ph + tSec * 6.5 * pp.v)) * 0.05, A[1] + (B[1] - A[1]) * f + ux * pp.lat);
        dm.rotation.set(0, Math.atan2(ux, uz), 0); dm.scale.setScalar(pp.sc); dm.updateMatrix();
        bodies.setMatrixAt(i, dm.matrix); heads.setMatrixAt(i, dm.matrix);
      }
      bodies.instanceMatrix.needsUpdate = true; heads.instanceMatrix.needsUpdate = true;
    };
    fansUpdate(0);
  }
  return { fansUpdate };
}
