// @ts-check
/**
 * @fileoverview world/markers: the highlight markers: 2 skybox boxes (hover, selected) and 4 parking-lot strips.
 *
 * WHY: they are scene objects (so they belong with the world builders and must be added in the original scene order) but they are switched by the selection / hover code through `visible` and `position`.
 *      Parking lots are not selectable on the page, but the lot highlight code and its state fields are kept (CLAUDE.md: parking is not selectable).
 * BUILDS: 2 Meshes (box SUITE_W x (BOX_H + 0.2) x BOX_DEPTH, orange, opacity 0.28 hover / 0.5 selected, hidden) and 4 ringStrip Meshes (E, S, W, N arcs of the parking ring, orange 0.32, hidden). All userData.dynamic or renderOrder 3.
 * DEPENDS ON: three, config/constants.js, core/geometry.js, src/state/state.js (updateLots reads the hover / selection lot).
 * USED BY: src/main.js (builds them), src/interaction/selection.js, src/interaction/hover.js.
 * LIFECYCLE: built once at boot, after the trees and before the match (scene order); never disposed.
 * UNITS / CONVENTIONS: metres, y up; LOT_ARC holds [start, end] plan angles (radians) of each lot; E is centred on +x, S on +z, W on -x, N on -z.
 * NOT HERE: which marker is shown when (selection.js, hover.js).
 */
import * as THREE from 'three';
import { BOX_H, BOX_DEPTH, Y1, PARK_IN, PARK_OUT } from '../config/constants.js';
import { ringStrip } from '../core/geometry.js';
import { state } from '../state/state.js';

/** Plan angle range [start, end] (radians) of each parking lot; the four arcs tile the parking ring. */
export const LOT_ARC = { E: [-Math.PI / 4, Math.PI / 4], S: [Math.PI / 4, 3 * Math.PI / 4], W: [3 * Math.PI / 4, 5 * Math.PI / 4], N: [5 * Math.PI / 4, 7 * Math.PI / 4] };

/**
 * Build the suite markers and the lot strips.
 * Side effects: adds 2 + 4 hidden Meshes to ctx.scene, in this order (hover marker, selected marker, lots E S W N).
 * @param {{scene: any}} ctx - shared context (core/ctx.js).
 * @param {{suites: any[], SUITE_W: number}} deps - skybox list and the width of one suite (world/skyboxes.js).
 * @returns {{hoverMarker: any, selMarker: any, placeMarker: (m: any, u: number) => void, lotMesh: Record<string, any>, updateLots: () => void}} the markers and their control functions.
 */
export function buildMarkers({ scene }, { suites, SUITE_W }) {
  /* ---- highlight markers (suites, parking lots) ---- */
  const markerMat = (o) => new THREE.MeshBasicMaterial({ color: 0xff8a1f, transparent: true, opacity: o, depthWrite: false });
  const mkMarker = o => { const m = new THREE.Mesh(new THREE.BoxGeometry(SUITE_W, BOX_H + 0.2, BOX_DEPTH), markerMat(o)); m.visible = false; m.userData.dynamic = true; m.renderOrder = 3; scene.add(m); return m; };
  const hoverMarker = mkMarker(0.28), selMarker = mkMarker(0.5);
  /** Move marker `m` onto suite `u` (facing outward), or hide it for u < 0. */
  function placeMarker(m, u) {
    if (u < 0) { m.visible = false; return; }
    const s = suites[u]; m.position.set(s.x, Y1 + BOX_H / 2, s.z); m.rotation.set(0, Math.atan2(s.nx, s.nz), 0); m.visible = true;
  }
  const lotMesh = {};
  for (const k of Object.keys(LOT_ARC)) {
    const m = ringStrip([{ d: PARK_IN, y: 0.34 }, { d: PARK_OUT, y: 0.34 }], new THREE.MeshBasicMaterial({ color: 0xff8a1f, transparent: true, opacity: 0.32, depthWrite: false, side: THREE.DoubleSide }),
      { N: 120, t0: LOT_ARC[k][0], t1: LOT_ARC[k][1], cast: false, receive: false });
    m.visible = false; m.renderOrder = 3; scene.add(m); lotMesh[k] = m;
  }
  /** Show only the lot strips that are hovered or selected. */
  function updateLots() { for (const k in lotMesh) lotMesh[k].visible = k === state.hoverLot || k === state.selLot; }
  return { hoverMarker, selMarker, placeMarker, lotMesh, updateLots };
}
