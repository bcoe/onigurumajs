// Simulating infinite-length leading lookbehind in JavaScript. Uses XRegExp
// and XRegExp.matchRecursive. Any regex pattern can be used within lookbehind,
// including nested groups. Captures within lookbehind are not included in
// match results. Lazy repetition in lookbehind may lead to unexpected results.
module.exports = function (XRegExp) {
  XRegExp.addToken(
    /\\x{([\dA-Fa-f]+)}/,
    function (match, scope, flags) {
      var code = dec(match[1])
      if (code > 0x10FFFF) {
        throw new SyntaxError('Invalid Unicode code point ' + match[0])
      }
      if (code <= 0xFFFF) {
        // Converting to \uNNNN avoids needing to escape the literal character and keep it
        // separate from preceding tokens
        return '\\u' + pad4(hex(code))
      }
      // If `code` is between 0xFFFF and 0x10FFFF, require and defer to native handling
      if (flags.indexOf('x') > -1) {
        return match[0]
      }
      throw new SyntaxError('Cannot use Unicode code point above \\u{FFFF} without flag u')
    },
    {
      scope: 'all',
      leadChar: '\\'
    }
  )
}

function dec (hex) {
  return parseInt(hex, 16)
}

function pad4 (str) {
  while (str.length < 4) {
    str = '0' + str
  }
  return str
}

function hex (dec) {
  return parseInt(dec, 10).toString(16)
}
