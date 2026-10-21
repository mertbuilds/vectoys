# hinge

An SVG 3D engine for device mockups (laptops, phones, tablets) and small playful 3D toys on landing pages. Everything is projected to plain SVG paths, so the markup renders on the server, stays crisp at any size, and needs no WebGL.

Status: early.

## Packages

- `packages/engine` (`@hinge/engine`): a perspective camera, 3D rotations and poses, 2D outline helpers and compact SVG path output. Zero runtime dependencies.
- `packages/react` (`@hinge/react`): `Stage`, `Faces` and `Screen`, the React pieces any device draws with. MIT.

## Registry

Devices to copy into a project, each described by its `item.json`.

- `registry/laptop-14`: a 14 inch laptop with a lid that opens and closes and live HTML on its display. License to be decided.
- `registry/phone`: a modern flagship phone that turns any way, with side buttons, a camera bump and live HTML on its display. License to be decided.
- `registry/tablet`: an 11 inch tablet that turns any way, upright or on its side, with live HTML on its display. License to be decided.

## Develop

```sh
bun install
bun run typecheck
bun test
```

## License

MIT
