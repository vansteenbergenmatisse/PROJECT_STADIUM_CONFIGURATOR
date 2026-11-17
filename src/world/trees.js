// @ts-check
/**
 * @fileoverview world/trees: about 1,620 trees in two species.
 *
 * WHY: tree placement rejects points near roads and shops, so it must run after the shops have been appended to roadSamples.
 * BUILDS: 2 InstancedMeshes (oak, pine).
 * DEPENDS ON: three, BufferGeometryUtils, config/constants.js, core/geometry.js (paintGeo).
 * USED BY: src/main.js.
 * LIFECYCLE: static.
 * UNITS / CONVENTIONS: metres, y up, angles in radians; plan coordinates are (x, z) with the pitch centre at the origin. TARGET 860 + FOREST 760 trees, 11 m clearance from roads.
 * NOT HERE: the sky and the ground (world/sky.js, world/ground.js).
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { TAU } from '../config/constants.js';
import { paintGeo } from '../core/geometry.js';

/**
 * Build the scattered oaks and pines, the wood patches, the road belts and the dense north-west forest (instanced).
 * Side effects: consumes the shared rand (last consumer) and adds 2 InstancedMeshes to ctx.scene.
 * @param {object} ctx - shared context (core/ctx.js): scene, rand.
 * @param {{curves: any, roadSamples: any, roadDist: any, outsideStadium: any}} deps - values built earlier (see src/main.js for the order).
 * @returns {void} nothing; everything is added to ctx.scene.
 */
export function buildTrees(ctx, { curves, roadSamples, roadDist, outsideStadium }) {
  const { scene, rand } = ctx;
  /* ---- trees: two species (oak + pine): scattered meadow trees, wood patches, road-side belts, plus THE FOREST (one dense wood north-west, see FOREST) ---- */
  {
    const noise3 = (x, y, z) => { const h = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453; return h - Math.floor(h); };
    const shade = (c, base, t) => c.copy(base).multiplyScalar(0.58 + 0.6 * t);                 // dark underneath, sunlit on top
    function blob(r, cx, cy, cz, sy, base, seed) {
      const g = new THREE.IcosahedronGeometry(r, 1), p = g.attributes.position, col = new Float32Array(p.count * 3), c = new THREE.Color();
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = 1 + 0.24 * (noise3(x + seed, y, z) - 0.5) * 2;
        p.setXYZ(i, x * k, y * k * sy, z * k); shade(c, base, (y / r) * 0.5 + 0.5);
        col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
      }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.translate(cx, cy, cz); g.deleteAttribute('uv'); return g;
    }
    function trunk(r0, r1, h, color) {
      const g = new THREE.CylinderGeometry(r0, r1, h, 7).translate(0, h / 2, 0).toNonIndexed();
      return paintGeo(g, color.r, color.g, color.b);
    }
    function cone(r, h, baseY, base) {
      const g = new THREE.ConeGeometry(r, h, 8).translate(0, baseY + h / 2, 0).toNonIndexed(), p = g.attributes.position, col = new Float32Array(p.count * 3), c = new THREE.Color();
      for (let i = 0; i < p.count; i++) { shade(c, base, (p.getY(i) - baseY) / h); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.deleteAttribute('uv'); return g;
    }
    const bark = new THREE.Color(0x4a3426), oakGreen = new THREE.Color(0x5f8036), pineGreen = new THREE.Color(0x1f4a2f);
    const oakGeo = mergeGeometries([trunk(0.35, 0.58, 4.6, bark),
      blob(3.5, 0, 7.2, 0, 0.82, oakGreen, 1), blob(2.6, 2.3, 6.0, 0.8, 0.8, oakGreen, 2), blob(2.5, -2.1, 6.3, -1, 0.8, oakGreen, 3), blob(2.3, 0.3, 9.0, -0.4, 0.8, oakGreen, 4)]);
    const pineGeo = mergeGeometries([trunk(0.28, 0.44, 3.4, bark),
      cone(3.4, 4.6, 2.6, pineGreen), cone(2.8, 4.2, 4.9, pineGreen), cone(2.2, 3.8, 6.9, pineGreen), cone(1.5, 3.4, 8.7, pineGreen)]);
    const treeMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0 });

    // where trees grow: dense woods + belts along the loop road + lone trees
    const woods = [];                                                         // [x, z, sigma, weight]
    for (let t = 0; t < 4000 && woods.length < 4; t++) {
      const x = (rand() - 0.5) * 1150, z = (rand() - 0.5) * 1050;
      if (!outsideStadium(x, z, 40) || roadDist(x, z) < 30 || woods.some(w => Math.hypot(w[0] - x, w[1] - z) < 150)) continue;
      woods.push([x, z, 50 + rand() * 40, 2.2 + rand() * 1.5]);
    }
    for (let k = 0; k < 6; k++) {
      const u = (k + rand() * 0.8) / 6, p = curves[0].getPointAt(u), t = curves[0].getTangentAt(u), side = rand() < 0.5 ? 1 : -1, off = 28 + rand() * 40;
      woods.push([p.x - t.z * off * side, p.z + t.x * off * side, 24 + rand() * 12, 1.0]);
    }
    const wsum = woods.reduce((a, w) => a + w[3], 0);
    const spots = [], TARGET = 860, LONE = 560;                       // many scattered trees on the meadow; the dedicated forest is added below
    for (let guard = 0; spots.length < TARGET && guard < 400000; guard++) {
      let x, z, s;
      if (spots.length < TARGET - LONE) {
        let pick = rand() * wsum, w = woods[0]; for (const c of woods) { pick -= c[3]; if (pick <= 0) { w = c; break; } }
        x = w[0] + (rand() + rand() + rand() - 1.5) * 2 * w[2]; z = w[1] + (rand() + rand() + rand() - 1.5) * 2 * w[2]; s = 0.85 + rand() * 0.8;
      } else { x = (rand() - 0.5) * 1250; z = (rand() - 0.5) * 1150; s = 0.9 + rand() * 0.6; }
      if (Math.abs(x) > 1250 || Math.abs(z) > 1250 || !outsideStadium(x, z, 14)) continue;
      let near = false;
      for (const r of roadSamples) { const dx = r.x - x, dz = r.z - z; if (dx * dx + dz * dz < 121) { near = true; break; } }
      if (near) continue;
      spots.push([x, z, s, rand() < 0.55 ? 0 : 1]);
    }
    // THE FOREST: one clearly dense wood north-west of the stadium (visible in the overview and aerial views). Roads cut through it; trees keep 11 m off the asphalt.
    const FOREST = { x: -215, z: -120, r: 110, n: 760 };
    for (let guard = 0, placed = 0; placed < FOREST.n && guard < 200000; guard++) {
      const ang = rand() * TAU, rad = FOREST.r * Math.sqrt(rand()) * (0.55 + 0.45 * rand()) + 0, x = FOREST.x + Math.cos(ang) * rad, z = FOREST.z + Math.sin(ang) * rad;
      if (!outsideStadium(x, z, 14)) continue;
      let near = false;
      for (const r of roadSamples) { const dx = r.x - x, dz = r.z - z; if (dx * dx + dz * dz < 121) { near = true; break; } }
      if (near) continue;
      spots.push([x, z, 0.95 + rand() * 0.9, rand() < 0.38 ? 0 : 1]); placed++;       // mostly dark pines, some oaks
    }
    const oaks = spots.filter(s => s[3] === 0), pines = spots.filter(s => s[3] === 1);
    const dummy = new THREE.Object3D(), tint = new THREE.Color();
    for (const [list, geo] of [[oaks, oakGeo], [pines, pineGeo]]) {
      const m = new THREE.InstancedMesh(geo, treeMat, list.length);
      list.forEach(([x, z, s], i) => {
        dummy.position.set(x, 0, z); dummy.rotation.set((rand() - 0.5) * 0.06, rand() * TAU, (rand() - 0.5) * 0.06); dummy.scale.set(s, s * (0.9 + rand() * 0.3), s); dummy.updateMatrix();
        m.setMatrixAt(i, dummy.matrix); const t = 0.8 + rand() * 0.38; m.setColorAt(i, tint.setRGB(t * (0.94 + rand() * 0.1), t, t * (0.9 + rand() * 0.1)));
      });
      m.castShadow = true; m.receiveShadow = true; m.instanceColor.needsUpdate = true; scene.add(m);
    }
  }
}
