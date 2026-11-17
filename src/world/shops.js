// @ts-check
/**
 * @fileoverview world/shops: about 60 small shops (walls, roofs, awnings).
 *
 * WHY: shop colours consume the shared rand, so this builder runs exactly between the parking and the trees.
 * BUILDS: 3 InstancedMeshes (walls, roofs, awnings).
 * DEPENDS ON: three, config/constants.js, data/bowl-math.js, core/materials.js.
 * USED BY: src/main.js.
 * LIFECYCLE: MUTATES the roadSamples array it is given (trees read it afterwards).
 * UNITS / CONVENTIONS: metres, y up, angles in radians; plan coordinates are (x, z) with the pitch centre at the origin.
 * NOT HERE: stalls and fans (world/matchday.js).
 */
import * as THREE from 'three';
import { FACADE_D } from '../config/constants.js';
import { arcTable, arcAt } from '../data/bowl-math.js';
import { std } from '../core/materials.js';

/**
 * Build the small shops on the plaza ring and beside the loop road (3 InstancedMeshes).
 * Side effects: consumes the shared rand and appends each shop to deps.roadSamples so trees keep away.
 * @param {object} ctx - shared context (core/ctx.js): scene, rand.
 * @param {{curves: any, roadSamples: any, spurSamples: any}} deps - values built earlier (see src/main.js for the order).
 * @returns {void} nothing; everything is added to ctx.scene.
 */
export function buildShops(ctx, { curves, roadSamples, spurSamples }) {
  const { scene, rand } = ctx;
  /* ---- small shops: plaza ring + roadside (3 InstancedMeshes: walls, roofs, awnings) ---- */
  {
    const spots = [];                                   // {x,z,yaw}
    const PLAZA_N = 44, tabP = arcTable(FACADE_D + 15);
    for (let k = 0; k < PLAZA_N; k++) {
      const a = arcAt(tabP, (k + 0.5) / PLAZA_N);
      if (spurSamples.some(p => Math.hypot(p.x - a.x, p.z - a.z) < 16)) continue;
      let nx = -a.tz, nz = a.tx; if (nx * -a.x + nz * -a.z < 0) { nx = -nx; nz = -nz; }
      spots.push({ x: a.x, z: a.z, yaw: Math.atan2(nx, nz) });          // front faces the stadium
    }
    const loop = curves[0], ROADSIDE = 20;
    for (let i = 0; i < ROADSIDE; i++) {
      const u = (i + rand() * 0.6) / ROADSIDE, p = loop.getPointAt(u % 1), t = loop.getTangentAt(u % 1);
      const side = rand() < 0.5 ? 1 : -1, x = p.x - t.z * 13 * side, z = p.z + t.x * 13 * side;
      if (roadSamples.some(r => { const dx = r.x - x, dz = r.z - z; return dx * dx + dz * dz < 100; })) continue;
      spots.push({ x, z, yaw: Math.atan2(t.z * side, -t.x * side) });   // front faces the road
    }
    const wallPal = [0xf4e9d8, 0xe8d2b0, 0xd9e4ec, 0xf1c6a8, 0xcfe0c3, 0xf6f1e7].map(h => new THREE.Color(h));
    const awnPal = [0xc23b22, 0x2f6db5, 0xe0a321, 0x2e8b57, 0x8a3b8f].map(h => new THREE.Color(h));
    const roofPal = [0x7a6f66, 0x9b4a35, 0x5e6a73].map(h => new THREE.Color(h));
    const walls = new THREE.InstancedMesh(new THREE.BoxGeometry(9, 4, 6).translate(0, 2, 0), std(0xffffff, { roughness: 0.9 }), spots.length);
    const roofs = new THREE.InstancedMesh(new THREE.BoxGeometry(9.8, 0.5, 6.8).translate(0, 4.25, 0), std(0xffffff, { roughness: 0.85 }), spots.length);
    const awns = new THREE.InstancedMesh(new THREE.BoxGeometry(8.6, 0.18, 2.2).translate(0, 3.1, 3.9), std(0xffffff, { roughness: 0.8 }), spots.length);
    const dummy = new THREE.Object3D();
    spots.forEach((s, i) => {
      dummy.position.set(s.x, 0.15, s.z); dummy.rotation.set(0, s.yaw, 0); dummy.updateMatrix();
      for (const mesh of [walls, roofs, awns]) mesh.setMatrixAt(i, dummy.matrix);
      walls.setColorAt(i, wallPal[(rand() * wallPal.length) | 0]);
      roofs.setColorAt(i, roofPal[(rand() * roofPal.length) | 0]);
      awns.setColorAt(i, awnPal[(rand() * awnPal.length) | 0]);
      roadSamples.push(new THREE.Vector3(s.x, 0, s.z));                                                 // keep trees away
    });
    for (const mesh of [walls, roofs, awns]) { mesh.castShadow = true; mesh.receiveShadow = true; mesh.instanceMatrix.needsUpdate = true; mesh.instanceColor.needsUpdate = true; scene.add(mesh); }
  }
}
