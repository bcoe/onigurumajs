var NOnigRegExp = require('./').OnigRegExp
var NOnigScanner = require('./').OnigScanner
// var OnigScanner = require('oniguruma').OnigScanner
var tap = require('tap')

tap.test('OnigRegExp.searchSync begins search at index 0', function (t) {
  var nregex = new NOnigRegExp('a([b-d])c')

  t.deepEqual(
    [ { index: 0, start: 1, end: 4, length: 3, match: 'abc' },
      { index: 1, start: 2, end: 3, length: 1, match: 'b' }],
    nregex.searchSync('!abcdef!abcdef')
  )
  t.done()
})

tap.test('OnigRegExp.search begins search at index 0', function (t) {
  var nregex = new NOnigRegExp('a([b-d])c')

  nregex.search('!abcdef!abcdef', function (e, nmatch) {
    t.deepEqual(
      [ { index: 0, start: 1, end: 4, length: 3, match: 'abc' },
        { index: 1, start: 2, end: 3, length: 1, match: 'b' } ],
      nmatch
    )
    t.done()
  })
})

tap.test('OnigRegExp.search allows offset to be provided', function (t) {
  var nregex = new NOnigRegExp('a([b-d])c')

  nregex.search('abcdef!abcdef', 4, function (e, nmatch) {
    t.deepEqual(
      [ { index: 0, start: 7, end: 10, length: 3, match: 'abc' },
        { index: 1, start: 8, end: 9, length: 1, match: 'b' } ],
      nmatch
    )
    t.done()
  })
})

tap.test('OnigRegExp.search handles no match existing', function (t) {
  var nregex = new NOnigRegExp('a([b-d])c')

  nregex.search('banana', function (e, nmatch) {
    t.equal(nmatch, null)
    t.done()
  })
})

tap.test('OnigScanner.findNextMatch finds best match', function (t) {
  var nscanner = new NOnigScanner(['c', 'a(b)?'])

  nscanner.findNextMatch('abc', function (e, nmatch) {
    t.deepEqual({ index: 1,
      captureIndices:
        [ { index: 0, start: 0, end: 2, length: 2 },
          { index: 1, start: 1, end: 2, length: 1 } ],
      scanner: {} },
      nmatch
    )
    t.done()
  })
})

tap.test('OnigScanner.findNextMatch allows offset to be provided', function (t) {
  var nscanner = new NOnigScanner(['c', 'a(b)?'])

  nscanner.findNextMatch('abcabc', 2, function (e, nmatch) {
    t.deepEqual({ index: 0,
      captureIndices: [ { index: 0, start: 2, end: 3, length: 1 } ],
      scanner: {} },
      nmatch
    )
    t.done()
  })
})

tap.test('OnigScanner.findNextMatch handles no match existing', function (t) {
  var nscanner = new NOnigScanner(['c', 'a(b)?'])

  nscanner.findNextMatch('banana', function (e, nmatch) {
    t.deepEqual({ index: 1,
      captureIndices:
      [ { index: 0, start: 1, end: 2, length: 1 },
        { index: 1, start: 0, end: 0, length: 0 } ],
      scanner: {} },
      nmatch
    )
    t.done()
  })
})

tap.test('OnigScanner.findNextMatchSync finds best match', function (t) {
  var nscanner = new NOnigScanner(['c', 'a(b)?'])

  t.deepEqual(
    { index: 1,
      captureIndices:
      [ { index: 0, start: 0, end: 2, length: 2 },
        { index: 1, start: 1, end: 2, length: 1 } ],
      scanner: {} },
    nscanner.findNextMatchSync('abc')
  )
  t.done()
})

// the following tests exercise various shims, replacements,
// duct-tape, etc, to make xregexp behave like oniguruma:

tap.test('handles leading lookbehind', function (t) {
  var nscanner = new NOnigScanner(['(?<!a)b'])

  t.deepEqual(
    { index: 0,
      captureIndices: [ { index: 0, start: 0, end: 1, length: 1 } ],
      scanner: {} },
    nscanner.findNextMatchSync('bb')
  )
  t.equal(
    nscanner.findNextMatchSync('ab'),
    null
  )
  t.done()
})

tap.test('handles lookbehind immediately following an alternation', function (t) {
  var nscanner = new NOnigScanner(['cat|(?<!a)b|(?<=a)qwerty|banana'])

  t.deepEqual(
    { index: 0,
      captureIndices: [ { index: 0, start: 0, end: 1, length: 1 } ],
      scanner: {} },
    nscanner.findNextMatchSync('bb')
  )
  t.equal(
    nscanner.findNextMatchSync('ab'),
    null
  )
  t.done()
})

tap.test('$ character should match both newline and end of string', function (t) {
  var nscanner = new NOnigScanner(['ab$'])

  t.notEqual(
    nscanner.findNextMatchSync('ab\n'),
    null
  )

  t.done()
})

tap.test('\\x should work as an alias for \\u', function (t) {
  var nscanner = new NOnigScanner(['\\x{2603}'])

  t.notEqual(
    nscanner.findNextMatchSync('☃'),
    null
  )

  t.done()
})
