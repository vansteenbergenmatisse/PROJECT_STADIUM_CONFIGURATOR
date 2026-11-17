// @ts-check
/**
 * @fileoverview core/ctx: createCtx: builds the long-lived shared context passed to every world builder.
 *
 * WHY: builders take one ctx object instead of reaching for module-level globals, so each can live in its own file.
 * BUILDS: the renderer and the scene (through core/renderer.js and core/scene.js).
 * DEPENDS ON: core/renderer.js, core/scene.js, core/rng.js, core/textures.js.
 * USED BY: src/main.js, then every buildX(ctx).
 * LIFECYCLE: created once at boot, never replaced. ctx.rand is THE shared seeded generator (see core/rng.js).
 * UNITS / CONVENTIONS: see the pieces.
 * NOT HERE: mutable UI state (src/state/state.js).
 */
import { createRenderer } from './renderer.js';
import { createScene } from './scene.js';
import { rand } from './rng.js';
import { makeCanvasTex } from './textures.js';

/**
 * Create the renderer, the scene and the shared helpers.
 * @returns {{renderer: any, MAX_ANISO: number, scene: any, camera: any, controls: any, fitFov: () => void, envTex: any, rand: () => number, canvasTex: Function}} the ctx.
 */
export function createCtx() {
  const { renderer, MAX_ANISO } = createRenderer();
  const { scene, camera, controls, fitFov, envTex } = createScene(renderer);
  return { renderer, MAX_ANISO, scene, camera, controls, fitFov, envTex, rand, canvasTex: makeCanvasTex(MAX_ANISO) };
}
