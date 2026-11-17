// @ts-check
/**
 * @fileoverview sim/scoreboard-model: pure text formats of the live scoreboard (score pill, clock pill, aria-label), with no DOM.
 *
 * WHY: the strings were built inline in the per-frame updateScore(). Keeping the formats as pure functions separates "what the scoreboard says" (testable) from "which element shows it" (src/ui/scoreboard-view.js).
 * BUILDS: nothing.
 * DEPENDS ON: nothing.
 * USED BY: src/ui/scoreboard-view.js.
 * LIFECYCLE: pure functions, no state.
 * UNITS / CONVENTIONS: score is [Barcelona, Dortmund]; the clock input is whole seconds since the simulated match started; the clock format is MM:SS (minutes are not capped at 99).
 * NOT HERE: the match itself (src/sim/match.js) and the DOM (src/ui/scoreboard-view.js).
 */

/**
 * Format the score pill text.
 * @param {number[]} score - [home goals, away goals].
 * @returns {string} for example "0 - 0".
 */
export const scoreText = score => `${score[0]} - ${score[1]}`;

/**
 * Format the accessible name of the scoreboard card.
 * @param {number[]} score - [home goals, away goals].
 * @returns {string} sentence read by screen readers.
 */
export const scoreLabel = score => `Simulated match: Barcelona ${score[0]}, Dortmund ${score[1]}`;

/**
 * Format the clock pill text.
 * @param {number} seconds - whole seconds since the match started (already floored by the caller).
 * @returns {string} MM:SS, for example "01:05".
 */
export const clockText = seconds => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
