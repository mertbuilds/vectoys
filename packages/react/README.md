# @vinena/vectoys-react

React pieces for vectoys scenes: `Stage`, a box that scales with its parent, `Faces`, which draws the faces the engine gives, and `Screen`, live HTML on a face. Needs React 19 or later.

## Install

```sh
npm install @vinena/vectoys @vinena/vectoys-react
```

## Usage

```tsx
import { camera, draw, slab } from "@vinena/vectoys";
import { Faces, Stage } from "@vinena/vectoys-react";

const eye = camera({ width: 100, height: 80, perspective: 280, yaw: -24, pitch: -16 });
const { faces, hulls } = draw([slab({ name: "body", box: [-30, -20, 30, 20], radii: [6, 6], thickness: 4 })], eye);
const styles = { top: { style: { fill: "#5b7cfa" } }, side: { style: { fill: "#3b5bdb" } } };

export function Block() {
  return (
    <Stage camera={eye} role="img" label="A blue block">
      <Faces faces={faces} hulls={hulls} styles={styles} shading />
    </Stage>
  );
}
```

It renders on the server and stays sharp at any size. Ready-made items live at [vectoys.com](https://vectoys.com) and copy into a project with `npx @vinena/vectoys-cli add <name>`.

## Links

- Site and items: [vectoys.com](https://vectoys.com)
- Source: [github.com/vinenastudio/vectoys](https://github.com/vinenastudio/vectoys)

## License

MIT
