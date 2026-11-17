// @ts-check
/**
 * @fileoverview world/seats: the single seat InstancedMesh and its identity tables.
 *
 * WHY: hard requirement: all seats are ONE InstancedMesh and the instance id indexes typed arrays; the arrays are shared by painting, pricing, picking and checkout.
 * BUILDS: 1 InstancedMesh (60 triangles per seat, vertex colours baked by face direction) with 78,397 instances; typed arrays seatTier / seatRow / seatNumber / seatSection / seatCode / seatPrice / seatPos.
 * DEPENDS ON: three, BufferGeometryUtils, config/constants.js, data/seat-layout.js, data/pricing.js, core/rng.js (hash).
 * USED BY: src/main.js, src/interaction/*, src/ui/* (selection, painting, picking, checkout), src/debug/expose.js (tables).
 * LIFECYCLE: built once; seats.instanceColor is re-written at runtime by the painting code in src/interaction/seat-paint.js. Seats do not cast shadows (re-baking them stalled flights).
 * UNITS / CONVENTIONS: metres, y up, angles in radians; plan coordinates are (x, z) with the pitch centre at the origin. seatTier / seatRow / seatSection hold index + 1, seatNumber is 1-based, seatCode 0 plain orange (available), 1 light orange, 2 pale gold.
 * NOT HERE: selection colours (COL is extended in src/interaction/seat-paint.js).
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { tiers } from '../config/constants.js';
import { forEachSeat, CELL, gkey } from '../data/seat-layout.js';
import { seatPriceOf } from '../data/pricing.js';
import { hash } from '../core/rng.js';

/**
 * Build THE seat InstancedMesh (78,397 seats) and the per-instance tables (tier, row, number, section, colour code, price, position), the section id lists and the spatial grid.
 * Side effects: adds 1 InstancedMesh to ctx.scene.
 * @param {object} ctx - shared context (core/ctx.js): scene, envTex.
 * @returns {object} { seats, seatCount, seatTier, seatRow, seatNumber, seatSection, seatCode, seatPrice, seatPos, sectionIds, grid, COL, seatInfo }
 */
export function buildSeats(ctx) {
  const { scene, envTex } = ctx;
  function seatGeometry() {                          // 5 boxes (60 tris): pan, reclined back, two arms, pedestal; vertex colours bake contact shading
    const parts = [], add = (g, k) => { g = g.toNonIndexed(); g.computeVertexNormals(); const n = g.attributes.normal, c = new Float32Array(n.count * 3);     // bake light by face direction: top faces bright, sides mid, undersides dark
      for (let i = 0; i < n.count; i++) { const ny = n.getY(i), nz = n.getZ(i), f = ny > 0.5 ? 1.0 : ny < -0.5 ? 0.5 : 0.74 + 0.16 * nz; c[i * 3] = c[i * 3 + 1] = c[i * 3 + 2] = k * f; }
      g.setAttribute('color', new THREE.BufferAttribute(c, 3)); g.deleteAttribute('uv'); parts.push(g); };
    add(new THREE.BoxGeometry(0.46, 0.07, 0.42).translate(0, 0.43, 0.03), 1.0);
    add(new THREE.BoxGeometry(0.44, 0.40, 0.055).rotateX(-0.14).translate(0, 0.69, -0.18), 0.9);
    for (const sx of [-0.245, 0.245]) add(new THREE.BoxGeometry(0.035, 0.05, 0.34).translate(sx, 0.55, 0.0), 0.68);
    add(new THREE.BoxGeometry(0.09, 0.40, 0.30).translate(0, 0.20, -0.03), 0.32);
    return mergeGeometries(parts);
  }
  let seatCount = 0;
  forEachSeat(() => { seatCount++; });
  const seatMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.5, metalness: 0, clearcoat: 0.5, clearcoatRoughness: 0.35, envMap: envTex, envMapIntensity: 0.4 });   // broad soft sheen, no sparkle at grazing angles
  const seats = new THREE.InstancedMesh(seatGeometry(), seatMat, seatCount);
  seats.name = 'seats'; seats.receiveShadow = true; seats.castShadow = false;

  // per-instance identity: the instance id indexes these tables
  const seatTier = new Uint8Array(seatCount), seatRow = new Uint8Array(seatCount),
        seatNumber = new Uint16Array(seatCount), seatSection = new Uint8Array(seatCount),
        seatCode = new Uint8Array(seatCount), seatPrice = new Uint16Array(seatCount);                       // 0 red, 1 blue
  const seatPos = new Float32Array(seatCount * 3);
  const sectionIds = new Map();                                    // "tier:section" -> instance ids
  const grid = new Map();
  const COL = { red: new THREE.Color(0xf0600f), blue: new THREE.Color(0xff8a1c), gold: new THREE.Color(0xffc861), hot: new THREE.Color(0xffe27a), pick: new THREE.Color(0xffffff) };   // Soccer City: two tones of orange
  {
    const dummy = new THREE.Object3D(); let id = 0;
    forEachSeat((ti, r, s, num, x, yv, z, nx, nz, f, L) => {
      dummy.position.set(x, yv, z); dummy.rotation.set(0, Math.atan2(nx, nz), 0); dummy.updateMatrix();
      seats.setMatrixAt(id, dummy.matrix);
      seatTier[id] = ti + 1; seatRow[id] = r + 1; seatNumber[id] = num; seatSection[id] = s + 1;
      seatPos[id * 3] = x; seatPos[id * 3 + 1] = yv; seatPos[id * 3 + 2] = z;
      const clump = hash(ti * 100 + r * 0.37, Math.floor(f * L / 2.6)), single = hash(id, 7.7);
      const blue = (clump < tiers[ti].blue * 1.5 && single < 0.65) || single < tiers[ti].blue * 0.25;
      const gold = ((num - r) % 18 + 18) % 18 === 0 || ((num + r) % 18 + 18) % 18 === 0;      // pale-gold diamond lattice woven through the orange (the mosaic look); pure paint, no price effect
      seatCode[id] = gold ? 2 : blue ? 1 : 0; seatPrice[id] = seatPriceOf(ti, r, x, z);
      seats.setColorAt(id, gold ? COL.gold : blue ? COL.blue : COL.red);
      const k = ti + ':' + s; let arr = sectionIds.get(k); if (!arr) sectionIds.set(k, arr = []); arr.push(id);
      const gk = gkey(Math.floor(x / CELL), Math.floor(z / CELL)); let ga = grid.get(gk); if (!ga) grid.set(gk, ga = []); ga.push(id);
      id++;
    });
    seats.instanceMatrix.needsUpdate = true; seats.instanceColor.needsUpdate = true;
    seats.computeBoundingSphere();
    // the instance matrices never change after this point (only instanceColor is re-written, on hover / selection), so hint the GPU upload as static; instanceColor keeps its default (dynamic) usage
    seats.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  }
  // seats do NOT cast into the shadow map: tried in batch 19, re-baking 4.7 M seat triangles stalled the first frame of a flight for ~1.4 s in the test browser (contact shading stays baked in the vertex colours)
  scene.add(seats);
  const seatInfo = id => ({ id, tier: seatTier[id], tierName: tiers[seatTier[id] - 1].name, section: seatSection[id], row: seatRow[id], number: seatNumber[id] });
  return { seats, seatCount, seatTier, seatRow, seatNumber, seatSection, seatCode, seatPrice, seatPos, sectionIds, grid, COL, seatInfo };
}
