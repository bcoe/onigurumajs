var _ = require('lodash')
var xregexp = require('xregexp')
require('./lib/xregexp-lookbehind')(xregexp)
require('./lib/xregexp-xescape')(xregexp)

function OnigRegExp (pattern) {
  pattern = applyReplacements(pattern)
  try {
    this.pattern = xregexp(pattern)
    this.pattern.original = pattern
  } catch (e) {
    // we'll do it live!
    this.pattern = {
      original: pattern
    }
  }
}

OnigRegExp.prototype.search = function (text, start, cb) {
  var results = null

  if (typeof start === 'function') {
    cb = start
    start = 0
  }

  start = start || 0

  try {
    results = execRegex(text, this.pattern, start)
  } catch (e) {
    cb(null, null)
  }

  if (results) cb(null, transformMatches(results, text, start))
  else cb(null, null)
}

OnigRegExp.prototype.searchSync = function (text, start) {
  var result = null
  this.search(text, start, function (err, _result) {
    if (err) throw err
    result = _result
  })
  return result
}

OnigRegExp.prototype.test = function (text, cb) {
  this.search(text, function (err, result) {
    return cb(err, !!result)
  })
}

OnigRegExp.prototype.testSync = function (text) {
  var result = false
  this.test(text, function (err, _result) {
    if (err) throw err
    result = _result
  })
  return result
}

function OnigScanner (patterns) {
  this.patterns = []
  for (var i = 0, pattern, xpattern; (pattern = patterns[i]) !== undefined; i++) {
    try {
      pattern = applyReplacements(pattern)
      xpattern = xregexp(pattern)
      xpattern.original = pattern
      this.patterns.push(xpattern)
    } catch (e) {
      // we'll do it live!
      this.patterns.push({
        original: pattern
      })
    }
  }
}

OnigScanner.prototype.findNextMatch = function (text, start, cb) {
  var bestMatch = null
  var bestIndex = 1
  var results = null

  if (typeof start === 'function') {
    cb = start
    start = 0
  }

  start = start || 0

  // https://github.com/atom/node-oniguruma/blob/master/src/onig-searcher.cc
  for (var i = 0, pattern; (pattern = this.patterns[i]) !== undefined; i++) {
    try {
      results = execRegex(text, pattern, start)

      if (!results) continue

      if (!bestMatch || results.index < bestMatch.index) {
        bestMatch = results
        bestIndex = i
      }
    } catch (e) {
      // ignore failing patterns until we can add
      // shims for more with tests!
      // console.log('cannot match: ', e.message)
    }
  }

  if (bestMatch) {
    cb(null, {
      captureIndices: transformMatches(bestMatch, text, start).map(function (match) {
        return _.omit(match, 'match')
      }),
      index: bestIndex,
      scanner: {}
    })
  } else {
    cb(null, null)
  }
}

function execRegex (text, pattern, start) {
  var results = null

  if (pattern.xregexp) {
    // a regex that xregexp can handle right out of the gate.
    results = xregexp.exec(text, pattern, start)
  } else if (/^\(\?[><][=!]?/.exec(pattern.original)) {
    // a leading lookbehind regex.
    results = xregexp.execLb(text, pattern.original, start)
  } else if (/\(\?[><][=!]?/.exec(pattern.original)) {
    // allow for an alternation chracter followed by
    // a lookbehind regex.
    var splitPattern = pattern.original.split(/\|(\(\?[><][=!][^|]*)/g)
    if (splitPattern.length > 1) results = alternationPrefixedLookbehinds(text, splitPattern, start)
  }

  return results
}

function alternationPrefixedLookbehinds (text, splitPattern, start) {
  var patterns = []
  var currentPattern = ''
  var result = null

  // rebuild valid regex from splitting on (foo|(?<=foo)).
  for (var i = 0, pattern; (pattern = splitPattern[i]) !== undefined; i++) {
    if (/\(\?[><][=!]?/.exec(pattern)) {
      patterns.push(currentPattern)
      currentPattern = ''
    }
    currentPattern += pattern
  }
  patterns.push(currentPattern)

  // now apply each pattern.
  for (i = 0, pattern; (pattern = patterns[i]) !== undefined; i++) {
    try {
      if (/\(\?[><][=!]?/.exec(pattern)) {
        result = xregexp.execLb(text, pattern, start)
      } else {
        result = xregexp.exec(text, xregexp(pattern), start)
      }
      if (result) return result
    } catch (e) {
      // we're officially in uncharted territory.
      return null
    }
  }

  return null
}

function applyReplacements (pattern) {
  // TODO: write tests and/or find better generic
  // solutions for each of these replacements.
  pattern = pattern.replace(/\\h/g, '[\t\p{Zs}]') // any whitespace character.
  pattern = pattern.replace(/\\A/g, '^') // \A matches start of string, rather than line.
  pattern = pattern.replace(/\\G/, '') // start of match group.
  pattern = pattern.replace(/\$$/, '[\r\n]?$') // match \n or end of string.
  return pattern
}

OnigScanner.prototype.findNextMatchSync = function (text, start) {
  var result = null
  this.findNextMatch(text, start, function (err, _result) {
    if (err) throw err
    result = _result
  })
  return result
}

function transformMatches (results, text, start) {
  var matchIndex = 0
  var slicedText = text.slice(start)
  var difference = text.length - slicedText.length
  var transform = []

  results.forEach(function (result, i) {
    matchIndex = difference + slicedText.indexOf(result)
    var start = result ? matchIndex : results.index
    var end = result ? matchIndex + result.length : results.index
    if (typeof result === 'undefined') start = end = 0
    transform.push({
      index: i,
      start: start,
      end: end,
      match: result,
      length: result ? result.length : 0
    })
  })

  return transform
}

exports.OnigRegExp = OnigRegExp
exports.OnigScanner = OnigScanner
