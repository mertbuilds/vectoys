# vectoys

Vector toys: 3D devices and playful scenes for the web, drawn as SVG.

An SVG 3D engine for device mockups (laptops, phones, tablets) and small playful 3D toys on landing pages. Everything is projected to plain SVG paths, so the markup renders on the server, stays crisp at any size, and needs no WebGL.

Status: early.

## Packages

- `packages/engine` (`@vectoys/engine`): a perspective camera, 3D rotations and poses, 2D outline helpers and compact SVG path output. Zero runtime dependencies.
- `packages/react` (`@vectoys/react`): `Stage`, `Faces` and `Screen`, the React pieces any device draws with. MIT.

## Registry

Devices to copy into a project, each described by its `item.json`.

- `registry/laptop-14`: a 14 inch laptop with a lid that opens and closes and live HTML on its display. License to be decided.
- `registry/phone`: a modern flagship phone that turns any way, with side buttons, a camera bump and live HTML on its display. License to be decided.
- `registry/tablet`: an 11 inch tablet that turns any way, upright or on its side, with live HTML on its display. License to be decided.

## Shading

`draw` tells how much light falls on each face: every face it returns has a `normal` and a `shade` from the light's ambient share up to 1. The light is held still with the eye, not with the model, so as a device spins its sides brighten and darken as they turn. Pass `draw(scene, camera, { light: { direction, ambient } })` to move it; `direction` points towards the light in the scene's axes (x right, y down, z towards the eye).

`<Faces shading />` uses it: each face's fill is mixed a few steps darker in less light, and the few faces turned right at the light are lifted a little. Only fills that are colours are shaded, never `none` or a `url(...)` paint. The phone and the tablet are shaded. The page tunes it with CSS variables:

- `--vectoys-shade-strength`: how dark the faces in least light get, `0.5` by default, `0` for none.
- `--vectoys-shade-color`: the colour mixed in, `black` by default.
- `--vectoys-highlight-strength`: how far faces towards the light are lifted, `0.25` by default.
- `--vectoys-highlight`: the colour they are lifted towards, `white` by default.

## Develop

```sh
bun install
bun run typecheck
bun test
```

## License

MIT
