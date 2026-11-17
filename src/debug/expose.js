// @ts-check
/**
 * @fileoverview debug/expose: exposeDebug: assigns window.__stadium, the inspection handle used by the visual tests.
 *
 * WHY: tests and the browser tool need to read the scene and drive the navigation without simulating clicks. The key set is part of the test contract and is kept exactly as before:
 *      scene, sun, renderer, camera, controls, seats, seatInfo, seatCount, seatPrice, tiers, tierRange, nav, suites, go, tables, selectSection, selectSeat, selectSuite, selectLot.
 *      NOTE: selectSeat here BYPASSES the availability guard (that guard is in the pointer-up handler in interaction/input.js).
 * BUILDS: nothing.
 * DEPENDS ON: nothing.
 * USED BY: src/main.js.
 * LIFECYCLE: called once at the end of boot.
 * UNITS / CONVENTIONS: go('descent') starts the descent; any other name goes to the overview.
 * NOT HERE: window.__boot (src/main.js, created before the first await) and window.__parkedCars (world/parking.js).
 */

/**
 * Assign window.__stadium.
 * Side effects: sets one global (a debug handle, not read by the page itself).
 * @param {{scene: any, sun: any, renderer: any, camera: any, controls: any, seats: any, seatInfo: any, seatCount: number, seatPrice: any, tiers: any[], tierRange: number[][], nav: {level: string}, suites: any[], tables: object, goOverview: () => void, descent: () => void, selectSection: Function, selectSeat: Function, selectSuite: Function, selectLot: Function}} h - the objects and functions to expose.
 */
export function exposeDebug({ scene, sun, renderer, camera, controls, seats, seatInfo, seatCount, seatPrice, tiers, tierRange, nav, suites, tables, goOverview, descent, selectSection, selectSeat, selectSuite, selectLot }) {
  window.__stadium = { scene, sun, renderer, camera, controls, seats, seatInfo, seatCount, seatPrice, tiers, tierRange, nav, suites, go: n => (n === 'descent' ? descent() : goOverview()),
    tables, selectSection, selectSeat, selectSuite, selectLot };
}
