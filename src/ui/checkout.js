// @ts-check
/**
 * @fileoverview ui/checkout: createCheckout: the demo checkout pop-up (#modal): cart, payment method, ticket details. A pure demo.
 *
 * WHY: the checkout owns a lot of markup and its own small state machine (state.buy.step: cart -> pay -> done). It is one module so the three screens, the cart maths and the form handling stay together.
 *      NOTHING is charged, stored or sent: the form values live only in state.buy until the ticket is shown, then the card fields are dropped; there is no fetch, no storage, no logging.
 * BUILDS: DOM only (innerHTML of #modal).
 *         SECURITY NOTE: every value the user can type (name, email, card, exp, cvv) is passed through esc() before it goes into the markup (text or a double-quoted attribute); the card fields are never
 *         echoed on the ticket. All other interpolated values come from our own code (tier names, seat numbers, prices, the EXTRAS table, the canvas picture as a data: URL).
 * DEPENDS ON: config/constants.js, data/bowl-math.js (sgnPow), data/pricing.js (CUR, SUITE_SEATS), src/state/state.js.
 * USED BY: src/main.js (creates it), src/interaction/selection.js (closeBuy), src/interaction/input.js (startBuy from the panel, onModalClick on #modal), src/core/loop.js (captureThumb).
 * LIFECYCLE: created once at boot. startBuy opens the pop-up and asks the loop for a picture (state.thumbWanted); closeBuy empties it. There are no listeners here: input.js registers the click handler on #modal
 *            and passes `onDone` (go back to the overview) so this module does not import the navigation code.
 * UNITS / CONVENTIONS: prices in euros (money() = two decimals); the promo code is the demo code DEMO10 = 10% off the tickets only (never the extras); extra seats are the next seats in the same row (up to 3 more, available only);
 *                      MADE-UP demo prices for the extras; the ticket entrance letter is the gate nearest to the seat's plan angle (A..D, same angles as the gate signs).
 * NOT HERE: the pop-up CSS (css/checkout.css), the panel buttons (price-panel.js), the picture capture trigger (core/loop.js decides when).
 */
import { A0, B0, EXP, RUN, TAU, tiers, ACCESS_ANGLES } from '../config/constants.js';
import { sgnPow } from '../data/bowl-math.js';
import { CUR, SUITE_SEATS } from '../data/pricing.js';
import { state } from '../state/state.js';

/**
 * Create the checkout.
 * @param {{seatTier: any, seatRow: any, seatNumber: any, seatSection: any, seatPos: any, seatPrice: any, sectionIds: Map<string, number[]>}} tables - seat tables (world/seats.js).
 * @param {{isAvail: (i: number) => boolean, suitePrice: (u: number) => number}} prices - display prices (data/display-prices.js).
 * @returns {{startBuy: () => void, closeBuy: () => void, onModalClick: (e: Event, onDone: () => void) => void, captureThumb: (renderer: any) => void}} the pop-up controls.
 */
export function createCheckout({ seatTier, seatRow, seatNumber, seatSection, seatPos, seatPrice, sectionIds }, { isAvail, suitePrice }) {
  const nav = state.nav;
  /* ---- demo checkout POP-UP: cart -> payment method -> ticket details. NOTHING is charged, stored or sent: the form values live only in this object until the ticket is shown,
     then are dropped. Card brands are plain text (no logos). The only promo code is the demo code DEMO10 (10% off). Extra seats are the next seats in the same row. */
  const modalEl = document.getElementById('modal');
  const esc = v => String(v).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const money = v => `${CUR}${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const ICON = { close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>', back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>',
    lock: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
    ball: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m12 8 3.5 2.5-1.3 4h-4.4l-1.3-4Z"/></svg>' };
  function gateFor(id) {                                          // entrance letter of the gate nearest to this seat (plan angle -> nearest ACCESS_ANGLES entry)
    const ti = seatTier[id] - 1, t = tiers[ti], d = t.d0 + (seatRow[id] - 1) * RUN + RUN / 2, x = seatPos[id * 3], z = seatPos[id * 3 + 2];
    const th = (Math.atan2(sgnPow(z / (B0 + d), EXP / 2), sgnPow(x / (A0 + d), EXP / 2)) + TAU) % TAU;
    let best = 0, bd = 9; ACCESS_ANGLES.forEach((a, i) => { const dd = Math.abs(th - a), m = Math.min(dd, TAU - dd); if (m < bd) { bd = m; best = i; } });
    return String.fromCharCode(65 + best);
  }
  function buyItem() {
    if (nav.level === 'seat' && state.selSeat >= 0) {
      const id = state.selSeat, ids = [id], row = seatRow[id], num = seatNumber[id], pool = sectionIds.get(state.selKey);
      for (let k = 1; k < 4; k++) { const nx = pool.find(i => seatRow[i] === row && seatNumber[i] === num + k); if (nx === undefined || !isAvail(nx)) break; ids.push(nx); }   // up to 3 more seats directly next to it
      return { kind: 'seat', ids, qty: 1, title: `${tiers[seatTier[id] - 1].name} tier · Section ${seatSection[id]}`, sub: `Row ${row}`, tier: tiers[seatTier[id] - 1].name };
    }
    if (nav.level === 'suite' && state.selSuite >= 0) { const u = state.selSuite; return { kind: 'suite', u, qty: 1, title: `Skybox ${u + 1}`, sub: `${SUITE_SEATS} seats`, tier: 'VIP' }; }
    return null;
  }
  const buyTotal = b => b.kind === 'suite' ? suitePrice(b.u) * SUITE_SEATS : b.ids.slice(0, b.qty).reduce((a, i) => a + seatPrice[i], 0);
  const buyDiscount = b => b.promo ? buyTotal(b) * 0.10 : 0;               // the promo code only applies to the tickets, never to extras
  /* ---- MATCHDAY EXTRAS (cart): what stadiums typically sell around a match (programme, scarf, shirt, hot food, drinks, ice cream, ...). The categories follow a quick web
     search (merch stands + central shop, food and drink concessions near the seats, programmes on sale); the PRICES ARE MADE-UP DEMO PRICES, not any club's price list.
     Grouped to match the plaza stalls (FOOD, DRINKS, PROGRAMMES, FAN SHOP, SCARVES, ICE CREAM). Nothing is charged or sent. */
  const EXTRAS = [
    { id: 'prog', g: 'Programmes', n: 'Match programme', p: 8 },
    { id: 'scarf', g: 'Fan shop', n: 'Club scarf', p: 22 }, { id: 'shirt', g: 'Fan shop', n: 'Replica shirt', p: 85 }, { id: 'cap', g: 'Fan shop', n: 'Cap', p: 18 }, { id: 'cush', g: 'Fan shop', n: 'Seat cushion', p: 10 },
    { id: 'burg', g: 'Food', n: 'Burger and chips', p: 12 }, { id: 'dog', g: 'Food', n: 'Hot dog', p: 7 }, { id: 'pie', g: 'Food', n: 'Pie', p: 6 }, { id: 'pop', g: 'Food', n: 'Popcorn', p: 5 },
    { id: 'soda', g: 'Drinks', n: 'Soft drink', p: 4 }, { id: 'beer', g: 'Drinks', n: 'Beer', p: 7 }, { id: 'cof', g: 'Drinks', n: 'Hot coffee', p: 4 },
    { id: 'ice', g: 'Ice cream', n: 'Ice cream', p: 5 }];
  const extrasCount = b => EXTRAS.reduce((a, x) => a + (b.extras[x.id] || 0), 0);
  const extrasTotal = b => EXTRAS.reduce((a, x) => a + (b.extras[x.id] || 0) * x.p, 0);
  function startBuy() {
    const it = buyItem(); if (!it) return;
    state.buy = { ...it, step: 'cart', extras: {}, promo: false, promoMsg: '', method: 'Mastercard', name: '', email: '', card: '', exp: '', cvv: '', err: '', order: '', thumb: '', when: null };
    state.thumbWanted = true; renderModal(); modalEl.hidden = false;
  }
  function closeBuy() { state.buy = null; modalEl.hidden = true; modalEl.innerHTML = ''; state.thumbWanted = false; }
  function readPayForm() {
    const v = id => { const e = document.getElementById(id); return e ? e.value : ''; };
    state.buy.name = v('f-name').trim(); state.buy.email = v('f-email').trim(); state.buy.card = v('f-card'); state.buy.exp = v('f-exp').trim(); state.buy.cvv = v('f-cvv').trim();
    const m = document.querySelector('input[name="method"]:checked'); if (m) state.buy.method = m.value;
  }
  function confirmPay() {
    readPayForm();
    const digits = state.buy.card.replace(/\D/g, '');
    if (!state.buy.name) state.buy.err = 'Enter the name for the ticket.';
    else if (!/^\S+@\S+\.\S+$/.test(state.buy.email)) state.buy.err = 'Enter a valid email.';
    else if (digits.length < 13 || digits.length > 19) state.buy.err = 'Enter a card number with 13 to 19 digits.';
    else if (!/^(0[1-9]|1[0-2])\s*\/\s*\d{2}$/.test(state.buy.exp)) state.buy.err = 'Enter the expiry date as MM/YY.';
    else if (!/^\d{3,4}$/.test(state.buy.cvv)) state.buy.err = 'Enter the 3 or 4 digit security code.';
    else { state.buy.err = ''; state.buy.step = 'done'; state.buy.card = state.buy.exp = state.buy.cvv = ''; state.buy.order = 'DEMO-' + Math.random().toString(36).slice(2, 8).toUpperCase(); state.buy.when = new Date(); }
    renderModal();
  }
  function barcodeSVG(str) {                                      // decorative bars derived from the order id (a demo pass, not a scannable code)
    let x = 0, bars = ''; for (let i = 0; i < str.length * 5; i++) { const w = 1 + ((str.charCodeAt(i % str.length) + i * 7) % 3); if (i % 2 === 0) bars += `<rect x="${x}" y="0" width="${w}" height="50"/>`; x += w; }
    return `<svg viewBox="0 0 ${x} 50" preserveAspectRatio="none" aria-hidden="true">${bars}</svg>`;
  }
  function renderModal() {
    const b = state.buy; if (!b) return;
    const total = buyTotal(b), disc = buyDiscount(b), xt = extrasTotal(b), pay = total - disc + xt;
    const seatsTxt = b.kind === 'seat' ? b.ids.slice(0, b.qty).map(i => seatNumber[i]).join(', ') : `${SUITE_SEATS} seats`;
    let h;
    if (b.step === 'cart') {
      const qty = b.kind === 'seat' ? `<div class="qty" role="group" aria-label="Number of seats"><button type="button" data-m="minus" aria-label="One seat fewer"${b.qty <= 1 ? ' disabled' : ''}>−</button><span>${b.qty}</span><button type="button" data-m="plus" aria-label="One seat more"${b.qty >= b.ids.length ? ' disabled' : ''}>+</button></div>` : '';
      h = `<div class="sheet" role="dialog" aria-modal="true" aria-labelledby="m-title"><div class="sheet-head"><h2 id="m-title">Your cart</h2><button class="iconbtn" data-m="close" aria-label="Close">${ICON.close}</button></div>
      <div class="cart-item"><div class="thumb" style="${b.thumb ? `background-image:url(${b.thumb})` : ''}" role="img" aria-label="${b.kind === 'seat' ? 'Your view from the seat' : 'Skybox'}"></div>
        <div class="ci-main"><div class="ci-title">${esc(b.title)}</div><div class="ci-sub"><span>${esc(b.sub)}</span><i></i><span>${b.kind === 'seat' ? 'Seat ' + esc(seatsTxt) : 'VIP'}</span></div></div>
        <div class="ci-price"><b>${money(total)}</b>${qty}</div></div>
      <div class="rule"></div><p class="m-label">Matchday extras</p><p class="m-note">Pick up at the stalls by your entrance. Demo prices.</p>
      <div class="xs">${(() => { let last = '', o = ''; for (const x of EXTRAS) { if (x.g !== last) { o += `<div class="xgrp">${x.g}</div>`; last = x.g; } const q = b.extras[x.id] || 0;
          o += `<div class="xrow"><span class="xn">${x.n}</span><span class="xp">${money(x.p)}</span><div class="qty" role="group" aria-label="${x.n}"><button type="button" data-m="xminus" data-x="${x.id}" aria-label="One ${x.n} fewer"${q <= 0 ? ' disabled' : ''}>−</button><span>${q}</span><button type="button" data-m="xplus" data-x="${x.id}" aria-label="One ${x.n} more">+</button></div></div>`; } return o; })()}</div>
      <div class="rule"></div><p class="m-label">Have a promotion code?</p>
      <div class="promo"><input id="f-promo" placeholder="Enter code" autocomplete="off" aria-label="Promotion code"><button class="btn" data-m="promo">Apply code</button></div>
      ${b.promoMsg ? `<p class="m-note ${b.promo ? 'ok' : 'bad'}" role="status">${esc(b.promoMsg)}</p>` : '<p class="m-note">Demo code: DEMO10 takes 10% off the tickets.</p>'}
      <div class="rule"></div><p class="m-label">Order summary</p>
      <div class="sum"><span>${b.kind === 'seat' ? b.qty + (b.qty === 1 ? ' seat' : ' seats') : '1 skybox'}</span><span>${money(total)}</span></div>
      ${xt ? `<div class="sum"><span>${extrasCount(b)} extra${extrasCount(b) === 1 ? '' : 's'}</span><span>${money(xt)}</span></div>` : ''}
      ${disc ? `<div class="sum"><span>Promo DEMO10</span><span>−${money(disc)}</span></div>` : ''}
      <div class="sum dashed"><b>Total:</b><b>${money(pay)}</b></div>
      <button class="btn btn--primary wide" data-m="to-pay">Confirm checkout</button></div>`;
    } else if (b.step === 'pay') {
      const meth = n => `<label class="method"><span>${n}</span><input type="radio" name="method" value="${n}"${b.method === n ? ' checked' : ''}></label>`;
      h = `<div class="sheet" role="dialog" aria-modal="true" aria-labelledby="m-title"><div class="sheet-head"><button class="iconbtn" data-m="back" aria-label="Back to the cart">${ICON.back}</button><h2 id="m-title">Payment method</h2><button class="iconbtn" data-m="close" aria-label="Close">${ICON.close}</button></div>
      <div class="methods">${meth('Mastercard')}${meth('Visa')}</div><div class="rule"></div><p class="m-label">Payment details</p>
      <label class="field"><span>Name on the ticket</span><input id="f-name" autocomplete="off" value="${esc(b.name)}" placeholder="Your name"></label>
      <label class="field"><span>Email</span><input id="f-email" type="email" autocomplete="off" value="${esc(b.email)}" placeholder="you@example.com"></label>
      <label class="field"><span>Card number</span><input id="f-card" inputmode="numeric" autocomplete="off" value="${esc(b.card)}" placeholder="Card number"></label>
      <div class="two"><label class="field"><span>Exp date</span><input id="f-exp" inputmode="numeric" autocomplete="off" value="${esc(b.exp)}" placeholder="MM/YY"></label><label class="field narrow"><span>CVV</span><input id="f-cvv" inputmode="numeric" autocomplete="off" value="${esc(b.cvv)}" placeholder="CVV"></label></div>
      ${b.err ? `<p class="m-note bad" role="alert">${esc(b.err)}</p>` : ''}
      <div class="rule"></div><button class="btn btn--primary wide" data-m="pay">Pay ${money(pay)}</button>
      <p class="secure">${ICON.lock}<span>Demo payment. Do not enter a real card. Nothing is charged, sent or stored.</span></p></div>`;
    } else {
      const it = b.kind === 'seat' ? b.ids[0] : -1, when = b.when;
      const rowTxt = b.kind === 'seat' ? `Row ${seatRow[it]}` : 'Suite', secTxt = b.kind === 'seat' ? `Section ${seatSection[it]}` : b.title, gate = b.kind === 'seat' ? gateFor(it) : 'A';
      h = `<div class="sheet dark" role="dialog" aria-modal="true" aria-labelledby="m-title"><div class="sheet-head"><button class="iconbtn" data-m="done" aria-label="Done">${ICON.back}</button><h2 id="m-title">Ticket's details</h2><span class="iconspace"></span></div>
      <div class="troute"><div class="tr-top"><div><small>Tier</small><b>${esc(b.tier)}</b></div><div class="tr-mid"><i></i><span class="tball">${ICON.ball}</span><i></i></div><div class="tr-r"><small>Where</small><b>${esc(b.kind === 'seat' ? secTxt : b.title)}</b></div></div>
        <div class="tr-bot"><div><small>Date</small><b>${when.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</b></div><div><small>Time</small><b>${when.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</b></div><div><small>Tickets</small><b>${b.kind === 'seat' ? b.qty : 1}</b></div></div></div>
      <div class="tpass"><div class="tpart"><div class="tp2"><div><small>Name</small><b>${esc(b.name)}</b></div><div class="r"><small>Seats</small><b>${esc(seatsTxt)}</b></div></div></div>
        <div class="tpart notched"><div class="tp3"><div><small>${b.kind === 'seat' ? 'Row' : 'Type'}</small><b>${esc(rowTxt)}</b></div><div><small>Entrance</small><b>${gate}</b></div><div class="r"><small>Paid</small><b>${money(pay)}</b></div></div>
          <div class="tp3"><div><small>Ticket</small><b>${esc(b.order)}</b></div><div><small>Method</small><b>${esc(b.method)}</b></div><div class="r"><small>Class</small><b>${esc(b.tier)}</b></div></div></div>
        <div class="tpart notched center"><p class="bp">ENTRY PASS · DEMO</p><div class="barcode">${barcodeSVG(b.order)}</div></div></div>
      ${extrasCount(b) ? `<p class="m-note light">Extras to collect: ${EXTRAS.filter(x => b.extras[x.id]).map(x => b.extras[x.id] + ' x ' + x.n).join(', ')}.</p>` : ''}
      <p class="m-note light">Demo ticket. No payment was taken, nothing was sent and this pass is not valid for entry.</p>
      <button class="btn btn--light wide" data-m="done">Done</button></div>`;
    }
    const keepScroll = modalEl.querySelector('.sheet') ? modalEl.querySelector('.sheet').scrollTop : 0;      // extras +/- re-render the sheet: keep the scroll position
    modalEl.innerHTML = h; const sh = modalEl.querySelector('.sheet'); if (sh && keepScroll) sh.scrollTop = keepScroll;
    const first = modalEl.querySelector(b.step === 'pay' ? '#f-name' : b.step === 'cart' ? '[data-m="to-pay"]' : '[data-m="done"]'); if (first && b.step !== 'cart') first.focus();
  }

  /** Click handler of #modal (registered by interaction/input.js): backdrop closes; data-m buttons drive the steps. `onDone` runs after the ticket's Done button (go back to the overview). */
  function onModalClick(e, onDone) {
    if (e.target === modalEl) { closeBuy(); return; }                                    // click on the dark backdrop closes
    const a = e.target.closest('[data-m]'); if (!a || !state.buy) return; const m = a.dataset.m;
    if (m === 'close') closeBuy();
    else if (m === 'minus') { state.buy.qty = Math.max(1, state.buy.qty - 1); renderModal(); }
    else if (m === 'plus') { state.buy.qty = Math.min(state.buy.ids.length, state.buy.qty + 1); renderModal(); }
    else if (m === 'xplus') { const id = a.dataset.x; state.buy.extras[id] = Math.min(9, (state.buy.extras[id] || 0) + 1); renderModal(); }
    else if (m === 'xminus') { const id = a.dataset.x; state.buy.extras[id] = Math.max(0, (state.buy.extras[id] || 0) - 1); renderModal(); }
    else if (m === 'promo') { const c = (document.getElementById('f-promo').value || '').trim().toUpperCase(); state.buy.promo = c === 'DEMO10'; state.buy.promoMsg = state.buy.promo ? 'Code DEMO10 applied: 10% off.' : (c ? 'That code is not valid.' : 'Enter a code first.'); renderModal(); }
    else if (m === 'to-pay') { state.buy.step = 'pay'; renderModal(); }
    else if (m === 'back') { readPayForm(); state.buy.step = 'cart'; renderModal(); }
    else if (m === 'pay') confirmPay();
    else if (m === 'done') { closeBuy(); onDone(); }
  }
  /** Called by the loop on a finished frame: copy it (cover-cropped square) into the cart picture. */
  function captureThumb(renderer) {
    state.thumbWanted = false; const c = document.createElement('canvas'), src = renderer.domElement, side = Math.min(src.width, src.height); c.width = c.height = 192;
    c.getContext('2d').drawImage(src, (src.width - side) / 2, (src.height - side) / 2, side, side, 0, 0, 192, 192);
    state.buy.thumb = c.toDataURL('image/jpeg', 0.8); const t = modalEl.querySelector('.thumb'); if (t) t.style.backgroundImage = `url(${state.buy.thumb})`;
  }
  return { startBuy, closeBuy, onModalClick, captureThumb };
}
