# Stadium book — index

Living documentation for `index.html`. Live demo: https://vansteenbergenmatisse.github.io/PROJECT_STADIUM_CONFIGURATOR/ (GitHub Pages, from `main`). Update the chapters whenever the code changes (see `../../CLAUDE.md`).

| # | Chapter | What it holds |
|---|---|---|
| 01 | [History](01-history.md) | Chronological log of every change: what, why, verified / not verified |
| 02 | [Architecture](02-architecture.md) | Section-by-section map of `index.html`, constants, data flow |
| 03 | [Pricing](03-pricing.md) | The ticket price model, formulas, resulting ranges |
| 04 | [Camera and interaction](04-camera-and-interaction.md) | Locked camera, click states, picking, descent |
| 05 | [Rendering, lighting, shadows](05-rendering-lighting-shadows.md) | Current settings, research findings, what was adopted / rejected |
| 06 | [Open issues](06-open-issues.md) | Known gaps, unverified items, ideas |

Current state in one paragraph: an orange Soccer City-style stadium (calabash mosaic facade, a translucent ETFE-foil roof ring with a diamond steel lattice and 104 radial ribs, 78,397 seats in one
InstancedMesh over three tiers with straight aisles, 56 glass skyboxes, 4 lettered entrances and 4 numbered exits) in a green meadow with scattered trees, one dense forest north-west, a blue sky with sun
and clouds, access roads with a bus stop each and ~180 walking fans, 16 matchday stalls and flagpoles at the entrances, a paved plaza, a fenced car park (asphalt, yellow bays, hatched no-parking strips, gate portals) split into 4 faintly tinted lots with 50 parked cars (not selectable),
and a few small shops. Only plain-orange seats are available (light-orange and gold ones are not). Hover or click a section first (seats available + price range), then an available seat (vivid magenta on hover):
an 11 v 11 demo match, Barcelona v Dortmund, starts with a live scoreboard and you can turn your head. The pitch has LED ad boards, corner flags, dugouts with technical-area lines, a fourth official desk,
stewards, photographers and TV tripods. The roof fades to 40% only while a section is selected. The price panel appears only with a selection; the four view buttons sit bottom centre. "Buy ticket" opens a demo
checkout pop-up (cart with matchday extras, payment, ticket details). The photo / AI render feature was removed (entry 20); `proxy/` is unused. The UI follows the Forge Forward brand guide and works on phones.
