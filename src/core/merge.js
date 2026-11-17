// @ts-check
/**
 * @fileoverview core/merge: mergeStatic, a draw-call reducer for STATIC, opaque, non-pickable meshes that share one material instance.
 *
 * WHY: fences, signs, stall parts, road ribbons and similar props were hundreds of separate Meshes, each one a draw call (and one more in the shadow pass when it casts a shadow).
 *      Meshes that use the SAME material instance and the same shadow / order flags look identical whether they are drawn one by one or as one geometry, so they are baked into one Mesh.
 * BUILDS: nothing by itself; it replaces the given meshes by one merged Mesh per compatible group and adds that Mesh to the scene.
 * DEPENDS ON: three, three/addons/utils/BufferGeometryUtils.js (mergeGeometries; the same addon the seats and trees already import).
 * USED BY: world/parking.js, world/matchday.js, world/gates.js, world/roads.js.
 * LIFECYCLE: call it once, at the end of a builder, while the scene is still being built (before prepareStaticScene freezes the matrices).
 * WHY TRANSLATION ONLY BY DEFAULT: a pure translation baked into float32 positions rounds exactly like the GPU does (one float32 addition), so the rendered picture is bit-identical (measured: 0 differing pixels).
 *      Baking a rotation or a scale in JS doubles differs from the GPU's float32 matrix product by up to about 2e-5 m per vertex, which can flip a few edge pixels (measured: 1 to 3 pixels of 518400 in two views).
 *      Callers that accept that can pass { bakeRotation: true }.
 * UNITS / CONVENTIONS: the world matrix of every source mesh is baked into the merged vertex positions and normals (uv and the index are copied as they are), so the merged Mesh sits at the origin with an identity transform.
 * WHAT IS NEVER MERGED (kept as separate Meshes): InstancedMesh, SkinnedMesh, transparent materials, material arrays, anything with userData.dynamic (itself or an ancestor: markers, match, fans, sky),
 *      meshes whose world matrix mirrors the geometry (negative determinant, the winding would flip), hidden meshes, and (unless opts.bakeRotation is true) meshes whose world matrix is not a pure translation,
 *      and meshes with a different material instance, castShadow, receiveShadow,
 *      renderOrder, frustumCulled, attribute set or indexed / non-indexed layout (each of those makes a separate group; a group with one mesh is left alone).
 * NOT HERE: the picking lists and the roof (the roof shares the white material and is never passed in).
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** True when a column-major 4x4 matrix is the identity apart from its translation column (exact comparison on purpose). */
function isTranslationOnly(e) { return e[0] === 1 && e[1] === 0 && e[2] === 0 && e[3] === 0 && e[4] === 0 && e[5] === 1 && e[6] === 0 && e[7] === 0 && e[8] === 0 && e[9] === 0 && e[10] === 1 && e[11] === 0 && e[15] === 1; }

/** True when the mesh or one of its ancestors is flagged userData.dynamic (animated or switched at runtime). */
function isDynamic(o) { for (let p = o; p; p = p.parent) if (p.userData && p.userData.dynamic) return true; return false; }

/**
 * Merge compatible static meshes (see the file header for the rules).
 * Side effects: removes the merged source meshes from their parents (and empty parent Groups that only held them) and adds one new Mesh per group to `scene`.
 * @param {any} scene - the THREE.Scene (or any Object3D at the origin with an identity transform) that receives the merged meshes.
 * @param {any[]} meshes - candidate meshes, already added to the scene graph (their world matrix is read from their parents).
 * @param {{bakeRotation?: boolean}} [opts] - bakeRotation: also merge meshes whose world matrix rotates or scales (default false, see the file header).
 * @returns {{before: number, after: number}} how many source meshes went in and how many merged meshes came out (untouched ones count in neither).
 */
export function mergeStatic(scene, meshes, { bakeRotation = false } = {}) {
  const groups = new Map();
  for (const m of meshes) {
    if (!m.isMesh || m.isInstancedMesh || m.isSkinnedMesh || !m.visible || isDynamic(m)) continue;
    const mat = m.material;
    if (Array.isArray(mat) || mat.transparent) continue;
    m.updateWorldMatrix(true, false);
    if (m.matrixWorld.determinant() <= 0) continue;
    if (!bakeRotation && !isTranslationOnly(m.matrixWorld.elements)) continue;
    const g = m.geometry;
    const key = [mat.uuid, m.castShadow ? 1 : 0, m.receiveShadow ? 1 : 0, m.renderOrder, m.frustumCulled ? 1 : 0, g.index ? 'i' : 'n', Object.keys(g.attributes).sort().join(',')].join('|');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(m);
  }
  let before = 0, after = 0;
  for (const list of groups.values()) {
    if (list.length < 2) continue;
    const parts = list.map(m => { const g = m.geometry.clone(); g.applyMatrix4(m.matrixWorld); return g; });
    const merged = mergeGeometries(parts, false);
    if (!merged) continue;                                                  // incompatible attribute layout: leave the originals alone
    const first = list[0], out = new THREE.Mesh(merged, first.material);
    out.castShadow = first.castShadow; out.receiveShadow = first.receiveShadow; out.renderOrder = first.renderOrder; out.frustumCulled = first.frustumCulled;
    for (const m of list) { const parent = m.parent; m.removeFromParent(); if (parent && parent !== scene && parent.children.length === 0) parent.removeFromParent(); }
    scene.add(out);
    before += list.length; after++;
  }
  return { before, after };
}
