// @ts-check
/**
 * @fileoverview world/skyboxes: the skybox band between tier 1 and 2.
 *
 * WHY: the glass mesh is pickable (PICK) and suites[] feeds picking, camera and prices, so both are returned.
 * BUILDS: 1 glass ring strip (renderOrder 2), 3 frame rails, 56 dividers + 560 chairs (2 InstancedMeshes), suites[] of 56 centres + normals.
 * DEPENDS ON: three, BufferGeometryUtils, config/constants.js, data/bowl-math.js, core/geometry.js, core/materials.js.
 * USED BY: src/main.js.
 * LIFECYCLE: static.
 * UNITS / CONVENTIONS: metres, y up, angles in radians; plan coordinates are (x, z) with the pitch centre at the origin. SUITE_W is the width of one suite in metres.
 * NOT HERE: prices (src/data/display-prices.js).
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { GLASS_D, Y1, BOX_TOP, BOX_H, BOX_DEPTH } from '../config/constants.js';
import { arcTable, arcAt } from '../data/bowl-math.js';
import { ringStrip } from '../core/geometry.js';
import { std, dbl } from '../core/materials.js';

/**
 * Build the glass strip, its frame rails, the 56 divider walls and chairs, and the suite list.
 * Side effects: adds the glass mesh and 2 InstancedMeshes + 3 rails to ctx.scene.
 * @param {object} ctx - shared context (core/ctx.js): scene, envTex.
 * @param {{white: any}} deps - values built earlier (see src/main.js for the order).
 * @returns {object} { glassMesh, suites, SUITE_W }
 */
export function buildSkyboxes(ctx, { white }) {
  const { scene, envTex } = ctx;
  let glassMesh = null, SUITE_W = 9;
  const suites = [];                                // one entry per skybox: centre + inward normal (for picking / camera)
  {
    const glass = new THREE.MeshStandardMaterial({ color: 0x24343d, roughness: 0.06, metalness: 0, transparent: true, opacity: 0.42,
      side: THREE.DoubleSide, depthWrite: false, envMap: envTex, envMapIntensity: 0.8 });   // Standard (not Physical): cheaper overdraw
    const g = ringStrip([{ d: GLASS_D, y: Y1 }, { d: GLASS_D, y: BOX_TOP }], glass, { cast: false, receive: false });
    g.renderOrder = 2; scene.add(g); glassMesh = g;
    const frame = dbl(0x1b1e23, { metalness: 0.6, roughness: 0.35 });
    for (const [y0, y1] of [[Y1, Y1 + 0.3], [Y1 + BOX_H / 2 - 0.06, Y1 + BOX_H / 2 + 0.06], [BOX_TOP - 0.3, BOX_TOP]]) scene.add(ringStrip([{ d: GLASS_D + 0.02, y: y0 }, { d: GLASS_D + 0.02, y: y1 }], frame, { cast: false }));

    const UNITS = 56, dummy = new THREE.Object3D();
    const divGeo = new THREE.BoxGeometry(0.25, BOX_H, BOX_DEPTH);
    const dividers = new THREE.InstancedMesh(divGeo, white, UNITS);
    const chairGeo = mergeGeometries([
      new THREE.BoxGeometry(0.55, 0.12, 0.55).translate(0, 0.45, 0.05),
      new THREE.BoxGeometry(0.55, 0.7, 0.12).translate(0, 0.8, -0.2)]);
    const CH_PER_ROW = 5, rowsD = [GLASS_D + 1.2, GLASS_D + 2.6];
    const chairs = new THREE.InstancedMesh(chairGeo, std(0x16171b, { roughness: 0.5 }), UNITS * CH_PER_ROW * rowsD.length);
    const tabMid = arcTable(GLASS_D + BOX_DEPTH / 2);
    let ci = 0;
    for (let u = 0; u < UNITS; u++) {
      let a = arcAt(tabMid, u / UNITS);
      let nx = -a.tz, nz = a.tx; if (nx * -a.x + nz * -a.z < 0) { nx = -nx; nz = -nz; }
      dummy.position.set(a.x, Y1 + BOX_H / 2, a.z); dummy.rotation.set(0, Math.atan2(nx, nz), 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix();
      dividers.setMatrixAt(u, dummy.matrix);
      for (const dd of rowsD) {
        const tab = arcTable(dd), ff = (u + 0.5) / UNITS, unitLen = tab.L / UNITS;
        for (let k = 0; k < CH_PER_ROW; k++) {
          const fo = ff + ((k - (CH_PER_ROW - 1) / 2) * (unitLen * 0.16)) / tab.L;
          const b = arcAt(tab, ((fo % 1) + 1) % 1);
          let mx = -b.tz, mz = b.tx; if (mx * -b.x + mz * -b.z < 0) { mx = -mx; mz = -mz; }
          dummy.position.set(b.x, Y1, b.z); dummy.rotation.set(0, Math.atan2(mx, mz), 0); dummy.updateMatrix();
          chairs.setMatrixAt(ci++, dummy.matrix);
        }
      }
    }
    SUITE_W = tabMid.L / UNITS - 0.3;
    for (let u = 0; u < UNITS; u++) {               // suite u sits between divider u and u+1
      const a = arcAt(tabMid, (u + 0.5) / UNITS); let nx = -a.tz, nz = a.tx; if (nx * -a.x + nz * -a.z < 0) { nx = -nx; nz = -nz; }
      suites.push({ x: a.x, z: a.z, nx, nz });
    }
    dividers.castShadow = true; scene.add(dividers); scene.add(chairs);
  }
  return { glassMesh, suites, SUITE_W };
}
