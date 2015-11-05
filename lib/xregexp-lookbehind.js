// Simulating infinite-length leading lookbehind in JavaScript. Uses XRegExp
// and XRegExp.matchRecursive. Any regex pattern can be used within lookbehind,
// including nested groups. Captures within lookbehind are not included in
// match results. Lazy repetition in lookbehind may lead to unexpected results.
module.exports = function (XRegExp) {
  function preparePattern (pattern, flags) {
    var lbOpen
    var lbEndPos
    var lbInner

    flags = flags || ''
    // Extract flags from a leading mode modifier, if present
    pattern = pattern.replace(/^\(\?([\w$]+)\)/, function ($0, $1) {
      flags += $1
      return ''
    })

    lbOpen = /^\(\?<([=!])/.exec(pattern)

    if (lbOpen) {
      // Extract the lookbehind pattern. Allows nested groups, escaped parens, and unescaped parens within classes
      lbEndPos = XRegExp.matchRecursive(pattern, /\((?:[^()[\\]|\\.|\[(?:[^\\\]]|\\.)*])*/.source, '\\)', 's', {
        valueNames: [null, null, null, 'right'],
        escapeChar: '\\'
      })[0].end
      lbInner = pattern.slice('(?<='.length, lbEndPos - 1)
    } else {
      throw new Error('lookbehind not at start of pattern')
    }
    return {
      lb: XRegExp('(?:' + lbInner + ')$(?!\\s)', flags.replace(/[gy]/g, '')), // $(?!\s) allows use of flag m
      lbType: lbOpen[1] === '=', // Positive or negative lookbehind
      main: XRegExp(pattern.slice(('(?<=)' + lbInner).length), flags)
    }
  }

  XRegExp.execLb = function (str, pattern, pos) {
    pos = pos || 0
    var match, leftContext
    pattern = preparePattern(pattern)
    while (true) {
      match = XRegExp.exec(str, pattern.main, pos)
      if (!match) break

      leftContext = str.slice(0, match.index)
      if (pattern.lbType === pattern.lb.test(leftContext)) {
        return match
      }
      pos = match.index + 1
    }
    return null
  }
}
