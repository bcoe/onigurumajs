# onigurumajs

implementation of the [node-oniguruma API](https://github.com/atom/node-oniguruma/) using
[xregexp](https://github.com/slevithan/xregexp), various shims, replacements, and elbow grease.

why come? It would be nice to be able to parse [TextMate grammars](https://manual.macromates.com/en/language_grammars) (the basis for
syntax highlighting in Atom) in pure JavaScript ... so that I can do this:

## Usage

See [node-oniguruma](https://github.com/atom/node-oniguruma/).

## Supports

* extended xregexp syntax: http://xregexp.com/syntax/
* partial look-behind capture support:
  * currently supports leading look-behinds: https://gist.github.com/slevithan/2387815
* `\x{xxxx}` unicode escape codes

## Contribute

This is a work in progress please join in, open issues, and help
build an insanely full-featured regex parser for JavaScript.

## License

ISC
