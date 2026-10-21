# hinge

An SVG 3D engine for device mockups (laptops, phones, tablets) and small playful 3D toys on landing pages. Everything is projected to plain SVG paths, so the markup renders on the server, stays crisp at any size, and needs no WebGL.

Status: early. Only the engine's math lives here so far.

## Packages

- `packages/engine` (`@hinge/engine`): a perspective camera, 3D rotations and poses, 2D outline helpers and compact SVG path output. Zero runtime dependencies.

## Develop

```sh
bun install
bun run typecheck
bun test
```

## License

MIT
