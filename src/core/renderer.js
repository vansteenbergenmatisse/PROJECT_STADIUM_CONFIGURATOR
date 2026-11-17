// @ts-check
/**
 * @fileoverview core/renderer: createRenderer: the WebGLRenderer (shadows, tone mapping, pixel ratio) appended to the page.
 *
 * WHY: renderer set-up is independent of the scene content and must exist before any texture reads the anisotropy limit or the sky is baked.
 * BUILDS: 1 WebGLRenderer (its canvas is appended to document.body).
 * DEPENDS ON: three.
 * USED BY: core/ctx.js.
 * LIFECYCLE: created once at boot; never disposed (the page never unmounts). The resize listener lives in src/core/loop.js.
 * UNITS / CONVENTIONS: pixel ratio is capped at 1.5 on screens narrower than 760 px, else 2; read once at load.
 * NOT HERE: scene, camera and lights (core/scene.js, core/lighting.js).
 */
import * as THREE from 'three';

/**
 * Create the renderer and add its canvas to the page.
 * Side effects: appends renderer.domElement to document.body.
 * @returns {{renderer: THREE.WebGLRenderer, MAX_ANISO: number}} the renderer and the texture anisotropy limit (max 16).
 */
export function createRenderer() {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 760 ? 1.5 : 2));   // phones: cap at 1.5 to keep the frame rate usable
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;           // (shadow.radius is ignored by PCFSoft in r160, so it is not set)
  renderer.toneMapping = THREE.ACESFilmicToneMapping;          // A/B tested against AgX: AgX desaturated seats + grass here
  renderer.toneMappingExposure = 0.9;
  const MAX_ANISO = Math.min(16, renderer.capabilities.getMaxAnisotropy());
  document.body.appendChild(renderer.domElement);
  return { renderer, MAX_ANISO };
}
