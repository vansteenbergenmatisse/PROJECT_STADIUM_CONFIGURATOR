// @ts-check
/**
 * @fileoverview core/loop: prepareStaticScene (resize listener, first camera frame, shadow bake, matrix freeze) and startLoop (the per-frame render loop).
 *
 * WHY: the scene is almost entirely static, so before the first frame the page bakes ONE shadow map (sun and casters never move), turns on image-based light for matte materials,
 *      freezes the object matrices (matrixAutoUpdate = false) and fixes the instanced bounds. Everything that moves at runtime is marked userData.dynamic and skipped by the freeze.
 *      The loop order below is the ORIGINAL order and matters: tween -> controls -> fans -> match -> sky -> head turn -> scoreboard -> render -> cart picture.
 * BUILDS: nothing new; it changes flags on existing objects.
 * DEPENDS ON: src/state/state.js.
 * USED BY: src/main.js (prepareStaticScene, then after one yield startLoop).
 * LIFECYCLE: prepareStaticScene runs once before the first frame (registers the resize listener through the listener group). startLoop installs renderer.setAnimationLoop; the loop runs for the life of the page.
 *            The shadow map is re-armed only by the roof toggle (interaction/roof-control.js).
 * UNITS / CONVENTIONS: dt in seconds, clamped to 0.1; `now` in milliseconds (performance.now); fans, sky and the camera tween use wall-clock time. Soft sky ambient: matte materials get envMapIntensity 0.2
 *                      (r160 has no scene.environmentIntensity); glossy materials (seats, glass, cars) keep their own explicit envMap and intensity.
 * NOT HERE: what is updated each frame (it is passed in), the boot marks (src/main.js).
 */
import { state } from '../state/state.js';

/**
 * Set up everything that must happen once before the first frame.
 * Side effects: registers the resize listener; sets the camera to the start frame; bakes the shadow map; edits materials and matrices of the whole scene.
 * @param {{renderer: any, scene: any, camera: any, controls: any, fitFov: () => void, envTex: any}} ctx - shared context (core/ctx.js).
 * @param {{on: Function}} listeners - listener group (core/listeners.js).
 * @param {{pos: number[], tgt: number[]}} startView - the first camera frame (the top-down overview).
 */
export function prepareStaticScene({ renderer, scene, camera, controls, fitFov, envTex }, listeners, startView) {
  listeners.on(window, 'resize', () => { fitFov(); renderer.setSize(innerWidth, innerHeight); });   // also fires on phone rotation
  camera.position.set(...startView.pos); controls.target.set(...startView.tgt); controls.update();   // first frame = top view
  // static-scene optimisations: bake the shadow map once (sun + casters never move; re-armed by the roof toggle),
  // bake object matrices, and make sure instanced bounds reflect the final matrices
  renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = true;
  // soft sky ambient (image-based) for matte materials, kept low per material because r160 has no scene.environmentIntensity;
  // glossy materials (seats, glass, cars) keep their own explicit envMap + intensity
  scene.environment = envTex;
  scene.traverse(o => { const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : []; for (const m of ms) if (m.isMeshStandardMaterial && m.envMap == null && !m.userData.noIBL) m.envMapIntensity = 0.2; });
  scene.traverse(o => { if (o.userData.dynamic) return; if (o.isInstancedMesh) o.computeBoundingSphere(); o.updateMatrix(); o.matrixAutoUpdate = false; });
  scene.updateMatrixWorld(true);
}

/**
 * Start the render loop.
 * Side effects: renderer.setAnimationLoop; reads and clears state.tween and state.thumbWanted.
 * @param {{renderer: any, scene: any, camera: any, controls: any}} ctx - shared context (core/ctx.js).
 * @param {{fansUpdate?: (tSec: number) => void, updateSky: (tSec: number) => void, match: {update: (dt: number) => void}, updateLook: () => void, updateScore: () => void, checkout: {captureThumb: (renderer: any) => void}, mark: (name: string) => void}} frame - per-frame callbacks and the boot mark function.
 */
export function startLoop({ renderer, scene, camera, controls }, { fansUpdate, updateSky, match, updateLook, updateScore, checkout, mark }) {
  let lastT = performance.now(), firstRender = true;
  renderer.setAnimationLoop(() => {
    const now = performance.now(), dt = Math.min(0.1, (now - lastT) / 1000); lastT = now;
    if (state.tween) {
      const k = Math.min(1, (now - state.tween.t0) / state.tween.ms), e = state.tween.ease(k);
      camera.position.lerpVectors(state.tween.p0, state.tween.p1, e); controls.target.lerpVectors(state.tween.a0, state.tween.a1, e);
      if (k >= 1) state.tween = null;
    }
    controls.update();
    if (fansUpdate) fansUpdate(now / 1000);
    match.update(dt); updateSky(now / 1000); updateLook(); updateScore();
    renderer.render(scene, camera);
    if (firstRender) { firstRender = false; mark('first render call'); }
    if (state.thumbWanted && state.buy) checkout.captureThumb(renderer);       // copy this finished frame (cover-cropped square) into the cart picture
  });
}
