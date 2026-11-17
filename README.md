# Stadium configurator

Pick a section, pick a seat, see the match from your seat. A 3D stadium in your browser, with 78,397 seats you can click.

## What it is

An interactive ticket picker for a stadium modelled on Soccer City in Johannesburg: an orange calabash facade, a see-through foil roof and a green meadow around it. You choose where to sit by clicking. The camera does not roam freely. It flies where you click, then you can turn your head from the seat.

Everything is a demo. The checkout charges nothing, stores nothing and sends nothing. Ticket prices, sponsors, stall menus and seat availability are made up.

## What you can do

- **Click a section.** The other sections darken and you see the price range and how many seats are free.
- **Click a seat.** Only plain orange seats are for sale. Hovering one turns it magenta. Clicking it puts you in the seat.
- **Watch the match.** An 11 v 11 Barcelona v Dortmund simulation runs with a live scoreboard. Drag or use the arrow keys to look around.
- **Check out.** A pop-up takes you through cart, matchday extras, payment and a ticket with a bar code. The promo code `DEMO10` takes 10% off the tickets.
- **Look at the skyboxes.** 56 glass suites, priced per seat.
- **Move around.** Overview, Aerial and Descent buttons, plus `R` for the roof, `D` for the descent and `Esc` to go back.
- **Put panels away.** The price panel, the scoreboard and the view buttons each have a Hide button. A hidden card disappears and leaves a small + dot to bring it back. `H` hides or shows all of them.

## What is in the scene

| Part | Detail |
|---|---|
| Bowl | Three tiers, 28 sections each, straight aisles |
| Seats | 78,397 seats in one `InstancedMesh`, so one draw call |
| Roof | Translucent ETFE foil with 104 steel ribs, 40% opacity while a section is selected |
| Pitch | Ad boards, corner flags, dugouts, officials, stewards, photographers, goals with nets |
| Car park | Four lots, 50 cars, a fence with gate portals. Yellow bay lines mark where you may park. Yellow hatching with signs marks where you may not |
| Surroundings | Access roads with walking fans, a plaza with stalls and flagpoles, shops, trees and a forest |
| Loading screen | An animated construction time-lapse that plays while the scene builds |

## What it is made of

- [three.js](https://threejs.org) r160, loaded from the jsDelivr CDN through an import map
- Plain HTML, CSS and JavaScript modules in one file, `index.html`
- Plus Jakarta Sans from Google Fonts (falls back to your system font)
- No build step, no package manager, no dependencies to install

You need an internet connection to load three.js and the font.

## Run it on your laptop

You need Git and either Python 3 or Node.js. Any static file server works.

```bash
git clone https://github.com/vansteenbergenmatisse/PROJECT_STADIUM_CONFIGURATOR.git
cd PROJECT_STADIUM_CONFIGURATOR
python3 -m http.server 8765
```

Open <http://localhost:8765/index.html>.

No Python? Use Node instead:

```bash
npx serve -l 8765
```

Serve the folder over HTTP. Opening `index.html` straight from disk has not been tested.

## Project layout

```
index.html          the whole app: markup, styles and the three.js script
assets/loader.html  the loading screen, shown in an iframe while the scene builds
docs/book/          the project book: history, architecture, pricing, camera, rendering, open issues
CLAUDE.md           working rules for this repository
```

`index.html` starts with a map of its own sections. Every section marker explains what it builds and why. For the long version, start at [`docs/book/00-index.md`](docs/book/00-index.md).

## Known limits

Frame rate has only been tried in a slow software-rendered test browser, never on a real GPU or phone. The full list of what was and was not checked is in [`docs/book/06-open-issues.md`](docs/book/06-open-issues.md).

## About this git history

The app was built in one file over many sessions without version control. This history was cut from the finished file, section by section, in the order the file reads. Each commit adds one section and explains it. Early commits show a page that cannot draw anything yet. The last commit is the tested state. The real chronology, with what was and was not verified at each step, is in [`docs/book/01-history.md`](docs/book/01-history.md).

## Licence

No licence file has been added yet.
