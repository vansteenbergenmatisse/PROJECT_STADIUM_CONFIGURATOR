// @ts-check
/**
 * @fileoverview core/materials: two tiny MeshStandardMaterial factories (std = front side, dbl = double sided).
 *
 * WHY: dozens of builders create matte standard materials with the same defaults; one definition keeps them identical.
 * BUILDS: nothing (factories).
 * DEPENDS ON: three.
 * USED BY: world/* builders, src/main.js.
 * LIFECYCLE: each call makes a NEW material owned by the caller; the page never disposes materials.
 * UNITS / CONVENTIONS: colour = 0xRRGGBB number; options override the defaults (roughness 0.85, metalness 0).
 * NOT HERE: textured / glossy special materials stay in their builder.
 */
import * as THREE from 'three';

/** Matte standard material. */
export const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, ...o });
/** Same, double sided. */
export const dbl = (color, o = {}) => std(color, { side: THREE.DoubleSide, ...o });
