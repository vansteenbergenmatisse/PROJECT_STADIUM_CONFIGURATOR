// @ts-check
/**
 * @fileoverview world/gates: entrances, exits, perimeter wall and planters on the plaza edge.
 *
 * WHY: these sit on the access-road angles and are built together because they share ACCESS_ANGLES and the plaza geometry.
 * BUILDS: 8 porch blocks with signs, wall arcs, planter beds and tree crowns (2 InstancedMeshes).
 * DEPENDS ON: three, config/constants.js, data/bowl-math.js, core/geometry.js, core/materials.js.
 * USED BY: src/main.js.
 * LIFECYCLE: static; no rand is consumed.
 * UNITS / CONVENTIONS: metres, y up, angles in radians; plan coordinates are (x, z) with the pitch centre at the origin.
 * NOT HERE: the roads and the park ring (world/roads.js, world/parking.js).
 */
import * as THREE from 'three';
import { TAU, ACCESS_ANGLES, FACADE_D } from '../config/constants.js';
import { shapePoint, arcTable, arcAt } from '../data/bowl-math.js';
import { ringStrip } from '../core/geometry.js';
import { std, dbl } from '../core/materials.js';
import { mergeStatic } from '../core/merge.js';

/**
 * Build the 4 lettered entrances, the 4 numbered exits, the perimeter ramp-wall (interrupted by the access roads) and the 22 planters.
 * Side effects: adds 8 gate groups of meshes, wall strips and 2 InstancedMeshes to ctx.scene.
 * @param {object} ctx - shared context (core/ctx.js): scene, MAX_ANISO.
 * @returns {void} nothing; everything is added to ctx.scene.
 */
export function buildGates(ctx) {
  const { scene, MAX_ANISO } = ctx;
  /* ---- gates: 4 ENTRANCES where the access roads arrive (green) and 4 EXITS halfway between them (red). Each gate = a porch block with a dark opening, a big
     lit sign above it and, for entrances, a green paved apron the road runs over. They sit on the same plan angles as the roads / aisles (constant theta = straight radial line). */
  const ACCESS_ANGLES = [0.35, 1.9, 3.45, 5.0];
  const mergeList = [];                                                 // perimeter wall arcs: merged per material at the end (core/merge.js); the rotated porches and openings stay separate
  {
    const signTex = (txt, bg) => { const c = document.createElement('canvas'); c.width = 768; c.height = 144; const g = c.getContext('2d');
      g.fillStyle = bg; g.fillRect(0, 0, 768, 144); g.strokeStyle = '#fff'; g.lineWidth = 6; g.strokeRect(9, 9, 750, 126);
      g.fillStyle = '#fff'; g.font = '800 78px "Plus Jakarta Sans", system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, 384, 76);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = MAX_ANISO; return t; };
    const porchM = std(0xcfc9bd, { roughness: 0.9 }), holeM = new THREE.MeshBasicMaterial({ color: 0x07090e });
    const ENT = '#17663F', EXT = '#B8302A', p0 = [0, 0], p1 = [0, 0];
    const gate = (a, kind, n) => {
      shapePoint(a, FACADE_D, p0); shapePoint(a, FACADE_D + 1, p1);
      let nx = p1[0] - p0[0], nz = p1[1] - p0[1]; const L = Math.hypot(nx, nz) || 1; nx /= L; nz /= L;           // outward direction (straight radial line)
      const yaw = Math.atan2(nx, nz), put = (m, dd, y) => { shapePoint(a, FACADE_D + dd, p0); m.position.set(p0[0], y, p0[1]); m.rotation.set(0, yaw, 0); scene.add(m); return m; };
      const W = kind === 'entrance' ? 20 : 14;
      const porch = put(new THREE.Mesh(new THREE.BoxGeometry(W, 9, 13), porchM), 6.2, 4.5); porch.castShadow = true; porch.receiveShadow = true;
      const hole = put(new THREE.Mesh(new THREE.PlaneGeometry(W - 5, 6.4), holeM), 12.75, 3.2);                       // dark opening on the front face
      const sign = put(new THREE.Mesh(new THREE.PlaneGeometry(W + 4, (W + 4) * 144 / 768), new THREE.MeshBasicMaterial({ map: signTex(kind === 'entrance' ? 'ENTRANCE ' + String.fromCharCode(65 + n) : 'EXIT ' + (n + 1), kind === 'entrance' ? ENT : EXT) })), 12.9, 11.2);
      void hole; void sign;
      // (the green / red approach lanes were removed on request: the plaza and the roads carry the people now)
    };
    ACCESS_ANGLES.forEach((a, i) => gate(a, 'entrance', i));
    ACCESS_ANGLES.forEach((a, i) => { const b = ACCESS_ANGLES[(i + 1) % 4] + (i === 3 ? TAU : 0); gate(((a + b) / 2) % TAU, 'exit', i); });
  }
  // blue-grey perimeter ramp-wall, interrupted by the four access roads
  {
    const wallM = dbl(0x6c7b99, { roughness: 0.6, metalness: 0.15 });
    const gaps = ACCESS_ANGLES, arcs = [];
    for (let i = 0; i < 4; i++) arcs.push([gaps[i] + 0.16, (i < 3 ? gaps[i + 1] : gaps[0] + TAU) - 0.16]);
    for (const [a0, a1] of arcs) {
      const prof = [{ d: FACADE_D + 21, y: 0.1 }, { d: FACADE_D + 21, y: 1.8 }, { d: FACADE_D + 27, y: 1.8 }, { d: FACADE_D + 27, y: 0.1 }];
      const wallArc = ringStrip(prof, wallM, { N: 200, t0: a0, t1: a1 }); scene.add(wallArc); mergeList.push(wallArc);
    }
    // planters with small trees along the plaza
    const SPUR_PTS = gaps.map(g => shapePoint(g, FACADE_D + 18.5, [0, 0]));
    const planters = [], PLN = 22, tabPl = arcTable(FACADE_D + 18.5);
    for (let k = 0; k < PLN; k++) {
      const a = arcAt(tabPl, k / PLN);                                  // sits between two shops
      if (SPUR_PTS.some(p => Math.hypot(p[0] - a.x, p[1] - a.z) < 18)) continue;
      planters.push([a.x, a.z, Math.atan2(-a.tz, a.tx)]);                 // long axis along the ring
    }
    const bedGeo = new THREE.CylinderGeometry(1, 1, 0.5, 20).scale(4.5, 1, 1.9);
    const beds = new THREE.InstancedMesh(bedGeo, std(0x2b2118, { roughness: 1 }), planters.length);
    const blobGeo = new THREE.IcosahedronGeometry(1, 1);
    const crowns = new THREE.InstancedMesh(blobGeo, std(0x6d8f45, { roughness: 0.9, flatShading: false }), planters.length * 2);
    const dummy = new THREE.Object3D();
    planters.forEach(([x, z, yaw], i) => {
      dummy.position.set(x, 0.3, z); dummy.rotation.set(0, yaw, 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); beds.setMatrixAt(i, dummy.matrix);
      for (let k = 0; k < 2; k++) { const off = (k ? 1.9 : -1.9); dummy.position.set(x + Math.cos(yaw) * off, 2.3, z - Math.sin(yaw) * off); dummy.rotation.set(0, 0, 0); dummy.scale.set(1.5, 1.4, 1.5); dummy.updateMatrix(); crowns.setMatrixAt(i * 2 + k, dummy.matrix); }
    });
    beds.receiveShadow = true; crowns.castShadow = true; crowns.receiveShadow = true; scene.add(beds, crowns);
  }
  mergeStatic(scene, mergeList);                                        // 4 wall arcs -> 1 (built in world coordinates, bit-exact merge)
}
