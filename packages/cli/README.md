# @vinena/vectoys-cli

The vectoys command line: copy vectoys devices and toys into your project as source, and make, check and preview items of your own.

## Install

Run it with npx, no install needed:

```sh
npx @vinena/vectoys-cli add laptop
```

Or install it to get the `vectoys` command:

```sh
npm install --global @vinena/vectoys-cli
vectoys list
```

## Usage

```sh
npx @vinena/vectoys-cli list                  # show every item
npx @vinena/vectoys-cli add laptop phone      # copy items in and install @vinena/vectoys and @vinena/vectoys-react
npx @vinena/vectoys-cli create spinning-top   # start a new item
npx @vinena/vectoys-cli check spinning-top    # check it (needs bun)
npx @vinena/vectoys-cli preview spinning-top  # render it to preview.html (needs bun)
npx @vinena/vectoys-cli skill                 # print how a coding agent makes an item
```

`npx @vinena/vectoys-cli --help` lists every command and option. Items need React 19 or later.

## Links

- Site and items: [vectoys.com](https://vectoys.com)
- Source: [github.com/vinenastudio/vectoys](https://github.com/vinenastudio/vectoys)

## License

MIT
