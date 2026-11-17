// @ts-check
/**
 * @fileoverview ui/scoreboard-view: createScoreboardView: shows the simulated match's score and clock in the #scorecard card.
 *
 * WHY: the per-frame updateScore() touched the DOM directly. It now lives in the UI layer and only reads the match handle, so the simulation stays DOM-free.
 *      It writes to the DOM only when a value changed (cached lastScore / lastClock), which keeps the per-frame cost near zero.
 * BUILDS: nothing (uses the existing #scorecard, #sc-score, #sc-clock elements of index.html).
 * DEPENDS ON: src/sim/scoreboard-model.js (text formats).
 * USED BY: src/main.js (creates it), src/core/loop.js (calls updateScore every frame).
 * LIFECYCLE: created once at boot; no listeners. The card is hidden while the match is not running and the cached texts are reset so a new match starts clean.
 * UNITS / CONVENTIONS: clock = whole seconds since you sat down (wall clock from the match handle).
 * NOT HERE: the match (src/sim/match.js), the fold button of the card (src/ui/fold-buttons.js).
 */
import { scoreText, scoreLabel, clockText } from '../sim/scoreboard-model.js';

/**
 * Create the scoreboard view.
 * @param {{active: boolean, score: number[], clock: number}} match - the match handle (sim/match.js).
 * @returns {{updateScore: () => void}} updateScore is called once per frame by the loop.
 */
export function createScoreboardView(match) {
  const scEl = document.getElementById('scorecard'), scScore = document.getElementById('sc-score'), scClock = document.getElementById('sc-clock'); let lastScore = '', lastClock = '';
  function updateScore() {                                         // the live scoreboard: visible while the simulated match runs; clock = seconds since you sat down
    if (!match.active) { if (!scEl.hidden) scEl.hidden = true; lastScore = lastClock = ''; return; }
    const sc = match.score, txt = scoreText(sc);
    if (txt !== lastScore) { lastScore = txt; scScore.textContent = txt; scEl.setAttribute('aria-label', scoreLabel(sc)); }
    const clk = clockText(Math.floor(match.clock));
    if (clk !== lastClock) { lastClock = clk; scClock.textContent = clk; }
    if (scEl.hidden) scEl.hidden = false;
  }
  return { updateScore };
}
