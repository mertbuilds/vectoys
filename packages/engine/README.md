# @vinena/vectoys

The vectoys engine: a perspective camera, 3D poses and outline helpers that turn simple parts into compact SVG paths. Zero runtime dependencies.

## Install

```sh
npm install @vinena/vectoys
```

## Usage

```ts
import { camera, draw, slab } from "@vinena/vectoys";

const eye = camera({ width: 100, height: 80, perspective: 280, yaw: -24, pitch: -16 });
const parts = [slab({ name: "body", box: [-30, -20, 30, 20], radii: [6, 6], thickness: 4 })];
const { faces } = draw(parts, eye);

for (const face of faces) console.log(face.role, face.d);
```

Each face carries an SVG path `d` in the camera's units, ready for a `<path>`. To draw scenes in React, use [`@vinena/vectoys-react`](https://www.npmjs.com/package/@vinena/vectoys-react).

## Links

- Site and items: [vectoys.com](https://vectoys.com)
- Source: [github.com/vinenastudio/vectoys](https://github.com/vinenastudio/vectoys)

## License

MIT
