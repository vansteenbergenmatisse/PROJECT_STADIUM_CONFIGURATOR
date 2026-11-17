// @ts-check
/**
 * @fileoverview interaction/input: wireInput: every keyboard and pointer handler of the page (shortcuts, panel and pop-up buttons, head turn, hover, click-to-select).
 *
 * WHY: one place lists what the user can do. The handlers only translate an event into a call (selection, rig.turnHead, checkout, hover) and apply the guards:
 *      a click counts only if the pointer moved <= 6 px between down and up (a drag is a head turn, not a pick); SECTION FIRST: a click on a seat outside the selected block selects the block,
 *      and inside it only an AVAILABLE seat (plain orange) can be selected; keyboard shortcuts are ignored while typing or while the checkout is open (except Esc).
 * BUILDS: nothing.
 * DEPENDS ON: src/state/state.js.
 * USED BY: src/main.js.
 * LIFECYCLE: registers all listeners once, through the shared listener group (src/core/listeners.js), so one abort() would remove them. Hover work is throttled to one pick per animation frame (pendingMove).
 * UNITS / CONVENTIONS: keys: Esc = back (closes the checkout first), D = descent, R = roof, arrow keys = head turn at the seat level (0.09 rad yaw, 0.05 rad pitch per press), H = fold cards (ui/fold-buttons.js).
 *                      Pointer drag at the seat level: -0.006 rad yaw per px horizontally, 0.004 rad pitch per px vertically.
 * NOT HERE: what a selection does (selection.js), the camera maths (camera-rig.js), the hover card text (ui/hover-card.js), the fold shortcut (ui/fold-buttons.js).
 */
import { state } from '../state/state.js';

/**
 * Register all keyboard and pointer handlers.
 * Side effects: adds listeners on window, the canvas, #panel and #modal through `listeners`.
 * @param {{on: Function}} listeners - listener group (core/listeners.js).
 * @param {{canvas: HTMLElement, panel: HTMLElement, modalEl: HTMLElement}} els - the WebGL canvas, the price panel and the pop-up element.
 * @param {{pick: (x: number, y: number) => any, setHover: (h: any) => void, selection: any, rig: {turnHead: (dyaw: number, dpitch: number) => void}, hoverCard: {show: Function, hide: Function}, checkout: {startBuy: () => void, closeBuy: () => void, onModalClick: Function}, isAvail: (i: number) => boolean, toggleRoof: () => void}} deps - the modules the handlers call.
 */
export function wireInput(listeners, { canvas, panel, modalEl }, { pick, setHover, selection, rig, hoverCard, checkout, isAvail, toggleRoof }) {
  const nav = state.nav, look = state.look;
  const { back, goOverview, descent, viewFromSuite, selectSection, selectSeat, selectSuite, selectLot, inSectionView, keyOf } = selection;
  const { turnHead } = rig, { startBuy, closeBuy, onModalClick } = checkout;
  listeners.on(window, 'keydown', e => {
    const typing = (e.target && e.target.matches && e.target.matches('input,textarea,select')) || state.buy;          // pop-up open: no shortcuts except Esc
    if (e.key === 'Escape') { if (state.buy) closeBuy(); else nav.level === 'overview' ? goOverview() : back(); }
    else if (typing) return;
    else if (e.key === 'd' || e.key === 'D') descent();
    else if (e.key === 'r' || e.key === 'R') toggleRoof();
  });
  listeners.on(modalEl, 'click', e => onModalClick(e, goOverview));
  listeners.on(panel, 'click', e => {
    const a = e.target.closest('[data-act]'); if (!a) return;
    const act = a.dataset.act;
    if (act === 'back') back(); else if (act === 'suite-eye') viewFromSuite();
    else if (act === 'buy') startBuy();
  });
  /* ---- head turn: drag (pointer) or the arrow keys, at the seat level only ---- */
  listeners.on(canvas, 'pointerdown', e => { if (nav.level === 'seat') look.drag = [e.clientX, e.clientY]; });
  listeners.on(window, 'pointermove', e => { if (look.drag && nav.level === 'seat' && e.buttons) { turnHead(-(e.clientX - look.drag[0]) * 0.006, (e.clientY - look.drag[1]) * 0.004); look.drag = [e.clientX, e.clientY]; } });
  listeners.on(window, 'pointerup', () => { look.drag = null; });
  listeners.on(window, 'keydown', e => { if (nav.level !== 'seat' || state.buy || (e.target.matches && e.target.matches('input,textarea,select'))) return; if (e.key === 'ArrowLeft') turnHead(0.09, 0); else if (e.key === 'ArrowRight') turnHead(-0.09, 0); else if (e.key === 'ArrowUp') turnHead(0, 0.05); else if (e.key === 'ArrowDown') turnHead(0, -0.05); });
  /* ---- hover (one pick per animation frame) and click-to-select ---- */
  let pendingMove = null;
  listeners.on(canvas, 'pointermove', e => {
    const first = !pendingMove; pendingMove = e;
    if (first) requestAnimationFrame(() => {
      const ev = pendingMove; pendingMove = null;
      const h = pick(ev.clientX, ev.clientY); setHover(h);
      if (!h) { hoverCard.hide(); canvas.style.cursor = 'default'; return; }
      canvas.style.cursor = 'pointer';
      hoverCard.show(h, ev);
    });
  });
  listeners.on(canvas, 'pointerleave', () => { setHover(null); hoverCard.hide(); });
  let down = null;
  listeners.on(canvas, 'pointerdown', e => { down = [e.clientX, e.clientY]; });
  listeners.on(canvas, 'pointerup', e => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6) return;
    const h = pick(e.clientX, e.clientY); if (!h) return;
    hoverCard.hide();
    if (h.type === 'seat') {
      const k = keyOf(h.id);
      if (!inSectionView() || k !== state.selKey) { const [ti, s] = k.split(':').map(Number); selectSection(ti, s); } else if (isAvail(h.id)) selectSeat(h.id);   // k = "tier:section" zero-based = (seatTier - 1, seatSection - 1); section first, then an AVAILABLE seat inside it (other colours are not for sale)
    } else if (h.type === 'suite') selectSuite(h.u); else selectLot(h.lot);
  });
}
