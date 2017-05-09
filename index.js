const omit = require('lodash.omit')
const Binding = require('./lib/binding')
const createRegex = Binding.cwrap('create_regex', 'number', ['string', 'number'])
const search = Binding.cwrap('search', 'number', ['number', 'string', 'number', 'number'])
const end = Binding.cwrap('end', null, ['number'])
const utf8 = require('utf8')
const stringWidth = require('string-width')

const RESULT_BUFFER_SIZE = 4096
const RESULT_BUFFER = Binding._malloc(RESULT_BUFFER_SIZE * 8)

function OnigRegExp (pattern) {
  this.regex = createRegex(pattern, RESULT_BUFFER)
  if (!this.regex) {
    throw Error(Binding.Pointer_stringify(RESULT_BUFFER))
  }
}

OnigRegExp.prototype.search = function (text, start, cb) {
  var results = null

  if (typeof start === 'function') {
    cb = start
    start = 0
  }

  start = start || 0

  if (!search(this.regex, text, RESULT_BUFFER, start)) {
    return cb(Error(Binding.Pointer_stringify(RESULT_BUFFER)), null)
  } else {
    results = JSON.parse(Binding.Pointer_stringify(RESULT_BUFFER))
  }

  if (results.length) cb(null, transformMatches(results, text, start))
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
  for (var i = 0, pattern; (pattern = patterns[i]) !== undefined; i++) {
    const regex = createRegex(pattern, RESULT_BUFFER)
    if (!regex) {
      throw Error(Binding.Pointer_stringify(RESULT_BUFFER))
    }
    this.patterns.push(regex)
  }
}

OnigScanner.prototype.destroy = function () {
  (this.patterns || []).forEach((pattern) => {
    end(pattern)
  })
}

OnigScanner.prototype.findNextMatch = function (text, start, cb) {
  var bestMatch = null
  var bestLocation = 0
  var results = null

  if (typeof start === 'function') {
    cb = start
    start = 0
  }

  start = start || 0

  // https://github.com/atom/node-oniguruma/blob/master/src/onig-searcher.cc
  for (var i = 0, pattern; (pattern = this.patterns[i]) !== undefined; i++) {
    try {
      if (!search(pattern, text, RESULT_BUFFER, start)) {
        return cb(Error(Binding.Pointer_stringify(RESULT_BUFFER)), null)
      } else {
        results = JSON.parse(Binding.Pointer_stringify(RESULT_BUFFER))
      }

      if (!results.length) continue
      if (bestMatch === null || results[0].start < bestLocation) {
        bestMatch = results
        bestLocation = results[0].start
        bestMatch.index = i
      }
    } catch (e) {
      console.warn(e)
    }
  }

  if (bestMatch) {
    cb(null, {
      captureIndices: transformMatches(bestMatch, text, start).map(function (match) {
        return omit(match, 'match')
      }),
      index: bestMatch.index,
      scanner: {}
    })
  } else {
    cb(null, null)
  }
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
  var transform = []

  results.forEach(function (result, i) {
    const match = utf8.decode(
      utf8.encode(text).substring(result.start, result.end)
    )
    const length = stringWidth(match)
    const start = result.start !== -1 ? result.start : 0
    transform.push({
      index: i,
      start: start,
      end: start + length,
      length: length,
      match: match
    })
  })

  return transform
}

exports.OnigRegExp = OnigRegExp
exports.OnigScanner = OnigScanner
