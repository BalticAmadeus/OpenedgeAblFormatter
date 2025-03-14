# tree-sitter-abl

OpenEdge Advanced Business Language (ABL) grammar for tree-sitter.

To see syntax tree output see `test/corpus`.

Check out [tree-sitter-df](https://github.com/usagi-coffee/tree-sitter-df) for progress data definitions parser.

## Usage

> Keep in mind there are many ABL statements that are not yet implemented but that doesn't ***necessarily*** mean they're not parsable, it just means the syntax tree won't have details about the statements!

For the grammar usage in your project look at tree-sitter documentation on how to use the grammar parsers because you can use tree-sitter parsers using [node](https://github.com/tree-sitter/node-tree-sitter)/[rust](https://github.com/tree-sitter/tree-sitter/tree/master/lib/binding_rust)/[wasm](https://github.com/tree-sitter/tree-sitter/tree/master/lib/binding_web) bindings.

### Node

```bash
npm install @usagi-coffee/tree-sitter-abl
```

### WASM

Prebuilt WASM binary can be found in NPM package or build yourself with `npm run build:wasm`.
Follow [web-tree-sitter](https://github.com/tree-sitter/tree-sitter/tree/master/lib/binding_web) binding documentation.

```
// Getting wasm binary from the npm package
const fs = require('node:fs');
const mod = fs.readFileSync('node_modules/@usagi-coffee/tree-sitter-abl/tree-sitter-abl.wasm');
```

### Shared library (.so)

You can build a shared library `.so` to use it in tools like [ast-grep](https://ast-grep.github.io/)

```bash
gcc -shared -fPIC -fno-exceptions -g -I 'src' -o abl.so -O2 src/scanner.c -xc src/parser.c -lstdc++
```

### Running the tests

```bash
npm run test
```

### Testing your file

```bash
npm run parse your_file.p
```

## License

```LICENSE
MIT License

Copyright (c) Kamil Jakubus, Jason Chrosrova and contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
