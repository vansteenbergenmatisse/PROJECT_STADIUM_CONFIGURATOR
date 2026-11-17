// @ts-check
/**
 * @fileoverview core/scene: createScene: the Scene (fog, clear colour), the baked sky reflection map, the camera and the camera rig object.
 *
 * WHY: these four belong together: the PMREM env map is baked from a Sky shader once, the camera field of view depends on the window shape, and the rig object is what flyTo moves.
 * BUILDS: 1 Scene, 1 PerspectiveCamera, the controls look-at shim, 1 PMREM environment texture (envTex).
 * DEPENDS ON: three, three/addons Sky, core/lighting.js (SUN_POS).
 * USED BY: core/ctx.js.
 * LIFECYCLE: envTex is baked once and shared (seats, glass, facade glazing, scene.environment); fitFov is called again by the resize handler in src/core/loop.js.
 * UNITS / CONVENTIONS: camera: near 1 m, far 3200 m, start fov 45; fitFov widens the vertical fov on tall screens (cap 75 deg).
 * NOT HERE: sky dome, clouds and lights (world/sky.js, core/lighting.js).
 */
import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { SUN_POS } from './lighting.js';

/**
 * Create the scene, the sky env map, the camera and the camera rig object.
 * @param {THREE.WebGLRenderer} renderer - used to bake the PMREM env map and for the clear colour.
 * @returns {{scene: THREE.Scene, camera: THREE.PerspectiveCamera, controls: {target: THREE.Vector3, update: () => void}, fitFov: () => void, envTex: THREE.Texture}} the pieces of the ctx.
 */
export function createScene(renderer) {
  const scene = new THREE.Scene();
  scene.background = null;                                            // the visible sky is the Sky mesh below (follows the camera)
  renderer.setClearColor(0x8fc0ee);
  scene.fog = new THREE.FogExp2(0xd3e5f6, 0.00042);                   // light blue haze for distant ground
  // Sky parameters for the baked reflection map (the VISIBLE sky is the custom gradient dome further down).
  const SKY = { turbidity: 6, rayleigh: 2, mie: 0.005, mieG: 0.8 };      // used for the baked reflection map only (unchanged from the verified look)
  function applySky(sky) {
    const u = sky.material.uniforms;
    u.turbidity.value = SKY.turbidity; u.rayleigh.value = SKY.rayleigh; u.mieCoefficient.value = SKY.mie; u.mieDirectionalG.value = SKY.mieG;
    u.sunPosition.value.copy(SUN_POS).normalize();
  }
  // Procedural sky baked once into a PMREM env map. It is NOT scene.environment
  // (r160 has no scene.environmentIntensity, so that washes out every matte material); only glossy materials use it.
  let envTex;
  {
    const sky = new Sky(); sky.scale.setScalar(10000); applySky(sky);
    const envScene = new THREE.Scene(); envScene.add(sky);
    const pm = new THREE.PMREMGenerator(renderer);
    envTex = pm.fromScene(envScene).texture;
    pm.dispose();
  }
  const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 1, 3200);
  // Tall screens (phones in portrait) get a wider vertical field of view so the stadium is not cropped sideways: keeps about 1.5x the horizontal view of a square window, capped at 75 deg.
  function fitFov() { const a = innerWidth / innerHeight; camera.fov = a >= 1.2 ? 45 : Math.min(75, 2 * Math.atan(Math.tan(22.5 * Math.PI / 180) * 1.5 / a) * 180 / Math.PI); camera.aspect = a; camera.updateProjectionMatrix(); }
  fitFov();
  camera.position.set(-230, 170, 250);
  // Fixed camera rig: no orbit / pan / zoom. It only moves through flyTo() when the user clicks something in the stadium.
  const controls = { target: new THREE.Vector3(), update() { camera.lookAt(this.target); } };
  return { scene, camera, controls, fitFov, envTex };
}
