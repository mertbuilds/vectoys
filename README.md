# vectoys

Vector toys: 3D devices and playful scenes for the web, drawn as SVG.

An SVG 3D engine for device mockups (laptops, phones, tablets) and small playful 3D toys on landing pages. Everything is projected to plain SVG paths, so the markup renders on the server, stays crisp at any size, and needs no WebGL.

Status: early.

## Packages

- `packages/engine` (`@vectoys/engine`): a perspective camera, 3D rotations and poses, 2D outline helpers and compact SVG path output. Zero runtime dependencies.
- `packages/react` (`@vectoys/react`): `Stage`, `Faces` and `Screen`, the React pieces any item draws with, and the motion hooks `useSpring`, `useFrames` and `useReducedMotion`. MIT.
- `packages/cli` (`vectoys`): the CLI that copies items into a project. MIT.
- `packages/registry-build`: writes the registry JSON the site serves at `/r`.
- `apps/site`: vectoys.com, the landing page and the gallery, which also serves the registry at `/r`.

### Engine

Besides the camera, poses and paths, the engine has:

- `slab({ taper })`: the top's outline stands in from the bottom's by `taper` on every side, so the sides lean in as a keycap's do.
- `slab({ outline })` and `plate({ outline })`: a part takes any flat outline in place of its rounded box, such as a triangle for an envelope's flap.
- `rotateAxis(axis, degrees)`: a turn about any axis.
- `slerp(from, to, share)`: the rotation a share of the way between two, turning the short way round.
- `spring(state, target, seconds, { stiffness, damping })` and `settled(state, target)`: a value on a spring, stepped in small fixed steps so any frame rate gives the same path. `useSpring(target)` in `@vectoys/react` follows a target on it.

## Registry

Items to copy into a project, each described by its `item.json`. License of every item: to be decided.

Devices:

- `registry/laptop`: a 14 inch laptop with a lid that opens and closes and live HTML on its display.
- `registry/phone`: a modern flagship phone that turns any way, with side buttons, a camera bump and live HTML on its display.
- `registry/tablet`: an 11 inch tablet that turns any way, upright or on its side, with live HTML on its display.
- `registry/monitor`: a 27 inch monitor on a stand that turns any way, its panel tilting on the stand, with live HTML on its display.
- `registry/browser`: a browser window that floats and turns any way, stacks with others, and shows an address and live HTML in light or dark tones.
- `registry/watch`: a smartwatch that turns any way, with a crown, a side button, a bent band and live HTML on its display.

Toys:

- `registry/keycap`: a keycap that is a real button, with a live label on its dished top; it lifts on hover and travels down when pressed, and `KeycapRow` spells a word.
- `registry/envelope`: a newsletter envelope that opens on a click, its flap swinging up and a letter with live content rising out.
- `registry/floppy`: a floppy disk that is a download link or a button; its shutter slides open and it turns towards the eye on hover.
- `registry/card`: a flip card with live HTML on both faces that flips on a click or a hover and leans towards the pointer.
- `registry/dice`: a die that rolls when clicked, tumbles and lands on a random or given face.
- `registry/gift`: a gift box whose lid pops off on a click, with live HTML such as a coupon code rising out.

## Install an item

Items are copied into your project as source, so you can change them. The engine and the React pieces come as normal packages. Items need React 19 or later.

```sh
npx vectoys add laptop
```

This writes `vectoys.json`, copies the item to `src/components/vectoys/laptop/` (or `components/vectoys/` without a `src` folder), and installs `@vectoys/engine` and `@vectoys/react` with your package manager. `npx vectoys list` shows every item. The shadcn CLI works too:

```sh
npx shadcn add https://vectoys.com/r/laptop.json
```

Items from other registries go by scope once the scope is in `vectoys.json`:

```json
{ "registries": { "@acme": "https://acme.dev/r" } }
```

```sh
npx vectoys add @acme/thing
npx vectoys add https://acme.dev/r/thing.json
```

### Host your own registry

Serve one JSON file per item at `<base>/<name>.json`, in the [shadcn registry-item format](https://ui.shadcn.com/docs/registry/registry-item-json) with each file's source in `content`, and an `index.json` at `<base>/index.json` that lists `{ "items": [{ "name", "title", "description" }] }`. Any static host works; `bun run registry:build` shows how this repo writes its own to `apps/site/public/r`.

## Shading

`draw` tells how much light falls on each face: every face it returns has a `normal` and a `shade` from the light's ambient share up to 1. The light is held still with the eye, not with the model, so as a device spins its sides brighten and darken as they turn. Pass `draw(scene, camera, { light: { direction, ambient } })` to move it; `direction` points towards the light in the scene's axes (x right, y down, z towards the eye).

`<Faces shading />` uses it: each face's fill is mixed a few steps darker in less light, and the few faces turned right at the light are lifted a little. Only fills that are colours are shaded, never `none` or a `url(...)` paint. Devices and toys drawn with `shading` are shaded. The page tunes it with CSS variables:

- `--vectoys-shade-strength`: how dark the faces in least light get, `0.5` by default, `0` for none.
- `--vectoys-shade-color`: the colour mixed in, `black` by default.
- `--vectoys-highlight-strength`: how far faces towards the light are lifted, `0.25` by default.
- `--vectoys-highlight`: the colour they are lifted towards, `white` by default.

## Colours

Every item reads its colours from CSS variables, so a page themes them all at once. Each falls back to a light tone when unset.

- `--vectoys-surface`: the main surface of a body or a part, `#f5f5f5`.
- `--vectoys-hairline`: the outlines and the darker edges, `#8a8a8a`.
- `--vectoys-shadow`: the shadow on the ground, `rgba(0, 0, 0, 0.08)`.
- `--vectoys-finish`: the colour of a body: the back and stand of a device, a keycap, a die, the card's back. By default the surface; the envelope's lining a shade under it, the floppy disk `#2c2c2e`, the gift box `#e5484d`.
- `--vectoys-accent`: the gift box's ribbon and bow, `#f5c84c`.
- `--vectoys-band`: the watch's band, a shade under the surface.
- `--vectoys-ink`: a keycap's label, the die's pips and the browser's address, `#1d1d1c`.
- `--vectoys-bg`: the laptop's and the browser's page behind the content, `#ffffff`.
- `--vectoys-border`: the laptop's rim and trackpad outline, `#d4d4d4`.
- `--vectoys-paper`: the floppy disk's label, `#f7f6f1`.
- `--vectoys-paper-ink`: the text on that label, `#1d1d1c`.
- `--vectoys-focus`: the focus ring of the card, the die and the gift box, `currentColor`.
- `--vectoys-focus-width`: how thick that ring is, `1px`.

Under a dark colour scheme the browser window, the keycap and the die fall back to dark tones instead: `--vectoys-surface` `#262626`, `--vectoys-hairline` `#5a5a5a`, `--vectoys-ink` `#ededed`, `--vectoys-shadow` `rgba(0, 0, 0, 0.4)`, and for the browser `--vectoys-bg` `#161616`. The browser also takes `theme="dark"`. The shading variables are below.

## Develop

```sh
bun install
bun run typecheck
bun test
bun run dev
```

`bun run dev` builds the registry and serves the site at https://vectoys.localhost through portless.

## License

MIT
