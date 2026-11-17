// @ts-check
/**
 * @fileoverview ui/ticket-card: ticketCard: the white ticket-card markup shared by the hover card and the seat card in the selection panel.
 *
 * WHY: both places show the same layout (label + main line on the left, unit + price on the right, optional footer line), so the markup lives once.
 * BUILDS: nothing (returns an HTML string).
 * DEPENDS ON: nothing.
 * USED BY: src/ui/hover-card.js, src/ui/price-panel.js.
 * LIFECYCLE: pure function.
 * UNITS / CONVENTIONS: every argument is built by our own code from tier names, numbers and formatted prices, never from user-typed text, so the string is safe to assign with innerHTML.
 *                      If a future caller passes user input, escape it first (see esc() in src/ui/checkout.js).
 * NOT HERE: which text to show (price-panel.js, hover-card.js).
 */

/**
 * Build the ticket card HTML.
 * @param {string} label - small caption (tier and section).
 * @param {string} main - bold main line (row and seat, or section).
 * @param {string} unit - small caption over the price (for example "per seat").
 * @param {string} price - the price text (already formatted).
 * @param {string} [foot] - optional footer line (range or hint).
 * @returns {string} HTML for one card.
 */
export const ticketCard = (label, main, unit, price, foot) =>
  `<div class="tk"><div class="tk-l"><small>${label}</small><b>${main}</b></div><div class="tk-r"><small>${unit}</small><em>${price}</em></div></div>` + (foot ? `<div class="tk-foot">${foot}</div>` : '');
