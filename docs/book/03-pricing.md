# 03 — Pricing model

A representative **category / zone pricing** model of the kind football clubs use (tier -> view zone -> row), not any club's real rate card.
Currency symbol `€` is a display choice. All constants are in `index.html` ("pricing model" section).

## Seats
`price = round5( TIER_BASE[tier] × zone × centre × rowPremium × DEMAND )`
- `TIER_BASE = [95, 62, 38]` (Lower / Middle / Upper).
- `zone = 0.80 + 0.42 × lf`, where `lf = (|z| / (B0 + d))^EXP` is 1 on the long sides and 0 behind the goals.
- `centre = 1 + 0.30 × lf × c`, where `c = 1 − min(1, |x| / (PITCH_L/2 + 20))` is 1 at the halfway line.
- `rowPremium = 1 + 0.14 × (1 − row/(rows−1))` (front rows +14 %).
- `DEMAND = 1.0` is the slot for a per-fixture multiplier (match category or live demand).
- Resulting ranges (computed in the page): Lower €75–€170, Middle €50–€110, Upper €30–€70.

## Skyboxes
Per seat `round10( 420 × zone × centre )`, 10 seats per suite, 56 suites. Shown range was €340–€660 per seat.

## Parking (per day)
Lot base: North 40, South 32, East 22, West 22; row factor by distance to the stadium: row 1 ×1.25, row 2 ×1.10, row 3 ×1.00, row 4 ×0.90.
Range shown: €20–€50.

## What the panel shows
The panel exists only while a section, seat or skybox is selected (the generic tier / skybox / parking list is hidden since entry 22, so parking prices are not shown anywhere). On selection: block range + "X of Y seats available"; seat exact price + the row range + the formula breakdown; suite per-seat price + suite total. Hover cards show the same in short form (a hovered unavailable seat shows "Not available").

## How it is shown (ticket cards)
Hover tooltip and the seat card in the panel use a white ticket card (brand tokens, prices in charcoal ExtraBold, never red): label (tier / section), main line (row / seat), price on the right; skyboxes show a dark VIP ticket
(seats, entry, barcode, per-seat price). Only prices from the model above are shown.

## Parking
Parking is no longer selectable in the 3D scene (history entry 14). The model and the "Parking per day" row in the price list are unchanged.

## Demo checkout (pop-up)
"Buy ticket" (seat) / "Buy skybox" opens `#modal`: **1 Your cart** (picture = the current 3D frame, title, row | seats, a stepper for up to 3 more seats directly next to the selected one in the same row, each at its own model price;
promo code field, order summary, total) -> **2 Payment method** (Mastercard / Visa as plain text, name, email, card number 13-19 digits, exp MM/YY, CVV 3-4 digits) -> **3 Ticket's details** (order `DEMO-XXXXXX`, entrance letter of the nearest gate,
decorative bar code). Rules that are mine, not from any partner: the only promo code is **DEMO10 = 10% off**, there is no booking fee, the card checks only check the format. Nothing is charged, stored or sent and the card fields are cleared after Pay.
A skybox is bought as a whole suite (price per seat x 10).

## Availability (entry 22)
A made-up rule, not real inventory: only plain-orange seats (colour code 0) can be bought. Light-orange (code 1) and pale-gold lattice (code 2) seats are "Not available": no hover highlight, not clickable, never offered as extra seats in the cart. Section and tier price ranges use available seats only (`isAvail`, `availIn`). Example from the page: section 7 of the lower tier showed 568 of 684 seats available.

## Matchday extras (entry 21, cart)
13 items in 5 groups (programme, fan shop: scarf / shirt / cap / seat cushion, food: burger and chips / hot dog / pie / popcorn, drinks: soft drink / beer / coffee, ice cream). The categories follow a short web search (merchandise stands, food and drink near the seats, programmes). The prices (e.g. programme 8, scarf 22, shirt 85) are MADE UP demo prices, not any club's. DEMO10 applies to the tickets only, not to extras. Max 9 per item. Nothing is charged or sent.
