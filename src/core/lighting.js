// @ts-check
/**
 * @fileoverview core/lighting: SUN_POS and buildLighting: hemisphere light, the one shadow-casting sun, and the cool fill light.
 *
 * WHY: one vector (SUN_POS) drives the sun light, the sky and the shadow frustum; the light rig is independent of the scene content.
 * BUILDS: 1 HemisphereLight, 1 DirectionalLight (sun, 4096 shadow map, +-340 m) plus its target, 1 fill DirectionalLight (no shadow).
 * DEPENDS ON: three.
 * USED BY: core/scene.js and world/sky.js (SUN_POS), src/main.js.
 * LIFECYCLE: built once after the sky; the shadow map is baked once in src/core/loop.js (prepareStaticScene) (renderer.shadowMap.autoUpdate = false) and re-armed only by the roof toggle.
 * UNITS / CONVENTIONS: SUN_POS in metres; sun placed 600 m along it; shadow camera box 640 m deep (near 280, far 920).
 * NOT HERE: the shadow bake / freeze (src/core/loop.js).
 */
import * as THREE from 'three';

/** One vector drives the sun light, the sky and the shadow frustum. */
export const SUN_POS = new THREE.Vector3(-260, 190, 170);

/**
 * Add the hemisphere light, the sun and the fill light to the scene.
 * Side effects: adds 4 objects to ctx.scene.
 * @param {{scene: THREE.Scene}} ctx - shared context.
 * @returns {{sun: THREE.DirectionalLight}} the sun (exposed on window.__stadium).
 */
export function buildLighting(ctx) {
  const { scene } = ctx;
  scene.add(new THREE.HemisphereLight(0xa9c6e6, 0x7a6644, 0.62));        // sky / ground bounce: lifts the dark stand shadows (was 0.45)
  const sun = new THREE.DirectionalLight(0xffd29c, 3.2);         // warm low sun, ~25° elevation
  { // sun at a fixed distance along SUN_POS, target at the bowl centre, shadow box fitted to the scene's depth range
    const dir = SUN_POS.clone().normalize();
    sun.position.copy(dir).multiplyScalar(600); sun.target.position.set(0, 0, 0);
    sun.castShadow = true;
    sun.shadow.mapSize.set(4096, 4096);
    Object.assign(sun.shadow.camera, { left: -340, right: 340, top: 340, bottom: -340, near: 280, far: 920 });   // 640 m depth (was 1090)
    sun.shadow.camera.updateProjectionMatrix();
    sun.shadow.bias = -0.0002; sun.shadow.normalBias = 0.15;      // scaled to ~0.16 m texels; was 0.4 (lifted shadows off the risers)
    scene.add(sun, sun.target);
  }
  /* NOTE (batch 19): a 'shadow focus' that re-fitted the shadow frustum to +-170 m inside the bowl (2x sharper texels) was tried and REMOVED: re-baking the frozen map stalled the first
     frame of a flight (741 ms in the test browser). The map stays one +-340 m bake at load. */
  // cool sky-coloured fill from the side opposite the sun (no shadow): gives shaded faces a hint of blue instead of flat grey, nearly free
  { const fill = new THREE.DirectionalLight(0x8fb4ff, 0.4); fill.position.set(SUN_POS.x * -1, 90, SUN_POS.z * -1); scene.add(fill); }
  return { sun };
}
