(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')
var isArray = require('isarray')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * Due to various browser bugs, sometimes the Object implementation will be used even
 * when the browser supports typed arrays.
 *
 * Note:
 *
 *   - Firefox 4-29 lacks support for adding new properties to `Uint8Array` instances,
 *     See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438.
 *
 *   - Chrome 9-10 is missing the `TypedArray.prototype.subarray` function.
 *
 *   - IE10 has a broken `TypedArray.prototype.subarray` function which returns arrays of
 *     incorrect length in some situations.

 * We detect these buggy browsers and set `Buffer.TYPED_ARRAY_SUPPORT` to `false` so they
 * get the Object implementation, which is slower but behaves correctly.
 */
Buffer.TYPED_ARRAY_SUPPORT = global.TYPED_ARRAY_SUPPORT !== undefined
  ? global.TYPED_ARRAY_SUPPORT
  : typedArraySupport()

/*
 * Export kMaxLength after typed array support is determined.
 */
exports.kMaxLength = kMaxLength()

function typedArraySupport () {
  try {
    var arr = new Uint8Array(1)
    arr.__proto__ = {__proto__: Uint8Array.prototype, foo: function () { return 42 }}
    return arr.foo() === 42 && // typed array instances can be augmented
        typeof arr.subarray === 'function' && // chrome 9-10 lack `subarray`
        arr.subarray(1, 1).byteLength === 0 // ie10 has broken `subarray`
  } catch (e) {
    return false
  }
}

function kMaxLength () {
  return Buffer.TYPED_ARRAY_SUPPORT
    ? 0x7fffffff
    : 0x3fffffff
}

function createBuffer (that, length) {
  if (kMaxLength() < length) {
    throw new RangeError('Invalid typed array length')
  }
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    that = new Uint8Array(length)
    that.__proto__ = Buffer.prototype
  } else {
    // Fallback: Return an object instance of the Buffer class
    if (that === null) {
      that = new Buffer(length)
    }
    that.length = length
  }

  return that
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  if (!Buffer.TYPED_ARRAY_SUPPORT && !(this instanceof Buffer)) {
    return new Buffer(arg, encodingOrOffset, length)
  }

  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new Error(
        'If encoding is specified then the first argument must be a string'
      )
    }
    return allocUnsafe(this, arg)
  }
  return from(this, arg, encodingOrOffset, length)
}

Buffer.poolSize = 8192 // not used by this implementation

// TODO: Legacy, not needed anymore. Remove in next major version.
Buffer._augment = function (arr) {
  arr.__proto__ = Buffer.prototype
  return arr
}

function from (that, value, encodingOrOffset, length) {
  if (typeof value === 'number') {
    throw new TypeError('"value" argument must not be a number')
  }

  if (typeof ArrayBuffer !== 'undefined' && value instanceof ArrayBuffer) {
    return fromArrayBuffer(that, value, encodingOrOffset, length)
  }

  if (typeof value === 'string') {
    return fromString(that, value, encodingOrOffset)
  }

  return fromObject(that, value)
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(null, value, encodingOrOffset, length)
}

if (Buffer.TYPED_ARRAY_SUPPORT) {
  Buffer.prototype.__proto__ = Uint8Array.prototype
  Buffer.__proto__ = Uint8Array
  if (typeof Symbol !== 'undefined' && Symbol.species &&
      Buffer[Symbol.species] === Buffer) {
    // Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
    Object.defineProperty(Buffer, Symbol.species, {
      value: null,
      configurable: true
    })
  }
}

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be a number')
  } else if (size < 0) {
    throw new RangeError('"size" argument must not be negative')
  }
}

function alloc (that, size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(that, size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(that, size).fill(fill, encoding)
      : createBuffer(that, size).fill(fill)
  }
  return createBuffer(that, size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(null, size, fill, encoding)
}

function allocUnsafe (that, size) {
  assertSize(size)
  that = createBuffer(that, size < 0 ? 0 : checked(size) | 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) {
    for (var i = 0; i < size; ++i) {
      that[i] = 0
    }
  }
  return that
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(null, size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(null, size)
}

function fromString (that, string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('"encoding" must be a valid string encoding')
  }

  var length = byteLength(string, encoding) | 0
  that = createBuffer(that, length)

  var actual = that.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    that = that.slice(0, actual)
  }

  return that
}

function fromArrayLike (that, array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  that = createBuffer(that, length)
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

function fromArrayBuffer (that, array, byteOffset, length) {
  array.byteLength // this throws if `array` is not a valid ArrayBuffer

  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('\'offset\' is out of bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('\'length\' is out of bounds')
  }

  if (byteOffset === undefined && length === undefined) {
    array = new Uint8Array(array)
  } else if (length === undefined) {
    array = new Uint8Array(array, byteOffset)
  } else {
    array = new Uint8Array(array, byteOffset, length)
  }

  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    that = array
    that.__proto__ = Buffer.prototype
  } else {
    // Fallback: Return an object instance of the Buffer class
    that = fromArrayLike(that, array)
  }
  return that
}

function fromObject (that, obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    that = createBuffer(that, len)

    if (that.length === 0) {
      return that
    }

    obj.copy(that, 0, 0, len)
    return that
  }

  if (obj) {
    if ((typeof ArrayBuffer !== 'undefined' &&
        obj.buffer instanceof ArrayBuffer) || 'length' in obj) {
      if (typeof obj.length !== 'number' || isnan(obj.length)) {
        return createBuffer(that, 0)
      }
      return fromArrayLike(that, obj)
    }

    if (obj.type === 'Buffer' && isArray(obj.data)) {
      return fromArrayLike(that, obj.data)
    }
  }

  throw new TypeError('First argument must be a string, Buffer, ArrayBuffer, Array, or array-like object.')
}

function checked (length) {
  // Note: cannot use `length < kMaxLength()` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= kMaxLength()) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + kMaxLength().toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return !!(b != null && b._isBuffer)
}

Buffer.compare = function compare (a, b) {
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError('Arguments must be Buffers')
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (typeof ArrayBuffer !== 'undefined' && typeof ArrayBuffer.isView === 'function' &&
      (ArrayBuffer.isView(string) || string instanceof ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    string = '' + string
  }

  var len = string.length
  if (len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
      case undefined:
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) return utf8ToBytes(string).length // assume utf8
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// The property is used by `Buffer.isBuffer` and `is-buffer` (in Safari 5-7) to detect
// Buffer instances.
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length | 0
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  if (this.length > 0) {
    str = this.toString('hex', 0, max).match(/.{2}/g).join(' ')
    if (this.length > max) str += ' ... '
  }
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (!Buffer.isBuffer(target)) {
    throw new TypeError('Argument must be a Buffer')
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset  // Coerce to Number.
  if (isNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (Buffer.TYPED_ARRAY_SUPPORT &&
        typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  if (strLen % 2 !== 0) throw new TypeError('Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (isNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset | 0
    if (isFinite(length)) {
      length = length | 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  // legacy write(string, encoding, offset, length) - remove in v0.13
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
      : (firstByte > 0xBF) ? 2
      : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256)
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    newBuf = this.subarray(start, end)
    newBuf.__proto__ = Buffer.prototype
  } else {
    var sliceLen = end - start
    newBuf = new Buffer(sliceLen, undefined)
    for (var i = 0; i < sliceLen; ++i) {
      newBuf[i] = this[i + start]
    }
  }

  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  this[offset] = (value & 0xff)
  return offset + 1
}

function objectWriteUInt16 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 2); i < j; ++i) {
    buf[offset + i] = (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
      (littleEndian ? i : 1 - i) * 8
  }
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
  } else {
    objectWriteUInt16(this, value, offset, true)
  }
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = (value & 0xff)
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

function objectWriteUInt32 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffffffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 4); i < j; ++i) {
    buf[offset + i] = (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
  }
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset + 3] = (value >>> 24)
    this[offset + 2] = (value >>> 16)
    this[offset + 1] = (value >>> 8)
    this[offset] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, true)
  }
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
  } else {
    objectWriteUInt16(this, value, offset, true)
  }
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = (value & 0xff)
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
    this[offset + 2] = (value >>> 16)
    this[offset + 3] = (value >>> 24)
  } else {
    objectWriteUInt32(this, value, offset, true)
  }
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('sourceStart out of bounds')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start
  var i

  if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else if (len < 1000 || !Buffer.TYPED_ARRAY_SUPPORT) {
    // ascending copy from start
    for (i = 0; i < len; ++i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, start + len),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if (code < 256) {
        val = code
      }
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
  } else if (typeof val === 'number') {
    val = val & 255
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : utf8ToBytes(new Buffer(val, encoding).toString())
    var len = bytes.length
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+\/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = stringtrim(str).replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

function isnan (val) {
  return val !== val // eslint-disable-line no-self-compare
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/node_modules\\browserify\\node_modules\\buffer\\index.js","/node_modules\\browserify\\node_modules\\buffer")

},{"_process":5,"base64-js":2,"buffer":1,"ieee754":3,"isarray":4}],2:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict'

exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function placeHoldersCount (b64) {
  var len = b64.length
  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // the number of equal signs (place holders)
  // if there are two placeholders, than the two characters before it
  // represent one byte
  // if there is only one, then the three characters before it represent 2 bytes
  // this is just a cheap hack to not do indexOf twice
  return b64[len - 2] === '=' ? 2 : b64[len - 1] === '=' ? 1 : 0
}

function byteLength (b64) {
  // base64 is 4/3 + up to two characters of the original data
  return b64.length * 3 / 4 - placeHoldersCount(b64)
}

function toByteArray (b64) {
  var i, j, l, tmp, placeHolders, arr
  var len = b64.length
  placeHolders = placeHoldersCount(b64)

  arr = new Arr(len * 3 / 4 - placeHolders)

  // if there are placeholders, only get up to the last complete 4 chars
  l = placeHolders > 0 ? len - 4 : len

  var L = 0

  for (i = 0, j = 0; i < l; i += 4, j += 3) {
    tmp = (revLookup[b64.charCodeAt(i)] << 18) | (revLookup[b64.charCodeAt(i + 1)] << 12) | (revLookup[b64.charCodeAt(i + 2)] << 6) | revLookup[b64.charCodeAt(i + 3)]
    arr[L++] = (tmp >> 16) & 0xFF
    arr[L++] = (tmp >> 8) & 0xFF
    arr[L++] = tmp & 0xFF
  }

  if (placeHolders === 2) {
    tmp = (revLookup[b64.charCodeAt(i)] << 2) | (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[L++] = tmp & 0xFF
  } else if (placeHolders === 1) {
    tmp = (revLookup[b64.charCodeAt(i)] << 10) | (revLookup[b64.charCodeAt(i + 1)] << 4) | (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[L++] = (tmp >> 8) & 0xFF
    arr[L++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] + lookup[num >> 12 & 0x3F] + lookup[num >> 6 & 0x3F] + lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var output = ''
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    output += lookup[tmp >> 2]
    output += lookup[(tmp << 4) & 0x3F]
    output += '=='
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + (uint8[len - 1])
    output += lookup[tmp >> 10]
    output += lookup[(tmp >> 4) & 0x3F]
    output += lookup[(tmp << 2) & 0x3F]
    output += '='
  }

  parts.push(output)

  return parts.join('')
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/node_modules\\browserify\\node_modules\\buffer\\node_modules\\base64-js\\index.js","/node_modules\\browserify\\node_modules\\buffer\\node_modules\\base64-js")

},{"_process":5,"buffer":1}],3:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/node_modules\\browserify\\node_modules\\buffer\\node_modules\\ieee754\\index.js","/node_modules\\browserify\\node_modules\\buffer\\node_modules\\ieee754")

},{"_process":5,"buffer":1}],4:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
var toString = {}.toString;

module.exports = Array.isArray || function (arr) {
  return toString.call(arr) == '[object Array]';
};

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/node_modules\\browserify\\node_modules\\buffer\\node_modules\\isarray\\index.js","/node_modules\\browserify\\node_modules\\buffer\\node_modules\\isarray")

},{"_process":5,"buffer":1}],5:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/node_modules\\browserify\\node_modules\\process\\browser.js","/node_modules\\browserify\\node_modules\\process")

},{"_process":5,"buffer":1}],6:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

var classCallCheck = function (instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};

var createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();









var inherits = function (subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
  }

  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
};











var possibleConstructorReturn = function (self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }

  return call && (typeof call === "object" || typeof call === "function") ? call : self;
};

var Events = function () {
	function Events() {
		classCallCheck(this, Events);

		this.listeners = {};
	}

	// take this event name, and run this handler when it occurs


	createClass(Events, [{
		key: "on",
		value: function on(event, handler) {
			if (this.listeners[event] === undefined) {
				this.listeners[event] = [handler];
			} else {
				this.listeners[event].push(handler);
			}
			return handler;
		}
	}, {
		key: "off",


		// unbind this event and handler
		value: function off(event) {
			var handler = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;

			if (this.listeners[event]) {
				if (handler == null) {
					for (var i = this.listeners[event].length - 1; i >= 0; i--) {
						if (this.listeners[event].length === 1) {
							delete this.listeners[event];
							return true;
						} else {
							this.listeners[event].splice(i, 1);
							return true;
						}
					}
				} else {
					for (var _i = 0; _i < this.listeners[event].length; _i++) {
						if (this.listeners[event][_i] == handler) {
							this.listeners[event].splice(_i, 1);
							if (this.listeners[event].length === 0) {
								delete this.listeners[event];
							}
							return true;
						}
					}
				}
			}
			return false;
		}
	}, {
		key: "trigger",
		value: function trigger(event, data) {
			if (this.listeners[event]) {
				for (var i = this.listeners[event].length - 1; i >= 0; i--) {
					if (this.listeners[event] !== undefined) {
						if (typeof this.listeners[event][i] === "function" && this.listeners[event][i]) {
							this.listeners[event][i](data);
						} else {
							throw "Event handler is not a function.";
						}
					}
				}
			}
		}
	}]);
	return Events;
}();

var GLOBAL_TUNE = 440;
var MIDI_14BIT_MAX_VALUE = 16384;
var MIDI_MAX_VALUE = 127;

var Convert = function () {
	function Convert() {
		classCallCheck(this, Convert);
	}

	createClass(Convert, null, [{
		key: "MIDINoteToFrequency",
		value: function MIDINoteToFrequency(midinote) {
			var tune = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : GLOBAL_TUNE;

			return tune * Math.pow(2, (midinote - 69) / 12); //
		}
	}, {
		key: "PitchWheelToPolar",
		value: function PitchWheelToPolar(raw) {
			return -(MIDI_14BIT_MAX_VALUE * 0.5 - raw);
		}
	}, {
		key: "PitchWheelToPolarRatio",
		value: function PitchWheelToPolarRatio(raw) {
			return Convert.PitchWheelToPolar(raw) / (MIDI_14BIT_MAX_VALUE * 0.5);
		}
	}, {
		key: "MidiValueToRatio",
		value: function MidiValueToRatio(value) {
			return value / MIDI_MAX_VALUE;
		}
	}, {
		key: "MidiValueToPolarRatio",
		value: function MidiValueToPolarRatio(value) {
			var halfmax = MIDI_MAX_VALUE * 0.5;
			return -(halfmax - value) / halfmax;
		}
	}]);
	return Convert;
}();

var MIDI_NOTE_ON = 0x90;
var MIDI_NOTE_OFF = 0x80;
var MIDI_AFTERTOUCH = 0xA0;
var MIDI_CONTROL_CHANGE = 0xB0;
var MIDI_PROGRAM_CHANGE = 0xC0;
var MIDI_CHANNEL_PRESSURE = 0xD0;
var MIDI_PITCHBEND = 0xE0;

var MIDI_MESSAGE_EVENT = "midimessage";

var NOTE_ON_EVENT = "NoteOn";
var NOTE_OFF_EVENT = "NoteOff";
var PITCHWHEEL_EVENT = "PitchWheel";
var CONTROLLER_EVENT = "Controller";
var PROGRAM_CHANGE_EVENT = "ProgramChange";
var AFTERTOUCH_EVENT = "Aftertouch";

var KEYBOARD_EVENT_KEY_DOWN = "keydown";
var KEYBOARD_EVENT_KEY_UP = "keyup";

var ENHARMONIC_KEYS = ["C", "G", "D", "A", "E", "B", "Cb", "F#", "Gb", "C#", "Db", "Ab", "Eb", "Bb", "F"];

var MIDI_NOTE_MAP = {
	"C": [0, 12, 24, 36, 48, 60, 72, 84, 96, 108, 120],
	"D": [2, 14, 26, 38, 50, 62, 74, 86, 98, 110, 122],
	"E": [4, 16, 28, 40, 52, 64, 76, 88, 100, 112, 124],
	"F": [5, 17, 29, 41, 53, 65, 77, 89, 101, 113, 125],
	"G": [7, 19, 31, 43, 55, 67, 79, 91, 103, 115, 127],
	"A": [9, 21, 33, 45, 57, 69, 81, 93, 105, 117],
	"B": [11, 23, 35, 47, 59, 71, 83, 95, 107, 119],
	"C#": [1, 13, 25, 37, 49, 61, 73, 85, 97, 109, 121],
	"D#": [3, 15, 27, 39, 51, 63, 75, 87, 99, 111, 123],
	"E#": [5, 17, 29, 41, 53, 65, 77, 89, 101, 113, 125],
	"F#": [6, 18, 30, 42, 54, 66, 78, 90, 102, 114, 126],
	"G#": [8, 20, 32, 44, 56, 68, 80, 92, 104, 116],
	"A#": [10, 22, 34, 46, 58, 70, 82, 94, 106, 118],
	"B#": [0, 12, 24, 36, 48, 60, 72, 84, 96, 108, 120],
	"Db": [1, 13, 25, 37, 49, 61, 73, 85, 97, 109, 121],
	"Eb": [3, 15, 27, 39, 51, 63, 75, 87, 99, 111, 123],
	"Fb": [4, 16, 28, 40, 52, 64, 76, 88, 100, 112, 124],
	"Gb": [6, 18, 30, 42, 54, 66, 78, 90, 102, 114, 126],
	"Ab": [8, 20, 32, 44, 56, 68, 80, 92, 104, 116],
	"Bb": [10, 22, 34, 46, 58, 70, 82, 94, 106, 118],
	"Cb": [11, 23, 35, 47, 59, 71, 83, 95, 107, 119]
};



var KEY_NOTE_ARRAYS = {
	"C": ["C", "D", "E", "F", "G", "A", "B"],
	"G": ["G", "A", "B", "C", "D", "E", "F#"],
	"D": ["D", "E", "F#", "G", "A", "B", "C#"],
	"A": ["A", "B", "C#", "D", "E", "F#", "G#"],
	"E": ["E", "F#", "G#", "A", "B", "C#", "D#"],
	"B": ["B", "C#", "D#", "E", "F#", "G#", "A#"],
	"F#": ["F#", "G#", "A#", "B", "C#", "D#", "E#"],
	"C#": ["C#", "D#", "E#", "F#", "G#", "A#", "B#"],
	"Cb": ["Cb", "Db", "Eb", "Fb", "Gb", "Ab", "Bb"],
	"Gb": ["Gb", "Ab", "Bb", "Cb", "Db", "Eb", "F"],
	"Db": ["Db", "Eb", "F", "Gb", "Ab", "Bb", "C"],
	"Ab": ["Ab", "Bb", "C", "Db", "Eb", "F", "G"],
	"Eb": ["Eb", "F", "G", "Ab", "Bb", "C", "D"],
	"Bb": ["Bb", "C", "D", "Eb", "F", "G", "A"],
	"F": ["F", "G", "A", "Bb", "C", "D", "E"]
};

var DataProcess = function () {
	function DataProcess() {
		classCallCheck(this, DataProcess);
	}

	createClass(DataProcess, null, [{
		key: "NoteEvent",

		// add all of our extra data to the MIDI message event.
		value: function NoteEvent(message) {
			var key = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : ENHARMONIC_KEYS[0];
			var transpose = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;

			var value = message.data[1] + transpose;
			var notes = this.getNoteNames(value);
			var data = {
				"enharmonics": notes,
				"note": DataProcess.findNoteInKey(notes, key),
				"inKey": DataProcess.isNoteInKey(notes, key),
				"value": value,
				"velocity": message.data[2],
				"frequency": Convert.MIDINoteToFrequency(value)
			};
			return Object.assign(message, data);
		}
	}, {
		key: "CCEvent",


		// add all of our extra data to the MIDI message event.
		value: function CCEvent(message, ccNameOverride) {
			return Object.assign(message, {
				"cc": ccNameOverride || message.data[1],
				"value": message.data[2],
				"ratio": Convert.MidiValueToRatio(message.data[2]),
				"polarRatio": Convert.MidiValueToPolarRatio(message.data[2])
			});
		}

		// add all of our extra data to the MIDI message event.

	}, {
		key: "MidiControlEvent",
		value: function MidiControlEvent(message, controlName) {
			return Object.assign(message, {
				"cc": controlName,
				"value": message.data[1],
				"ratio": Convert.MidiValueToRatio(message.data[2])
			});
		}

		// add all of our extra data to the MIDI message event.

	}, {
		key: "PitchWheelEvent",
		value: function PitchWheelEvent(message) {
			var raw = message.data[1] | message.data[2] << 7;
			return Object.assign(message, {
				"cc": "pitchwheel",
				"value": raw,
				"polar": Convert.PitchWheelToPolar(raw),
				"polarRatio": Convert.PitchWheelToPolarRatio(raw)
			});
		}

		// process the midi message. Go through each type and add processed data
		// when done, check for any bound events and run them.

		// get a list of notes that match this noteNumber

	}, {
		key: "getNoteNames",
		value: function getNoteNames(noteNumber) {
			var noteNames = []; // create a list for the notes
			for (var note in MIDI_NOTE_MAP) {
				// loop through the note table and push notes that match.
				MIDI_NOTE_MAP[note].forEach(function (keynumber) {
					if (noteNumber === keynumber) {
						noteNames.push(note);
					}
				});
			}
			return noteNames;
		}
	}, {
		key: "findNoteInKey",


		// find the first note that is in the current key
		value: function findNoteInKey(notes, key) {
			// loop through the note list
			for (var i = 0; i < notes.length; i++) {
				var note = notes[i];
				if (DataProcess.matchNoteInKey(note, key)) {
					return note;
				}
			}
			return notes[0];
		}
	}, {
		key: "isNoteInKey",


		// is this note in key
		value: function isNoteInKey(notes, key) {
			for (var n = 0; n < notes.length; n++) {
				var note = notes[n];
				if (this.matchNoteInKey(note, key)) {
					return true;
				}
			}
			return false;
		}
	}, {
		key: "matchNoteInKey",
		value: function matchNoteInKey(note, key) {
			for (var i = 0; i < KEY_NOTE_ARRAYS[key].length; i++) {
				var keynote = KEY_NOTE_ARRAYS[key][i];
				if (note === keynote) {
					return true;
				}
			}
			return false;
		}
	}]);
	return DataProcess;
}();

var Generate = function () {
	function Generate() {
		classCallCheck(this, Generate);
	}

	createClass(Generate, null, [{
		key: "NoteOn",
		value: function NoteOn(noteNumber, velocity) {
			return new Uint8Array([MIDI_NOTE_ON, noteNumber, velocity]);
		}
	}, {
		key: "NoteOff",
		value: function NoteOff(noteNumber, velocity) {
			return new Uint8Array([MIDI_NOTE_OFF, noteNumber, velocity]);
		}
	}, {
		key: "AfterTouch",
		value: function AfterTouch(noteNumber, value) {
			return new Uint8Array([MIDI_AFTERTOUCH, noteNumber, value]);
		}
	}, {
		key: "CC",
		value: function CC(controller, value) {
			return new Uint8Array([MIDI_CONTROL_CHANGE, controller, value]);
		}
	}, {
		key: "ProgramChange",
		value: function ProgramChange(instrument) {
			return new Uint8Array([MIDI_PROGRAM_CHANGE, instrument]);
		}
	}, {
		key: "ChannelPressure",
		value: function ChannelPressure(pressure) {
			return new Uint8Array([MIDI_CHANNEL_PRESSURE, pressure]);
		}
	}, {
		key: "PitchBend",
		value: function PitchBend(value) {
			var msb = 0,
			    lsb = 0;
			return new Uint8Array([MIDI_PITCHBEND, msb, lsb]);
		}
	}, {
		key: "NoteEvent",
		value: function NoteEvent(messageType, value) {
			var velocity = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 127;

			var data = null;
			switch (messageType) {
				case NOTE_ON_EVENT:
					data = Generate.NoteOn(value, velocity);
					break;
				case NOTE_OFF_EVENT:
					data = Generate.NoteOff(value, velocity);
					break;
			}
			var newMessage = new MIDIMessageEvent(MIDI_MESSAGE_EVENT, { "data": data }) || { "data": data };
			return DataProcess.NoteEvent(newMessage, this.key);
		}
	}, {
		key: "CCEvent",
		value: function CCEvent(cc, value) {
			var data = Generate.CC(cc, value);
			var newMessage = new MIDIMessageEvent(MIDI_MESSAGE_EVENT, { "data": data });
			return DataProcess.CCEvent(newMessage);
		}
	}, {
		key: "PitchBendEvent",
		value: function PitchBendEvent(value) {
			var data = Generate.PitchBend(value);
			var newMessage = new MIDIMessageEvent(MIDI_MESSAGE_EVENT, { "data": data });
			return DataProcess.CCEvent(newMessage);
		}
	}]);
	return Generate;
}();

/**
 * MIDIEvents - contains all the functionality for binding and removing MIDI events
 */
var KEY_CODE_MAP = {
	"90": 60,
	"83": 61,
	"88": 62,
	"68": 63,
	"67": 64,
	"86": 65,
	"71": 66,
	"66": 67,
	"72": 68,
	"78": 69,
	"74": 70,
	"77": 71,
	"188": 72
};

var MIDIEvents = function (_Events) {
	inherits(MIDIEvents, _Events);

	function MIDIEvents() {
		classCallCheck(this, MIDIEvents);

		var _this = possibleConstructorReturn(this, (MIDIEvents.__proto__ || Object.getPrototypeOf(MIDIEvents)).call(this));

		_this.keysPressed = [];
		_this.keyboadKeyPressed = [];
		return _this;
	}

	/**
  * onMIDIMessage handles all incoming midi messages, processes them and then routes them to the correct event handler.
  * @param message
  * @param key
  */


	createClass(MIDIEvents, [{
		key: "onMIDIMessage",
		value: function onMIDIMessage(message) {
			var key = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : ENHARMONIC_KEYS[0];

			var eventName = null,
			    data = null;
			switch (message.data[0]) {
				case 128:
					eventName = NOTE_OFF_EVENT;
					delete this.keysPressed[message.data[1]];
					data = DataProcess.NoteEvent(message, key);
					break;
				case 144:
					// handle 0 velocity as a note off event
					if (message.data[2] > 0) {
						eventName = NOTE_ON_EVENT;
					} else {
						eventName = NOTE_OFF_EVENT;
					}
					data = DataProcess.NoteEvent(message, key);
					if (eventName == NOTE_ON_EVENT) {
						this.keysPressed[message.data[1]] = data;
					} else {
						delete this.keysPressed[message.data[1]];
					}
					break;
				case 176:
					eventName = CONTROLLER_EVENT;
					data = DataProcess.CCEvent(message);
					break;
				case 224:
					eventName = PITCHWHEEL_EVENT;
					data = DataProcess.PitchWheelEvent(message);
					break;
				case 208:
					eventName = AFTERTOUCH_EVENT;
					data = DataProcess.MidiControlEvent(message, eventName);
					break;
				case 192:
					eventName = PROGRAM_CHANGE_EVENT;
					data = DataProcess.MidiControlEvent(message, eventName);
					break;
			}
			// if there is no event name, then we don't support that event yet so do nothing.
			if (eventName !== null) {
				this.trigger(eventName, data);
			}
		}
	}, {
		key: "onCC",


		/**
   * EZ binding for a single Control Change data, just pass in the CC number and handler. This returns an anonymous function which you should store a reference to if you want to unbind this CC later.
   * @param cc
   * @param handler
   * @returns {Function}
   */
		value: function onCC(cc, handler) {
			return this.on(CONTROLLER_EVENT, function (data) {
				if (data.cc == cc) {
					handler(data);
				}
			});
		}

		/**
   * Takes the CC# and Event handler and removes the event from the listeners.
   * @param handler
   * @returns {Boolean}
   */

	}, {
		key: "removeCC",
		value: function removeCC(handler) {
			return this.off(CONTROLLER_EVENT, handler);
		}

		/**
   * KeyToggle will bind to all MIDI note events and execute the `keyDown` handler when the key is pressed and `keyUp` handler when the key is released. This function returns the reference to the handlers created for these events. Pass this reference into removeKeyToggle to unbind these events.
   *
   * ### Usage
   * ```
   * var m = new Mizzy();
   * var toggleKeys = m.keyToggle((e) => console.log(e),(e) => console.log(e));
   * // when ready to unbind
   * m.removeKeyToggle(toggleKeys);
   * ```
   *
   * @param handlerOn
   * @param handlerOff
   * @returns {{on: Function, off: Function}}
   */

	}, {
		key: "keyToggle",
		value: function keyToggle(keyDown, keyUp) {
			return {
				keyDown: this.on(NOTE_ON_EVENT, keyDown),
				keyUp: this.on(NOTE_OFF_EVENT, keyUp)
			};
		}
	}, {
		key: "removeKeyToggle",


		/**
   * This will unbind the keyToggle. Pass in the reference created when you called `keyToggle()`
   * @param toggles
   */
		value: function removeKeyToggle(toggles) {
			this.off(NOTE_ON_EVENT, toggles.keyDown);
			this.off(NOTE_OFF_EVENT, toggles.keyUp);
		}

		/**
   * EZ binding for individual key values. Pass in the note number you want to wait for (ie 60 = middle c) and the handler for it. This function will return a reference to the handler created for this note.
   * @param number
   * @param handler
   * @returns {Function}
   */

	}, {
		key: "pressNoteNumber",
		value: function pressNoteNumber(number, handler) {
			return this.on(NOTE_ON_EVENT, function (data) {
				if (data.value == number) {
					handler(data);
				}
			});
		}
	}, {
		key: "removePressNoteNumber",
		value: function removePressNoteNumber(handler) {
			return this.off(NOTE_ON_EVENT, handler);
		}
		// EZ binding for key values. Can only be unbound with unbindALL()

	}, {
		key: "releaseNoteNumber",
		value: function releaseNoteNumber(number, handler) {
			return this.on(NOTE_OFF_EVENT, function (data) {
				if (data.value == number) {
					handler(data);
				}
			});
		}
	}, {
		key: "removeReleaseNoteNumber",
		value: function removeReleaseNoteNumber(handler) {
			return this.off(NOTE_OFF_EVENT, handler);
		}

		/**
   * Bind keyboard splits. 
   * @param min
   * @param max
   * @param onHandler
   * @param offHandler
   * @returns {{onRange: Array, offRange: Array}}
   */

	}, {
		key: "keyToggleRange",
		value: function keyToggleRange(min, max, onHandler, offHandler) {
			return {
				press: this.onSplit(min, max, onHandler),
				release: this.offSplit(min, max, offHandler)
			};
		}
	}, {
		key: "onSplit",
		value: function onSplit(min, max, onHandler) {
			var on = [];
			if (max > min) {
				for (var i = min; i <= max; i++) {
					on.push(this.pressNoteNumber(i, onHandler));
				}
			} else {
				for (var _i = max; _i >= min; _i--) {
					on.push(this.pressNoteNumber(_i, onHandler));
				}
			}
			return on;
		}
	}, {
		key: "offSplit",
		value: function offSplit(min, max, offHandler) {
			var off = [];
			if (max > min) {
				for (var i = min; i <= max; i++) {
					off.push(this.releaseNoteNumber(i, offHandler));
				}
			} else {
				for (var _i2 = max; _i2 >= min; _i2--) {
					off.push(this.releaseNoteNumber(_i2, offHandler));
				}
			}
			return off;
		}
	}, {
		key: "removeKeyToggleRange",
		value: function removeKeyToggleRange(ranges) {
			var _this2 = this;

			var removeOnRanges = ranges.press.forEach(function (noteHandler) {
				return _this2.removePressNoteNumber(noteHandler);
			});
			var removeOffRanges = ranges.release.forEach(function (noteHandler) {
				return _this2.removeReleaseNoteNumber(noteHandler);
			});
			return removeOffRanges == true && removeOnRanges == true;
		}

		/**
   * Removes all bound handlers for all events. Great for when you know you need to lose all the events.
   * @returns {boolean}
   */

	}, {
		key: "unbindAll",
		value: function unbindAll() {
			this.unBindKeyboard();
			for (var event in this.listeners) {
				delete this.listeners[event];
			}
			return true;
		}
	}, {
		key: "bindKeyboard",


		/**
   * Bind the computer (qwerty) keyboard to allow it to generate MIDI note on and note off messages.
   */
		value: function bindKeyboard() {
			var _this3 = this;

			window.addEventListener(KEYBOARD_EVENT_KEY_DOWN, function (e) {
				return _this3.keyboardKeyDown(e);
			});
			window.addEventListener(KEYBOARD_EVENT_KEY_UP, function (e) {
				return _this3.keyboardKeyUp(e);
			});
		}
	}, {
		key: "unBindKeyboard",
		value: function unBindKeyboard() {
			var _this4 = this;

			window.removeEventListener(KEYBOARD_EVENT_KEY_DOWN, function (e) {
				return _this4.keyboardKeyDown(e);
			});
			window.removeEventListener(KEYBOARD_EVENT_KEY_UP, function (e) {
				return _this4.keyboardKeyUp(e);
			});
		}
	}, {
		key: "keyboardKeyDown",
		value: function keyboardKeyDown(message) {
			if (KEY_CODE_MAP[message.keyCode] != undefined) {
				if (this.keyboadKeyPressed[message.keyCode] != true) {
					this.keyboadKeyPressed[message.keyCode] = true;
					var newMessage = Generate.NoteEvent(NOTE_ON_EVENT, KEY_CODE_MAP[message.keyCode]);
					if (newMessage !== null) {
						this.sendMidiMessage(newMessage);
					}
				}
			}
		}
	}, {
		key: "keyboardKeyUp",
		value: function keyboardKeyUp(message) {
			if (KEY_CODE_MAP[message.keyCode] != undefined) {
				if (this.keyboadKeyPressed[message.keyCode] == true) {
					delete this.keyboadKeyPressed[message.keyCode];
					var newMessage = Generate.NoteEvent(NOTE_OFF_EVENT, KEY_CODE_MAP[message.keyCode]);
					if (newMessage !== null) {
						this.sendMidiMessage(newMessage);
					}
				}
			}
		}
	}, {
		key: "sendMidiMessage",
		value: function sendMidiMessage(message) {}
	}]);
	return MIDIEvents;
}(Events);

var Mizzy = function (_MIDIEvents) {
	inherits(Mizzy, _MIDIEvents);
	createClass(Mizzy, null, [{
		key: "Generate",
		get: function get$$1() {
			return Generate;
		}
	}, {
		key: "NOTE_ON",
		get: function get$$1() {
			return NOTE_ON_EVENT;
		}
	}, {
		key: "NOTE_OFF",
		get: function get$$1() {
			return NOTE_OFF_EVENT;
		}
	}, {
		key: "CONTROLCHANGE",
		get: function get$$1() {
			return CONTROLLER_EVENT;
		}
	}, {
		key: "PITCHWHEEL",
		get: function get$$1() {
			return PITCHWHEEL_EVENT;
		}
	}]);

	function Mizzy() {
		classCallCheck(this, Mizzy);

		var _this = possibleConstructorReturn(this, (Mizzy.__proto__ || Object.getPrototypeOf(Mizzy)).call(this));

		_this.keysPressed = [];
		_this.midiAccess = null;
		_this.loopback = true;

		_this.boundInputs = [];
		_this.boundOutputs = [];

		_this.key = ENHARMONIC_KEYS[0]; // C-Major

		if (!window.MIDIMessageEvent) {
			window.MIDIMessageEvent = function (name, params) {
				_this.name = name;
				return Object.assign(_this, params);
			};
		}

		return _this;
	}

	createClass(Mizzy, [{
		key: "initialize",
		value: function initialize() {
			var _this2 = this;

			if (this.midiAccess === null) {
				if (navigator.requestMIDIAccess) {
					return navigator.requestMIDIAccess({
						sysex: false
					}).then(function (e) {
						return _this2.onMIDISuccess(e);
					}, function (e) {
						return _this2.onMIDIFailure(e);
					});
				} else {
					console.warn("[Mizzy] Your browser does not support Web MIDI API. You can still use the local loopback however.");
					return new Promise(function (resolve, reject) {
						setTimeout(function () {
							resolve();
						}, 50);
					});
				}
			}
		}
	}, {
		key: "setKey",
		value: function setKey() {
			var keyletter = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "C";

			this.key = ENHARMONIC_KEYS[ENHARMONIC_KEYS.indexOf(keyletter.toUpperCase())] || "C";
		}
	}, {
		key: "getMidiInputs",
		value: function getMidiInputs() {
			if (this.midiAccess != null) {
				return this.midiAccess.inputs.values();
			}
		}
	}, {
		key: "getMidiOutputs",
		value: function getMidiOutputs() {
			if (this.midiAccess != null) {
				return this.midiAccess.outputs.values();
			}
		}
	}, {
		key: "bindToInput",
		value: function bindToInput(input) {
			var _this3 = this;

			this.boundInputs.push(input);
			input.onmidimessage = function (e) {
				return _this3.onMIDIMessage(e, _this3.key);
			};
		}
	}, {
		key: "unbindInput",
		value: function unbindInput(input) {
			var index = this.boundInputs.indexOf(input);
			this.boundInputs.slice(1, index);
			input.onmidimessage = null;
		}
	}, {
		key: "bindToAllInputs",
		value: function bindToAllInputs() {
			if (this.midiAccess != null) {
				var inputs = this.getMidiInputs();
				for (var input = inputs.next(); input && !input.done; input = inputs.next()) {
					this.bindToInput(input.value);
				}
			}
		}
	}, {
		key: "unbindAllInputs",
		value: function unbindAllInputs() {
			this.boundInputs.forEach(this.unbindInput);
		}
	}, {
		key: "bindToOutput",
		value: function bindToOutput(output) {
			this.boundOutputs.push(output);
		}
	}, {
		key: "bindToAllOutputs",
		value: function bindToAllOutputs() {
			if (this.midiAccess != null) {
				var outputs = this.getMidiOutputs();
				for (var output = outputs.next(); output && !output.done; output = outputs.next()) {
					this.bindToOutput(output.value);
				}
			}
		}
	}, {
		key: "onMIDIFailure",
		value: function onMIDIFailure(error) {
			throw error;
		}
	}, {
		key: "onMIDISuccess",
		value: function onMIDISuccess(midiAccessObj) {
			this.midiAccess = midiAccessObj;
		}
	}, {
		key: "sendMidiMessage",
		value: function sendMidiMessage(message) {
			this.boundOutputs.forEach(function (output) {
				output.send(message.data, message.timeStamp);
			});
			if (this.loopback) {
				this.onMIDIMessage(message, this.key);
			}
		}
	}, {
		key: "keys",
		get: function get$$1() {
			return ENHARMONIC_KEYS;
		}
	}, {
		key: "outputDevices",
		get: function get$$1() {
			var deviceArray = [];
			var devices = this.getMidiOutputs();
			for (var input = devices.next(); input && !input.done; input = devices.next()) {
				deviceArray.push(input.value);
			}
			return deviceArray;
		}
	}, {
		key: "inputDevices",
		get: function get$$1() {
			var deviceArray = [];
			var devices = this.getMidiInputs();
			for (var input = devices.next(); input && !input.done; input = devices.next()) {
				deviceArray.push(input.value);
			}
			return deviceArray;
		}
	}]);
	return Mizzy;
}(MIDIEvents);

module.exports = Mizzy;



}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/node_modules\\mizzy\\dist\\mizzy.cjs.js","/node_modules\\mizzy\\dist")

},{"_process":5,"buffer":1}],7:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
"use strict";

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var AmpEnvelope = function () {
	function AmpEnvelope(context) {
		var gain = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0.1;

		_classCallCheck(this, AmpEnvelope);

		this.context = context;
		this.output = this.context.createGain();
		this.output.gain.value = gain;
		this.partials = [];
		this.velocity = 0;
		this.gain = gain;
		this.envelope = {
			a: 0,
			d: 0.1,
			s: this.gain,
			r: 0.5
		};
	}

	_createClass(AmpEnvelope, [{
		key: "on",
		value: function on(velocity) {
			this.velocity = velocity / 127;
			this.start(this.context.currentTime);
		}
	}, {
		key: "off",
		value: function off(MidiEvent) {
			return this.stop(this.context.currentTime);
		}
	}, {
		key: "start",
		value: function start(time) {
			this.output.gain.value = 0;
			this.output.gain.setValueAtTime(0, time);
			return this.output.gain.setTargetAtTime(this.sustain * this.velocity, time + this.attack, this.decay + 0.001);
		}
	}, {
		key: "stop",
		value: function stop(time) {
			this.output.gain.cancelScheduledValues(time);
			this.output.gain.setValueAtTime(this.sustain, time);
			this.output.gain.setTargetAtTime(0, time, this.release);
		}
	}, {
		key: "connect",
		value: function connect(destination) {
			this.output.connect(destination);
		}
	}, {
		key: "attack",
		set: function set(value) {
			this.envelope.a = value;
		},
		get: function get() {
			return this.envelope.a;
		}
	}, {
		key: "decay",
		set: function set(value) {
			this.envelope.d = value;
		},
		get: function get() {
			return this.envelope.d;
		}
	}, {
		key: "sustain",
		set: function set(value) {
			this.gain = value;
			this.envelope.s = value;
		},
		get: function get() {
			return this.gain;
		}
	}, {
		key: "release",
		set: function set(value) {
			this.envelope.r = value;
		},
		get: function get() {
			return this.envelope.r;
		}
	}]);

	return AmpEnvelope;
}();

exports.default = AmpEnvelope;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src\\Components\\AmpEnvelope.js","/src\\Components")

},{"_process":5,"buffer":1}],8:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
"use strict";

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Filter = function () {
	function Filter(context) {
		var type = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : "lowpass";
		var cutoff = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 1000;
		var resonance = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 0.1;

		_classCallCheck(this, Filter);

		this.context = context;
		this.destination = this.context.createBiquadFilter();
		this.type = type;
		this.cutoff = cutoff;
		this.resonance = 0.1;
		this.envelopeAmount = 1;
		this.envelope = {
			a: 0,
			d: 0.5,
			s: this.cutoff,
			r: 0.5
		};
	}

	_createClass(Filter, [{
		key: "on",
		value: function on(MidiEvent) {
			this.start(this.context.currentTime, MidiEvent.frequency);
		}
	}, {
		key: "off",
		value: function off() {
			return this.stop(this.context.currentTime);
		}
	}, {
		key: "start",
		value: function start(time) {
			return this.destination.frequency.setTargetAtTime(this.sustain, time + this.attack, this.decay + 0.001);
		}
	}, {
		key: "stop",
		value: function stop(time) {
			return this.destination.frequency.setTargetAtTime(this.cutoff, time, this.release);
		}
	}, {
		key: "connect",
		value: function connect(destination) {
			this.destination.connect(destination);
		}
	}, {
		key: "type",
		set: function set(value) {
			this.destination.type = value;
		},
		get: function get() {
			return this.destination.type;
		}
	}, {
		key: "cutoff",
		set: function set(value) {
			this.destination.frequency.value = value;
		},
		get: function get() {
			return this.destination.frequency.value;
		}
	}, {
		key: "Q",
		set: function set(value) {
			this.destination.Q.value = value;
		},
		get: function get() {
			return this.destination.Q.value;
		}
	}, {
		key: "attack",
		set: function set(value) {
			this.envelope.a = value;
		},
		get: function get() {
			return this.envelope.a;
		}
	}, {
		key: "decay",
		set: function set(value) {
			this.envelope.d = value;
		},
		get: function get() {
			return this.envelope.d;
		}
	}, {
		key: "sustain",
		set: function set(value) {
			this.cutoff = value;
		},
		get: function get() {
			return this.cutoff;
		}
	}, {
		key: "release",
		set: function set(value) {
			this.envelope.r = value;
		},
		get: function get() {
			return this.envelope.r;
		}
	}]);

	return Filter;
}();

exports.default = Filter;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src\\Effects\\Filter.js","/src\\Effects")

},{"_process":5,"buffer":1}],9:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
"use strict";

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _Noise = require("../Voices/Noise");

var _Noise2 = _interopRequireDefault(_Noise);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Reverb = function () {
	function Reverb(context) {
		var _this = this;

		_classCallCheck(this, Reverb);

		this.context = context;
		this.destination = this.context.createConvolver();
		this.reverbTime = 1;
		this.tailContext = new OfflineAudioContext(2, 48000 * this.reverbTime, 48000);
		this.buffer = this.tailContext.createBufferSource();
		this.tail = new _Noise2.default(this.tailContext);
		this.tail.connect(this.tailContext.destination);
		this.tail.trigger(100);
		this.tail.off();
		this.tailContext.startRendering().then(function (buffer) {

			_this.destination.buffer = buffer;
			// var source = new AudioBufferSourceNode(this.context, {
			// 	buffer: buffer
			// });
			//source.start();
			//source.connect(this.context.destination);
			//console.log(source, buffer.getChannelData(0), buffer.getChannelData(1));
		});
	}

	_createClass(Reverb, [{
		key: "connect",
		value: function connect(destination) {
			this.destination.connect(destination);
		}
	}]);

	return Reverb;
}();

exports.default = Reverb;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src\\Effects\\Reverb.js","/src\\Effects")

},{"../Voices/Noise":12,"_process":5,"buffer":1}],10:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
"use strict";

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _MizzyDevice2 = require("./MizzyDevice");

var _MizzyDevice3 = _interopRequireDefault(_MizzyDevice2);

var _mizzy = require("mizzy");

var _mizzy2 = _interopRequireDefault(_mizzy);

var _Voice = require("./Voices/Voice");

var _Voice2 = _interopRequireDefault(_Voice);

var _PercussionVoice = require("./Voices/PercussionVoice");

var _PercussionVoice2 = _interopRequireDefault(_PercussionVoice);

var _Filter = require("./Effects/Filter");

var _Filter2 = _interopRequireDefault(_Filter);

var _Reverb = require("./Effects/Reverb");

var _Reverb2 = _interopRequireDefault(_Reverb);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Vincent = function (_MizzyDevice) {
	_inherits(Vincent, _MizzyDevice);

	function Vincent() {
		_classCallCheck(this, Vincent);

		var _this = _possibleConstructorReturn(this, (Vincent.__proto__ || Object.getPrototypeOf(Vincent)).call(this));

		_this.context = new (window.AudioContext || window.webkitAudioContext)();

		_this.oscillatorType = "sawtooth";
		_this.voices = [];

		_this.reverb = new _Reverb2.default(_this.context);
		_this.reverb.connect(_this.context.destination);

		_this.filter = new _Filter2.default(_this.context);
		_this.filter.connect(_this.reverb.destination);

		return _this;
	}

	_createClass(Vincent, [{
		key: "NoteOn",
		value: function NoteOn(MidiEvent) {
			var voice = new _Voice2.default(this.context, this.oscillatorType);
			voice.connect(this.filter.destination);
			voice.on(MidiEvent);
			this.voices[MidiEvent.value] = voice;
		}
	}, {
		key: "NoteOff",
		value: function NoteOff(MidiEvent) {
			this.voices[MidiEvent.value].off(MidiEvent);
		}
	}]);

	return Vincent;
}(_MizzyDevice3.default);

exports.default = Vincent;


var vincent = new Vincent();

var m = new _mizzy2.default();
m.initialize().then(function () {
	m.bindToAllInputs();
	m.bindKeyboard();
	m.keyToggle(function (e) {
		vincent.NoteOn(e);
	}, function (e) {
		vincent.NoteOff(e);
	});

	m.onCC(1, function (e) {
		return updateCCValues(e);
	});
});

window.addEventListener("mousemove", function (e) {
	var x = Math.round(e.pageX / window.innerWidth * 127);
	var y = Math.round(e.pageY / window.innerHeight * 127);
	var xmessage = _mizzy2.default.Generate.CCEvent(1, x);
	m.sendMidiMessage(xmessage);
	var ymessage = _mizzy2.default.Generate.CCEvent(2, y);
	m.sendMidiMessage(ymessage);
});

function updateCCValues(e) {
	vincent.filter.cutoff = 100 + e.ratio * 8000;
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src\\Main.js","/src")

},{"./Effects/Filter":8,"./Effects/Reverb":9,"./MizzyDevice":11,"./Voices/PercussionVoice":13,"./Voices/Voice":14,"_process":5,"buffer":1,"mizzy":6}],11:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
"use strict";

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var MizzyDevice = function () {
	function MizzyDevice() {
		_classCallCheck(this, MizzyDevice);
	}

	_createClass(MizzyDevice, [{
		key: "NoteOn",
		value: function NoteOn(MidiEvent) {}
	}, {
		key: "NoteOff",
		value: function NoteOff(MidiEvent) {}
	}, {
		key: "onCC",
		value: function onCC(MidiEvent) {}
	}]);

	return MizzyDevice;
}();

exports.default = MizzyDevice;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src\\MizzyDevice.js","/src")

},{"_process":5,"buffer":1}],12:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
"use strict";

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Noise = function () {
	function Noise(context) {
		var type = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : "sawtooth";

		_classCallCheck(this, Noise);

		this.context = context;
		this.type = type;
		this.output = this.context.createGain();
		this.output.gain.value = 0;
		this.partials = [];
		this.value = -1;
		this.channelGain = 0.1;
		this.length = 2;
		this.ampEnvelope = {
			a: 0,
			d: 0.1,
			s: this.channelGain,
			r: 0.4
		};

		this.voicePartials();
	}

	_createClass(Noise, [{
		key: "voicePartials",
		value: function voicePartials() {

			var lBuffer = new Float32Array(this.length * 48000);
			var rBuffer = new Float32Array(this.length * 48000);
			for (var i = 0; i < this.length * 48000; i++) {
				lBuffer[i] = Math.random();
				rBuffer[i] = Math.random();
			}
			var bufferctx = new AudioContext();
			var buffer = this.context.createBuffer(2, this.length * 48000, 48000);
			buffer.copyToChannel(lBuffer, 0);
			buffer.copyToChannel(rBuffer, 1);

			var osc = new AudioBufferSourceNode(this.context, {
				buffer: buffer,
				loop: true,
				loopStart: 0,
				loopEnd: 2
			});

			osc.connect(this.output);
			this.partials.push(osc);
		}
	}, {
		key: "trigger",
		value: function trigger(velocity) {
			var _this = this;

			this.partials.forEach(function (osc) {
				return osc.start(_this.context.currentTime);
			});
			this.start(this.context.currentTime);
			console.log("Trigger", this);
		}
	}, {
		key: "off",
		value: function off() {
			return this.stop(this.context.currentTime);
		}
	}, {
		key: "start",
		value: function start(time) {
			this.output.gain.value = 1;
			this.output.gain.setValueAtTime(0, time);
			return this.output.gain.setTargetAtTime(this.sustain, time + this.attack, this.decay + 0.001);
		}
	}, {
		key: "stop",
		value: function stop(time) {
			var _this2 = this;

			this.value = -1;
			this.output.gain.cancelScheduledValues(time);
			this.output.gain.setValueAtTime(this.output.gain.value, time);
			this.output.gain.setTargetAtTime(0, time, this.release);
			this.partials.forEach(function (osc) {
				osc.stop(time + _this2.release * 4);
			});
		}
	}, {
		key: "connect",
		value: function connect(destination) {
			this.output.connect(destination);
		}
	}, {
		key: "attack",
		set: function set(value) {
			this.ampEnvelope.a = value;
		},
		get: function get() {
			return this.ampEnvelope.a;
		}
	}, {
		key: "decay",
		set: function set(value) {
			this.ampEnvelope.d = value;
		},
		get: function get() {
			return this.ampEnvelope.d;
		}
	}, {
		key: "sustain",
		set: function set(value) {
			this.ampEnvelope.s = value;
		},
		get: function get() {
			return this.ampEnvelope.s;
		}
	}, {
		key: "release",
		set: function set(value) {
			this.ampEnvelope.r = value;
		},
		get: function get() {
			return this.ampEnvelope.r;
		}
	}]);

	return Noise;
}();

exports.default = Noise;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src\\Voices\\Noise.js","/src\\Voices")

},{"_process":5,"buffer":1}],13:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
"use strict";

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var PercussionVoice = function () {
	function PercussionVoice(context) {
		var type = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : "sawtooth";

		_classCallCheck(this, PercussionVoice);

		this.context = context;
		this.type = type;
		this.output = this.context.createGain();
		this.output.gain.value = 0;
		this.partials = [];
		this.value = -1;
		this.channelGain = 0.1;
		this.ampEnvelope = {
			a: 0,
			d: 0.1,
			s: this.channelGain,
			r: 0.5
		};
		this.voicePartials();
	}

	_createClass(PercussionVoice, [{
		key: "voicePartials",
		value: function voicePartials() {
			var osc = this.context.createOscillator();
			osc.type = this.type;
			osc.connect(this.output);
			osc.start(this.context.currentTime);
			this.partials.push(osc);
		}
	}, {
		key: "trigger",
		value: function trigger(velocity) {
			this.start(this.context.currentTime);
			console.log("Trigger", this);
		}
	}, {
		key: "off",
		value: function off() {
			return this.stop(this.context.currentTime);
		}
	}, {
		key: "start",
		value: function start(time) {
			this.output.gain.value = 1;
			this.output.gain.setValueAtTime(0, time);
			return this.output.gain.setTargetAtTime(this.sustain, time + this.attack, this.decay + 0.001);
		}
	}, {
		key: "stop",
		value: function stop(time) {
			var _this = this;

			this.value = -1;
			this.output.gain.cancelScheduledValues(time);
			this.output.gain.setValueAtTime(this.output.gain.value, time);
			this.output.gain.setTargetAtTime(0, time, this.release);
			this.partials.forEach(function (osc) {
				osc.stop(time + _this.release * 4);
			});
		}
	}, {
		key: "connect",
		value: function connect(destination) {
			this.output.connect(destination);
		}
	}, {
		key: "attack",
		set: function set(value) {
			this.ampEnvelope.a = value;
		},
		get: function get() {
			return this.ampEnvelope.a;
		}
	}, {
		key: "decay",
		set: function set(value) {
			this.ampEnvelope.d = value;
		},
		get: function get() {
			return this.ampEnvelope.d;
		}
	}, {
		key: "sustain",
		set: function set(value) {
			this.ampEnvelope.s = value;
		},
		get: function get() {
			return this.ampEnvelope.s;
		}
	}, {
		key: "release",
		set: function set(value) {
			this.ampEnvelope.r = value;
		},
		get: function get() {
			return this.ampEnvelope.r;
		}
	}]);

	return PercussionVoice;
}();

exports.default = PercussionVoice;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src\\Voices\\PercussionVoice.js","/src\\Voices")

},{"_process":5,"buffer":1}],14:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
"use strict";

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _AmpEnvelope = require("../Components/AmpEnvelope");

var _AmpEnvelope2 = _interopRequireDefault(_AmpEnvelope);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Voice = function () {
	function Voice(context) {
		var type = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : "sawtooth";

		_classCallCheck(this, Voice);

		this.context = context;
		this.type = type;
		this.value = -1;
		this.gain = 0.1;
		this.output = this.context.createGain();
		this.partials = [];
		this.output.gain.value = this.gain;
		this.ampEnvelope = new _AmpEnvelope2.default(this.context);
		this.ampEnvelope.connect(this.output);
		this.voicePartials();
	}

	_createClass(Voice, [{
		key: "voicePartials",
		value: function voicePartials() {
			var osc = this.context.createOscillator();
			osc.type = this.type;
			osc.connect(this.ampEnvelope.output);
			osc.start(this.context.currentTime);
			this.partials.push(osc);
		}
	}, {
		key: "on",
		value: function on(MidiEvent) {
			this.value = MidiEvent.value;
			this.partials.forEach(function (osc) {
				osc.frequency.value = MidiEvent.frequency;
			});
			this.ampEnvelope.on(MidiEvent.velocity);
		}
	}, {
		key: "off",
		value: function off(MidiEvent) {
			var _this = this;

			this.ampEnvelope.off(MidiEvent);
			this.partials.forEach(function (osc) {
				osc.stop(_this.context.currentTime + _this.ampEnvelope.release * 4);
			});
		}
	}, {
		key: "connect",
		value: function connect(destination) {
			this.output.connect(destination);
		}
	}]);

	return Voice;
}();

exports.default = Voice;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src\\Voices\\Voice.js","/src\\Voices")

},{"../Components/AmpEnvelope":7,"_process":5,"buffer":1}]},{},[10])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnVmZmVyL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2J1ZmZlci9ub2RlX21vZHVsZXMvYmFzZTY0LWpzL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2J1ZmZlci9ub2RlX21vZHVsZXMvaWVlZTc1NC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9idWZmZXIvbm9kZV9tb2R1bGVzL2lzYXJyYXkvaW5kZXguanMiLCJub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIiwibm9kZV9tb2R1bGVzL21penp5L2Rpc3QvbWl6enkuY2pzLmpzIiwic3JjXFxDb21wb25lbnRzXFxzcmNcXENvbXBvbmVudHNcXEFtcEVudmVsb3BlLmpzIiwic3JjXFxFZmZlY3RzXFxzcmNcXEVmZmVjdHNcXEZpbHRlci5qcyIsInNyY1xcRWZmZWN0c1xcc3JjXFxFZmZlY3RzXFxSZXZlcmIuanMiLCJzcmNcXHNyY1xcTWFpbi5qcyIsInNyY1xcc3JjXFxNaXp6eURldmljZS5qcyIsInNyY1xcVm9pY2VzXFxzcmNcXFZvaWNlc1xcTm9pc2UuanMiLCJzcmNcXFZvaWNlc1xcc3JjXFxWb2ljZXNcXFBlcmN1c3Npb25Wb2ljZS5qcyIsInNyY1xcVm9pY2VzXFxzcmNcXFZvaWNlc1xcVm9pY2UuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUM3dkRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ2xIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUNwRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ3BMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtB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SSxPQUFKLENBQVksS0FBSyxXQUFMLENBQWlCLE1BQTdCO0FBQ0EsT0FBSSxLQUFKLENBQVUsS0FBSyxPQUFMLENBQWEsV0FBdkI7QUFDRCxRQUFLLFFBQUwsQ0FBYyxJQUFkLENBQW1CLEdBQW5CO0FBQ0E7OztxQkFFRSxTLEVBQVc7QUFDYixRQUFLLEtBQUwsR0FBYSxVQUFVLEtBQXZCO0FBQ0EsUUFBSyxRQUFMLENBQWMsT0FBZCxDQUFzQixVQUFDLEdBQUQsRUFBUztBQUM5QixRQUFJLFNBQUosQ0FBYyxLQUFkLEdBQXNCLFVBQVUsU0FBaEM7QUFDQSxJQUZEO0FBR0EsUUFBSyxXQUFMLENBQWlCLEVBQWpCLENBQW9CLFVBQVUsUUFBOUI7QUFDQTs7O3NCQUVHLFMsRUFBVztBQUFBOztBQUNkLFFBQUssV0FBTCxDQUFpQixHQUFqQixDQUFxQixTQUFyQjtBQUNBLFFBQUssUUFBTCxDQUFjLE9BQWQsQ0FBc0IsVUFBQyxHQUFELEVBQVM7QUFDOUIsUUFBSSxJQUFKLENBQVMsTUFBSyxPQUFMLENBQWEsV0FBYixHQUEyQixNQUFLLFdBQUwsQ0FBaUIsT0FBakIsR0FBMkIsQ0FBL0Q7QUFDQSxJQUZEO0FBR0E7OzswQkFFTyxXLEVBQWE7QUFDcEIsUUFBSyxNQUFMLENBQVksT0FBWixDQUFvQixXQUFwQjtBQUNBOzs7Ozs7a0JBdkNtQixLIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8qIVxuICogVGhlIGJ1ZmZlciBtb2R1bGUgZnJvbSBub2RlLmpzLCBmb3IgdGhlIGJyb3dzZXIuXG4gKlxuICogQGF1dGhvciAgIEZlcm9zcyBBYm91a2hhZGlqZWggPGZlcm9zc0BmZXJvc3Mub3JnPiA8aHR0cDovL2Zlcm9zcy5vcmc+XG4gKiBAbGljZW5zZSAgTUlUXG4gKi9cbi8qIGVzbGludC1kaXNhYmxlIG5vLXByb3RvICovXG5cbid1c2Ugc3RyaWN0J1xuXG52YXIgYmFzZTY0ID0gcmVxdWlyZSgnYmFzZTY0LWpzJylcbnZhciBpZWVlNzU0ID0gcmVxdWlyZSgnaWVlZTc1NCcpXG52YXIgaXNBcnJheSA9IHJlcXVpcmUoJ2lzYXJyYXknKVxuXG5leHBvcnRzLkJ1ZmZlciA9IEJ1ZmZlclxuZXhwb3J0cy5TbG93QnVmZmVyID0gU2xvd0J1ZmZlclxuZXhwb3J0cy5JTlNQRUNUX01BWF9CWVRFUyA9IDUwXG5cbi8qKlxuICogSWYgYEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUYDpcbiAqICAgPT09IHRydWUgICAgVXNlIFVpbnQ4QXJyYXkgaW1wbGVtZW50YXRpb24gKGZhc3Rlc3QpXG4gKiAgID09PSBmYWxzZSAgIFVzZSBPYmplY3QgaW1wbGVtZW50YXRpb24gKG1vc3QgY29tcGF0aWJsZSwgZXZlbiBJRTYpXG4gKlxuICogQnJvd3NlcnMgdGhhdCBzdXBwb3J0IHR5cGVkIGFycmF5cyBhcmUgSUUgMTArLCBGaXJlZm94IDQrLCBDaHJvbWUgNyssIFNhZmFyaSA1LjErLFxuICogT3BlcmEgMTEuNissIGlPUyA0LjIrLlxuICpcbiAqIER1ZSB0byB2YXJpb3VzIGJyb3dzZXIgYnVncywgc29tZXRpbWVzIHRoZSBPYmplY3QgaW1wbGVtZW50YXRpb24gd2lsbCBiZSB1c2VkIGV2ZW5cbiAqIHdoZW4gdGhlIGJyb3dzZXIgc3VwcG9ydHMgdHlwZWQgYXJyYXlzLlxuICpcbiAqIE5vdGU6XG4gKlxuICogICAtIEZpcmVmb3ggNC0yOSBsYWNrcyBzdXBwb3J0IGZvciBhZGRpbmcgbmV3IHByb3BlcnRpZXMgdG8gYFVpbnQ4QXJyYXlgIGluc3RhbmNlcyxcbiAqICAgICBTZWU6IGh0dHBzOi8vYnVnemlsbGEubW96aWxsYS5vcmcvc2hvd19idWcuY2dpP2lkPTY5NTQzOC5cbiAqXG4gKiAgIC0gQ2hyb21lIDktMTAgaXMgbWlzc2luZyB0aGUgYFR5cGVkQXJyYXkucHJvdG90eXBlLnN1YmFycmF5YCBmdW5jdGlvbi5cbiAqXG4gKiAgIC0gSUUxMCBoYXMgYSBicm9rZW4gYFR5cGVkQXJyYXkucHJvdG90eXBlLnN1YmFycmF5YCBmdW5jdGlvbiB3aGljaCByZXR1cm5zIGFycmF5cyBvZlxuICogICAgIGluY29ycmVjdCBsZW5ndGggaW4gc29tZSBzaXR1YXRpb25zLlxuXG4gKiBXZSBkZXRlY3QgdGhlc2UgYnVnZ3kgYnJvd3NlcnMgYW5kIHNldCBgQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlRgIHRvIGBmYWxzZWAgc28gdGhleVxuICogZ2V0IHRoZSBPYmplY3QgaW1wbGVtZW50YXRpb24sIHdoaWNoIGlzIHNsb3dlciBidXQgYmVoYXZlcyBjb3JyZWN0bHkuXG4gKi9cbkJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUID0gZ2xvYmFsLlRZUEVEX0FSUkFZX1NVUFBPUlQgIT09IHVuZGVmaW5lZFxuICA/IGdsb2JhbC5UWVBFRF9BUlJBWV9TVVBQT1JUXG4gIDogdHlwZWRBcnJheVN1cHBvcnQoKVxuXG4vKlxuICogRXhwb3J0IGtNYXhMZW5ndGggYWZ0ZXIgdHlwZWQgYXJyYXkgc3VwcG9ydCBpcyBkZXRlcm1pbmVkLlxuICovXG5leHBvcnRzLmtNYXhMZW5ndGggPSBrTWF4TGVuZ3RoKClcblxuZnVuY3Rpb24gdHlwZWRBcnJheVN1cHBvcnQgKCkge1xuICB0cnkge1xuICAgIHZhciBhcnIgPSBuZXcgVWludDhBcnJheSgxKVxuICAgIGFyci5fX3Byb3RvX18gPSB7X19wcm90b19fOiBVaW50OEFycmF5LnByb3RvdHlwZSwgZm9vOiBmdW5jdGlvbiAoKSB7IHJldHVybiA0MiB9fVxuICAgIHJldHVybiBhcnIuZm9vKCkgPT09IDQyICYmIC8vIHR5cGVkIGFycmF5IGluc3RhbmNlcyBjYW4gYmUgYXVnbWVudGVkXG4gICAgICAgIHR5cGVvZiBhcnIuc3ViYXJyYXkgPT09ICdmdW5jdGlvbicgJiYgLy8gY2hyb21lIDktMTAgbGFjayBgc3ViYXJyYXlgXG4gICAgICAgIGFyci5zdWJhcnJheSgxLCAxKS5ieXRlTGVuZ3RoID09PSAwIC8vIGllMTAgaGFzIGJyb2tlbiBgc3ViYXJyYXlgXG4gIH0gY2F0Y2ggKGUpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfVxufVxuXG5mdW5jdGlvbiBrTWF4TGVuZ3RoICgpIHtcbiAgcmV0dXJuIEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUXG4gICAgPyAweDdmZmZmZmZmXG4gICAgOiAweDNmZmZmZmZmXG59XG5cbmZ1bmN0aW9uIGNyZWF0ZUJ1ZmZlciAodGhhdCwgbGVuZ3RoKSB7XG4gIGlmIChrTWF4TGVuZ3RoKCkgPCBsZW5ndGgpIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignSW52YWxpZCB0eXBlZCBhcnJheSBsZW5ndGgnKVxuICB9XG4gIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIC8vIFJldHVybiBhbiBhdWdtZW50ZWQgYFVpbnQ4QXJyYXlgIGluc3RhbmNlLCBmb3IgYmVzdCBwZXJmb3JtYW5jZVxuICAgIHRoYXQgPSBuZXcgVWludDhBcnJheShsZW5ndGgpXG4gICAgdGhhdC5fX3Byb3RvX18gPSBCdWZmZXIucHJvdG90eXBlXG4gIH0gZWxzZSB7XG4gICAgLy8gRmFsbGJhY2s6IFJldHVybiBhbiBvYmplY3QgaW5zdGFuY2Ugb2YgdGhlIEJ1ZmZlciBjbGFzc1xuICAgIGlmICh0aGF0ID09PSBudWxsKSB7XG4gICAgICB0aGF0ID0gbmV3IEJ1ZmZlcihsZW5ndGgpXG4gICAgfVxuICAgIHRoYXQubGVuZ3RoID0gbGVuZ3RoXG4gIH1cblxuICByZXR1cm4gdGhhdFxufVxuXG4vKipcbiAqIFRoZSBCdWZmZXIgY29uc3RydWN0b3IgcmV0dXJucyBpbnN0YW5jZXMgb2YgYFVpbnQ4QXJyYXlgIHRoYXQgaGF2ZSB0aGVpclxuICogcHJvdG90eXBlIGNoYW5nZWQgdG8gYEJ1ZmZlci5wcm90b3R5cGVgLiBGdXJ0aGVybW9yZSwgYEJ1ZmZlcmAgaXMgYSBzdWJjbGFzcyBvZlxuICogYFVpbnQ4QXJyYXlgLCBzbyB0aGUgcmV0dXJuZWQgaW5zdGFuY2VzIHdpbGwgaGF2ZSBhbGwgdGhlIG5vZGUgYEJ1ZmZlcmAgbWV0aG9kc1xuICogYW5kIHRoZSBgVWludDhBcnJheWAgbWV0aG9kcy4gU3F1YXJlIGJyYWNrZXQgbm90YXRpb24gd29ya3MgYXMgZXhwZWN0ZWQgLS0gaXRcbiAqIHJldHVybnMgYSBzaW5nbGUgb2N0ZXQuXG4gKlxuICogVGhlIGBVaW50OEFycmF5YCBwcm90b3R5cGUgcmVtYWlucyB1bm1vZGlmaWVkLlxuICovXG5cbmZ1bmN0aW9uIEJ1ZmZlciAoYXJnLCBlbmNvZGluZ09yT2Zmc2V0LCBsZW5ndGgpIHtcbiAgaWYgKCFCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCAmJiAhKHRoaXMgaW5zdGFuY2VvZiBCdWZmZXIpKSB7XG4gICAgcmV0dXJuIG5ldyBCdWZmZXIoYXJnLCBlbmNvZGluZ09yT2Zmc2V0LCBsZW5ndGgpXG4gIH1cblxuICAvLyBDb21tb24gY2FzZS5cbiAgaWYgKHR5cGVvZiBhcmcgPT09ICdudW1iZXInKSB7XG4gICAgaWYgKHR5cGVvZiBlbmNvZGluZ09yT2Zmc2V0ID09PSAnc3RyaW5nJykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAnSWYgZW5jb2RpbmcgaXMgc3BlY2lmaWVkIHRoZW4gdGhlIGZpcnN0IGFyZ3VtZW50IG11c3QgYmUgYSBzdHJpbmcnXG4gICAgICApXG4gICAgfVxuICAgIHJldHVybiBhbGxvY1Vuc2FmZSh0aGlzLCBhcmcpXG4gIH1cbiAgcmV0dXJuIGZyb20odGhpcywgYXJnLCBlbmNvZGluZ09yT2Zmc2V0LCBsZW5ndGgpXG59XG5cbkJ1ZmZlci5wb29sU2l6ZSA9IDgxOTIgLy8gbm90IHVzZWQgYnkgdGhpcyBpbXBsZW1lbnRhdGlvblxuXG4vLyBUT0RPOiBMZWdhY3ksIG5vdCBuZWVkZWQgYW55bW9yZS4gUmVtb3ZlIGluIG5leHQgbWFqb3IgdmVyc2lvbi5cbkJ1ZmZlci5fYXVnbWVudCA9IGZ1bmN0aW9uIChhcnIpIHtcbiAgYXJyLl9fcHJvdG9fXyA9IEJ1ZmZlci5wcm90b3R5cGVcbiAgcmV0dXJuIGFyclxufVxuXG5mdW5jdGlvbiBmcm9tICh0aGF0LCB2YWx1ZSwgZW5jb2RpbmdPck9mZnNldCwgbGVuZ3RoKSB7XG4gIGlmICh0eXBlb2YgdmFsdWUgPT09ICdudW1iZXInKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignXCJ2YWx1ZVwiIGFyZ3VtZW50IG11c3Qgbm90IGJlIGEgbnVtYmVyJylcbiAgfVxuXG4gIGlmICh0eXBlb2YgQXJyYXlCdWZmZXIgIT09ICd1bmRlZmluZWQnICYmIHZhbHVlIGluc3RhbmNlb2YgQXJyYXlCdWZmZXIpIHtcbiAgICByZXR1cm4gZnJvbUFycmF5QnVmZmVyKHRoYXQsIHZhbHVlLCBlbmNvZGluZ09yT2Zmc2V0LCBsZW5ndGgpXG4gIH1cblxuICBpZiAodHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJykge1xuICAgIHJldHVybiBmcm9tU3RyaW5nKHRoYXQsIHZhbHVlLCBlbmNvZGluZ09yT2Zmc2V0KVxuICB9XG5cbiAgcmV0dXJuIGZyb21PYmplY3QodGhhdCwgdmFsdWUpXG59XG5cbi8qKlxuICogRnVuY3Rpb25hbGx5IGVxdWl2YWxlbnQgdG8gQnVmZmVyKGFyZywgZW5jb2RpbmcpIGJ1dCB0aHJvd3MgYSBUeXBlRXJyb3JcbiAqIGlmIHZhbHVlIGlzIGEgbnVtYmVyLlxuICogQnVmZmVyLmZyb20oc3RyWywgZW5jb2RpbmddKVxuICogQnVmZmVyLmZyb20oYXJyYXkpXG4gKiBCdWZmZXIuZnJvbShidWZmZXIpXG4gKiBCdWZmZXIuZnJvbShhcnJheUJ1ZmZlclssIGJ5dGVPZmZzZXRbLCBsZW5ndGhdXSlcbiAqKi9cbkJ1ZmZlci5mcm9tID0gZnVuY3Rpb24gKHZhbHVlLCBlbmNvZGluZ09yT2Zmc2V0LCBsZW5ndGgpIHtcbiAgcmV0dXJuIGZyb20obnVsbCwgdmFsdWUsIGVuY29kaW5nT3JPZmZzZXQsIGxlbmd0aClcbn1cblxuaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gIEJ1ZmZlci5wcm90b3R5cGUuX19wcm90b19fID0gVWludDhBcnJheS5wcm90b3R5cGVcbiAgQnVmZmVyLl9fcHJvdG9fXyA9IFVpbnQ4QXJyYXlcbiAgaWYgKHR5cGVvZiBTeW1ib2wgIT09ICd1bmRlZmluZWQnICYmIFN5bWJvbC5zcGVjaWVzICYmXG4gICAgICBCdWZmZXJbU3ltYm9sLnNwZWNpZXNdID09PSBCdWZmZXIpIHtcbiAgICAvLyBGaXggc3ViYXJyYXkoKSBpbiBFUzIwMTYuIFNlZTogaHR0cHM6Ly9naXRodWIuY29tL2Zlcm9zcy9idWZmZXIvcHVsbC85N1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShCdWZmZXIsIFN5bWJvbC5zcGVjaWVzLCB7XG4gICAgICB2YWx1ZTogbnVsbCxcbiAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICAgIH0pXG4gIH1cbn1cblxuZnVuY3Rpb24gYXNzZXJ0U2l6ZSAoc2l6ZSkge1xuICBpZiAodHlwZW9mIHNpemUgIT09ICdudW1iZXInKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignXCJzaXplXCIgYXJndW1lbnQgbXVzdCBiZSBhIG51bWJlcicpXG4gIH0gZWxzZSBpZiAoc2l6ZSA8IDApIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignXCJzaXplXCIgYXJndW1lbnQgbXVzdCBub3QgYmUgbmVnYXRpdmUnKVxuICB9XG59XG5cbmZ1bmN0aW9uIGFsbG9jICh0aGF0LCBzaXplLCBmaWxsLCBlbmNvZGluZykge1xuICBhc3NlcnRTaXplKHNpemUpXG4gIGlmIChzaXplIDw9IDApIHtcbiAgICByZXR1cm4gY3JlYXRlQnVmZmVyKHRoYXQsIHNpemUpXG4gIH1cbiAgaWYgKGZpbGwgIT09IHVuZGVmaW5lZCkge1xuICAgIC8vIE9ubHkgcGF5IGF0dGVudGlvbiB0byBlbmNvZGluZyBpZiBpdCdzIGEgc3RyaW5nLiBUaGlzXG4gICAgLy8gcHJldmVudHMgYWNjaWRlbnRhbGx5IHNlbmRpbmcgaW4gYSBudW1iZXIgdGhhdCB3b3VsZFxuICAgIC8vIGJlIGludGVycHJldHRlZCBhcyBhIHN0YXJ0IG9mZnNldC5cbiAgICByZXR1cm4gdHlwZW9mIGVuY29kaW5nID09PSAnc3RyaW5nJ1xuICAgICAgPyBjcmVhdGVCdWZmZXIodGhhdCwgc2l6ZSkuZmlsbChmaWxsLCBlbmNvZGluZylcbiAgICAgIDogY3JlYXRlQnVmZmVyKHRoYXQsIHNpemUpLmZpbGwoZmlsbClcbiAgfVxuICByZXR1cm4gY3JlYXRlQnVmZmVyKHRoYXQsIHNpemUpXG59XG5cbi8qKlxuICogQ3JlYXRlcyBhIG5ldyBmaWxsZWQgQnVmZmVyIGluc3RhbmNlLlxuICogYWxsb2Moc2l6ZVssIGZpbGxbLCBlbmNvZGluZ11dKVxuICoqL1xuQnVmZmVyLmFsbG9jID0gZnVuY3Rpb24gKHNpemUsIGZpbGwsIGVuY29kaW5nKSB7XG4gIHJldHVybiBhbGxvYyhudWxsLCBzaXplLCBmaWxsLCBlbmNvZGluZylcbn1cblxuZnVuY3Rpb24gYWxsb2NVbnNhZmUgKHRoYXQsIHNpemUpIHtcbiAgYXNzZXJ0U2l6ZShzaXplKVxuICB0aGF0ID0gY3JlYXRlQnVmZmVyKHRoYXQsIHNpemUgPCAwID8gMCA6IGNoZWNrZWQoc2l6ZSkgfCAwKVxuICBpZiAoIUJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzaXplOyArK2kpIHtcbiAgICAgIHRoYXRbaV0gPSAwXG4gICAgfVxuICB9XG4gIHJldHVybiB0aGF0XG59XG5cbi8qKlxuICogRXF1aXZhbGVudCB0byBCdWZmZXIobnVtKSwgYnkgZGVmYXVsdCBjcmVhdGVzIGEgbm9uLXplcm8tZmlsbGVkIEJ1ZmZlciBpbnN0YW5jZS5cbiAqICovXG5CdWZmZXIuYWxsb2NVbnNhZmUgPSBmdW5jdGlvbiAoc2l6ZSkge1xuICByZXR1cm4gYWxsb2NVbnNhZmUobnVsbCwgc2l6ZSlcbn1cbi8qKlxuICogRXF1aXZhbGVudCB0byBTbG93QnVmZmVyKG51bSksIGJ5IGRlZmF1bHQgY3JlYXRlcyBhIG5vbi16ZXJvLWZpbGxlZCBCdWZmZXIgaW5zdGFuY2UuXG4gKi9cbkJ1ZmZlci5hbGxvY1Vuc2FmZVNsb3cgPSBmdW5jdGlvbiAoc2l6ZSkge1xuICByZXR1cm4gYWxsb2NVbnNhZmUobnVsbCwgc2l6ZSlcbn1cblxuZnVuY3Rpb24gZnJvbVN0cmluZyAodGhhdCwgc3RyaW5nLCBlbmNvZGluZykge1xuICBpZiAodHlwZW9mIGVuY29kaW5nICE9PSAnc3RyaW5nJyB8fCBlbmNvZGluZyA9PT0gJycpIHtcbiAgICBlbmNvZGluZyA9ICd1dGY4J1xuICB9XG5cbiAgaWYgKCFCdWZmZXIuaXNFbmNvZGluZyhlbmNvZGluZykpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdcImVuY29kaW5nXCIgbXVzdCBiZSBhIHZhbGlkIHN0cmluZyBlbmNvZGluZycpXG4gIH1cblxuICB2YXIgbGVuZ3RoID0gYnl0ZUxlbmd0aChzdHJpbmcsIGVuY29kaW5nKSB8IDBcbiAgdGhhdCA9IGNyZWF0ZUJ1ZmZlcih0aGF0LCBsZW5ndGgpXG5cbiAgdmFyIGFjdHVhbCA9IHRoYXQud3JpdGUoc3RyaW5nLCBlbmNvZGluZylcblxuICBpZiAoYWN0dWFsICE9PSBsZW5ndGgpIHtcbiAgICAvLyBXcml0aW5nIGEgaGV4IHN0cmluZywgZm9yIGV4YW1wbGUsIHRoYXQgY29udGFpbnMgaW52YWxpZCBjaGFyYWN0ZXJzIHdpbGxcbiAgICAvLyBjYXVzZSBldmVyeXRoaW5nIGFmdGVyIHRoZSBmaXJzdCBpbnZhbGlkIGNoYXJhY3RlciB0byBiZSBpZ25vcmVkLiAoZS5nLlxuICAgIC8vICdhYnh4Y2QnIHdpbGwgYmUgdHJlYXRlZCBhcyAnYWInKVxuICAgIHRoYXQgPSB0aGF0LnNsaWNlKDAsIGFjdHVhbClcbiAgfVxuXG4gIHJldHVybiB0aGF0XG59XG5cbmZ1bmN0aW9uIGZyb21BcnJheUxpa2UgKHRoYXQsIGFycmF5KSB7XG4gIHZhciBsZW5ndGggPSBhcnJheS5sZW5ndGggPCAwID8gMCA6IGNoZWNrZWQoYXJyYXkubGVuZ3RoKSB8IDBcbiAgdGhhdCA9IGNyZWF0ZUJ1ZmZlcih0aGF0LCBsZW5ndGgpXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpICs9IDEpIHtcbiAgICB0aGF0W2ldID0gYXJyYXlbaV0gJiAyNTVcbiAgfVxuICByZXR1cm4gdGhhdFxufVxuXG5mdW5jdGlvbiBmcm9tQXJyYXlCdWZmZXIgKHRoYXQsIGFycmF5LCBieXRlT2Zmc2V0LCBsZW5ndGgpIHtcbiAgYXJyYXkuYnl0ZUxlbmd0aCAvLyB0aGlzIHRocm93cyBpZiBgYXJyYXlgIGlzIG5vdCBhIHZhbGlkIEFycmF5QnVmZmVyXG5cbiAgaWYgKGJ5dGVPZmZzZXQgPCAwIHx8IGFycmF5LmJ5dGVMZW5ndGggPCBieXRlT2Zmc2V0KSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ1xcJ29mZnNldFxcJyBpcyBvdXQgb2YgYm91bmRzJylcbiAgfVxuXG4gIGlmIChhcnJheS5ieXRlTGVuZ3RoIDwgYnl0ZU9mZnNldCArIChsZW5ndGggfHwgMCkpIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignXFwnbGVuZ3RoXFwnIGlzIG91dCBvZiBib3VuZHMnKVxuICB9XG5cbiAgaWYgKGJ5dGVPZmZzZXQgPT09IHVuZGVmaW5lZCAmJiBsZW5ndGggPT09IHVuZGVmaW5lZCkge1xuICAgIGFycmF5ID0gbmV3IFVpbnQ4QXJyYXkoYXJyYXkpXG4gIH0gZWxzZSBpZiAobGVuZ3RoID09PSB1bmRlZmluZWQpIHtcbiAgICBhcnJheSA9IG5ldyBVaW50OEFycmF5KGFycmF5LCBieXRlT2Zmc2V0KVxuICB9IGVsc2Uge1xuICAgIGFycmF5ID0gbmV3IFVpbnQ4QXJyYXkoYXJyYXksIGJ5dGVPZmZzZXQsIGxlbmd0aClcbiAgfVxuXG4gIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIC8vIFJldHVybiBhbiBhdWdtZW50ZWQgYFVpbnQ4QXJyYXlgIGluc3RhbmNlLCBmb3IgYmVzdCBwZXJmb3JtYW5jZVxuICAgIHRoYXQgPSBhcnJheVxuICAgIHRoYXQuX19wcm90b19fID0gQnVmZmVyLnByb3RvdHlwZVxuICB9IGVsc2Uge1xuICAgIC8vIEZhbGxiYWNrOiBSZXR1cm4gYW4gb2JqZWN0IGluc3RhbmNlIG9mIHRoZSBCdWZmZXIgY2xhc3NcbiAgICB0aGF0ID0gZnJvbUFycmF5TGlrZSh0aGF0LCBhcnJheSlcbiAgfVxuICByZXR1cm4gdGhhdFxufVxuXG5mdW5jdGlvbiBmcm9tT2JqZWN0ICh0aGF0LCBvYmopIHtcbiAgaWYgKEJ1ZmZlci5pc0J1ZmZlcihvYmopKSB7XG4gICAgdmFyIGxlbiA9IGNoZWNrZWQob2JqLmxlbmd0aCkgfCAwXG4gICAgdGhhdCA9IGNyZWF0ZUJ1ZmZlcih0aGF0LCBsZW4pXG5cbiAgICBpZiAodGhhdC5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiB0aGF0XG4gICAgfVxuXG4gICAgb2JqLmNvcHkodGhhdCwgMCwgMCwgbGVuKVxuICAgIHJldHVybiB0aGF0XG4gIH1cblxuICBpZiAob2JqKSB7XG4gICAgaWYgKCh0eXBlb2YgQXJyYXlCdWZmZXIgIT09ICd1bmRlZmluZWQnICYmXG4gICAgICAgIG9iai5idWZmZXIgaW5zdGFuY2VvZiBBcnJheUJ1ZmZlcikgfHwgJ2xlbmd0aCcgaW4gb2JqKSB7XG4gICAgICBpZiAodHlwZW9mIG9iai5sZW5ndGggIT09ICdudW1iZXInIHx8IGlzbmFuKG9iai5sZW5ndGgpKSB7XG4gICAgICAgIHJldHVybiBjcmVhdGVCdWZmZXIodGhhdCwgMClcbiAgICAgIH1cbiAgICAgIHJldHVybiBmcm9tQXJyYXlMaWtlKHRoYXQsIG9iailcbiAgICB9XG5cbiAgICBpZiAob2JqLnR5cGUgPT09ICdCdWZmZXInICYmIGlzQXJyYXkob2JqLmRhdGEpKSB7XG4gICAgICByZXR1cm4gZnJvbUFycmF5TGlrZSh0aGF0LCBvYmouZGF0YSlcbiAgICB9XG4gIH1cblxuICB0aHJvdyBuZXcgVHlwZUVycm9yKCdGaXJzdCBhcmd1bWVudCBtdXN0IGJlIGEgc3RyaW5nLCBCdWZmZXIsIEFycmF5QnVmZmVyLCBBcnJheSwgb3IgYXJyYXktbGlrZSBvYmplY3QuJylcbn1cblxuZnVuY3Rpb24gY2hlY2tlZCAobGVuZ3RoKSB7XG4gIC8vIE5vdGU6IGNhbm5vdCB1c2UgYGxlbmd0aCA8IGtNYXhMZW5ndGgoKWAgaGVyZSBiZWNhdXNlIHRoYXQgZmFpbHMgd2hlblxuICAvLyBsZW5ndGggaXMgTmFOICh3aGljaCBpcyBvdGhlcndpc2UgY29lcmNlZCB0byB6ZXJvLilcbiAgaWYgKGxlbmd0aCA+PSBrTWF4TGVuZ3RoKCkpIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignQXR0ZW1wdCB0byBhbGxvY2F0ZSBCdWZmZXIgbGFyZ2VyIHRoYW4gbWF4aW11bSAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAnc2l6ZTogMHgnICsga01heExlbmd0aCgpLnRvU3RyaW5nKDE2KSArICcgYnl0ZXMnKVxuICB9XG4gIHJldHVybiBsZW5ndGggfCAwXG59XG5cbmZ1bmN0aW9uIFNsb3dCdWZmZXIgKGxlbmd0aCkge1xuICBpZiAoK2xlbmd0aCAhPSBsZW5ndGgpIHsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBlcWVxZXFcbiAgICBsZW5ndGggPSAwXG4gIH1cbiAgcmV0dXJuIEJ1ZmZlci5hbGxvYygrbGVuZ3RoKVxufVxuXG5CdWZmZXIuaXNCdWZmZXIgPSBmdW5jdGlvbiBpc0J1ZmZlciAoYikge1xuICByZXR1cm4gISEoYiAhPSBudWxsICYmIGIuX2lzQnVmZmVyKVxufVxuXG5CdWZmZXIuY29tcGFyZSA9IGZ1bmN0aW9uIGNvbXBhcmUgKGEsIGIpIHtcbiAgaWYgKCFCdWZmZXIuaXNCdWZmZXIoYSkgfHwgIUJ1ZmZlci5pc0J1ZmZlcihiKSkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0FyZ3VtZW50cyBtdXN0IGJlIEJ1ZmZlcnMnKVxuICB9XG5cbiAgaWYgKGEgPT09IGIpIHJldHVybiAwXG5cbiAgdmFyIHggPSBhLmxlbmd0aFxuICB2YXIgeSA9IGIubGVuZ3RoXG5cbiAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IE1hdGgubWluKHgsIHkpOyBpIDwgbGVuOyArK2kpIHtcbiAgICBpZiAoYVtpXSAhPT0gYltpXSkge1xuICAgICAgeCA9IGFbaV1cbiAgICAgIHkgPSBiW2ldXG4gICAgICBicmVha1xuICAgIH1cbiAgfVxuXG4gIGlmICh4IDwgeSkgcmV0dXJuIC0xXG4gIGlmICh5IDwgeCkgcmV0dXJuIDFcbiAgcmV0dXJuIDBcbn1cblxuQnVmZmVyLmlzRW5jb2RpbmcgPSBmdW5jdGlvbiBpc0VuY29kaW5nIChlbmNvZGluZykge1xuICBzd2l0Y2ggKFN0cmluZyhlbmNvZGluZykudG9Mb3dlckNhc2UoKSkge1xuICAgIGNhc2UgJ2hleCc6XG4gICAgY2FzZSAndXRmOCc6XG4gICAgY2FzZSAndXRmLTgnOlxuICAgIGNhc2UgJ2FzY2lpJzpcbiAgICBjYXNlICdsYXRpbjEnOlxuICAgIGNhc2UgJ2JpbmFyeSc6XG4gICAgY2FzZSAnYmFzZTY0JzpcbiAgICBjYXNlICd1Y3MyJzpcbiAgICBjYXNlICd1Y3MtMic6XG4gICAgY2FzZSAndXRmMTZsZSc6XG4gICAgY2FzZSAndXRmLTE2bGUnOlxuICAgICAgcmV0dXJuIHRydWVcbiAgICBkZWZhdWx0OlxuICAgICAgcmV0dXJuIGZhbHNlXG4gIH1cbn1cblxuQnVmZmVyLmNvbmNhdCA9IGZ1bmN0aW9uIGNvbmNhdCAobGlzdCwgbGVuZ3RoKSB7XG4gIGlmICghaXNBcnJheShsaXN0KSkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1wibGlzdFwiIGFyZ3VtZW50IG11c3QgYmUgYW4gQXJyYXkgb2YgQnVmZmVycycpXG4gIH1cblxuICBpZiAobGlzdC5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gQnVmZmVyLmFsbG9jKDApXG4gIH1cblxuICB2YXIgaVxuICBpZiAobGVuZ3RoID09PSB1bmRlZmluZWQpIHtcbiAgICBsZW5ndGggPSAwXG4gICAgZm9yIChpID0gMDsgaSA8IGxpc3QubGVuZ3RoOyArK2kpIHtcbiAgICAgIGxlbmd0aCArPSBsaXN0W2ldLmxlbmd0aFxuICAgIH1cbiAgfVxuXG4gIHZhciBidWZmZXIgPSBCdWZmZXIuYWxsb2NVbnNhZmUobGVuZ3RoKVxuICB2YXIgcG9zID0gMFxuICBmb3IgKGkgPSAwOyBpIDwgbGlzdC5sZW5ndGg7ICsraSkge1xuICAgIHZhciBidWYgPSBsaXN0W2ldXG4gICAgaWYgKCFCdWZmZXIuaXNCdWZmZXIoYnVmKSkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignXCJsaXN0XCIgYXJndW1lbnQgbXVzdCBiZSBhbiBBcnJheSBvZiBCdWZmZXJzJylcbiAgICB9XG4gICAgYnVmLmNvcHkoYnVmZmVyLCBwb3MpXG4gICAgcG9zICs9IGJ1Zi5sZW5ndGhcbiAgfVxuICByZXR1cm4gYnVmZmVyXG59XG5cbmZ1bmN0aW9uIGJ5dGVMZW5ndGggKHN0cmluZywgZW5jb2RpbmcpIHtcbiAgaWYgKEJ1ZmZlci5pc0J1ZmZlcihzdHJpbmcpKSB7XG4gICAgcmV0dXJuIHN0cmluZy5sZW5ndGhcbiAgfVxuICBpZiAodHlwZW9mIEFycmF5QnVmZmVyICE9PSAndW5kZWZpbmVkJyAmJiB0eXBlb2YgQXJyYXlCdWZmZXIuaXNWaWV3ID09PSAnZnVuY3Rpb24nICYmXG4gICAgICAoQXJyYXlCdWZmZXIuaXNWaWV3KHN0cmluZykgfHwgc3RyaW5nIGluc3RhbmNlb2YgQXJyYXlCdWZmZXIpKSB7XG4gICAgcmV0dXJuIHN0cmluZy5ieXRlTGVuZ3RoXG4gIH1cbiAgaWYgKHR5cGVvZiBzdHJpbmcgIT09ICdzdHJpbmcnKSB7XG4gICAgc3RyaW5nID0gJycgKyBzdHJpbmdcbiAgfVxuXG4gIHZhciBsZW4gPSBzdHJpbmcubGVuZ3RoXG4gIGlmIChsZW4gPT09IDApIHJldHVybiAwXG5cbiAgLy8gVXNlIGEgZm9yIGxvb3AgdG8gYXZvaWQgcmVjdXJzaW9uXG4gIHZhciBsb3dlcmVkQ2FzZSA9IGZhbHNlXG4gIGZvciAoOzspIHtcbiAgICBzd2l0Y2ggKGVuY29kaW5nKSB7XG4gICAgICBjYXNlICdhc2NpaSc6XG4gICAgICBjYXNlICdsYXRpbjEnOlxuICAgICAgY2FzZSAnYmluYXJ5JzpcbiAgICAgICAgcmV0dXJuIGxlblxuICAgICAgY2FzZSAndXRmOCc6XG4gICAgICBjYXNlICd1dGYtOCc6XG4gICAgICBjYXNlIHVuZGVmaW5lZDpcbiAgICAgICAgcmV0dXJuIHV0ZjhUb0J5dGVzKHN0cmluZykubGVuZ3RoXG4gICAgICBjYXNlICd1Y3MyJzpcbiAgICAgIGNhc2UgJ3Vjcy0yJzpcbiAgICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgICAgY2FzZSAndXRmLTE2bGUnOlxuICAgICAgICByZXR1cm4gbGVuICogMlxuICAgICAgY2FzZSAnaGV4JzpcbiAgICAgICAgcmV0dXJuIGxlbiA+Pj4gMVxuICAgICAgY2FzZSAnYmFzZTY0JzpcbiAgICAgICAgcmV0dXJuIGJhc2U2NFRvQnl0ZXMoc3RyaW5nKS5sZW5ndGhcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGlmIChsb3dlcmVkQ2FzZSkgcmV0dXJuIHV0ZjhUb0J5dGVzKHN0cmluZykubGVuZ3RoIC8vIGFzc3VtZSB1dGY4XG4gICAgICAgIGVuY29kaW5nID0gKCcnICsgZW5jb2RpbmcpLnRvTG93ZXJDYXNlKClcbiAgICAgICAgbG93ZXJlZENhc2UgPSB0cnVlXG4gICAgfVxuICB9XG59XG5CdWZmZXIuYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGhcblxuZnVuY3Rpb24gc2xvd1RvU3RyaW5nIChlbmNvZGluZywgc3RhcnQsIGVuZCkge1xuICB2YXIgbG93ZXJlZENhc2UgPSBmYWxzZVxuXG4gIC8vIE5vIG5lZWQgdG8gdmVyaWZ5IHRoYXQgXCJ0aGlzLmxlbmd0aCA8PSBNQVhfVUlOVDMyXCIgc2luY2UgaXQncyBhIHJlYWQtb25seVxuICAvLyBwcm9wZXJ0eSBvZiBhIHR5cGVkIGFycmF5LlxuXG4gIC8vIFRoaXMgYmVoYXZlcyBuZWl0aGVyIGxpa2UgU3RyaW5nIG5vciBVaW50OEFycmF5IGluIHRoYXQgd2Ugc2V0IHN0YXJ0L2VuZFxuICAvLyB0byB0aGVpciB1cHBlci9sb3dlciBib3VuZHMgaWYgdGhlIHZhbHVlIHBhc3NlZCBpcyBvdXQgb2YgcmFuZ2UuXG4gIC8vIHVuZGVmaW5lZCBpcyBoYW5kbGVkIHNwZWNpYWxseSBhcyBwZXIgRUNNQS0yNjIgNnRoIEVkaXRpb24sXG4gIC8vIFNlY3Rpb24gMTMuMy4zLjcgUnVudGltZSBTZW1hbnRpY3M6IEtleWVkQmluZGluZ0luaXRpYWxpemF0aW9uLlxuICBpZiAoc3RhcnQgPT09IHVuZGVmaW5lZCB8fCBzdGFydCA8IDApIHtcbiAgICBzdGFydCA9IDBcbiAgfVxuICAvLyBSZXR1cm4gZWFybHkgaWYgc3RhcnQgPiB0aGlzLmxlbmd0aC4gRG9uZSBoZXJlIHRvIHByZXZlbnQgcG90ZW50aWFsIHVpbnQzMlxuICAvLyBjb2VyY2lvbiBmYWlsIGJlbG93LlxuICBpZiAoc3RhcnQgPiB0aGlzLmxlbmd0aCkge1xuICAgIHJldHVybiAnJ1xuICB9XG5cbiAgaWYgKGVuZCA9PT0gdW5kZWZpbmVkIHx8IGVuZCA+IHRoaXMubGVuZ3RoKSB7XG4gICAgZW5kID0gdGhpcy5sZW5ndGhcbiAgfVxuXG4gIGlmIChlbmQgPD0gMCkge1xuICAgIHJldHVybiAnJ1xuICB9XG5cbiAgLy8gRm9yY2UgY29lcnNpb24gdG8gdWludDMyLiBUaGlzIHdpbGwgYWxzbyBjb2VyY2UgZmFsc2V5L05hTiB2YWx1ZXMgdG8gMC5cbiAgZW5kID4+Pj0gMFxuICBzdGFydCA+Pj49IDBcblxuICBpZiAoZW5kIDw9IHN0YXJ0KSB7XG4gICAgcmV0dXJuICcnXG4gIH1cblxuICBpZiAoIWVuY29kaW5nKSBlbmNvZGluZyA9ICd1dGY4J1xuXG4gIHdoaWxlICh0cnVlKSB7XG4gICAgc3dpdGNoIChlbmNvZGluZykge1xuICAgICAgY2FzZSAnaGV4JzpcbiAgICAgICAgcmV0dXJuIGhleFNsaWNlKHRoaXMsIHN0YXJ0LCBlbmQpXG5cbiAgICAgIGNhc2UgJ3V0ZjgnOlxuICAgICAgY2FzZSAndXRmLTgnOlxuICAgICAgICByZXR1cm4gdXRmOFNsaWNlKHRoaXMsIHN0YXJ0LCBlbmQpXG5cbiAgICAgIGNhc2UgJ2FzY2lpJzpcbiAgICAgICAgcmV0dXJuIGFzY2lpU2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgY2FzZSAnbGF0aW4xJzpcbiAgICAgIGNhc2UgJ2JpbmFyeSc6XG4gICAgICAgIHJldHVybiBsYXRpbjFTbGljZSh0aGlzLCBzdGFydCwgZW5kKVxuXG4gICAgICBjYXNlICdiYXNlNjQnOlxuICAgICAgICByZXR1cm4gYmFzZTY0U2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgY2FzZSAndWNzMic6XG4gICAgICBjYXNlICd1Y3MtMic6XG4gICAgICBjYXNlICd1dGYxNmxlJzpcbiAgICAgIGNhc2UgJ3V0Zi0xNmxlJzpcbiAgICAgICAgcmV0dXJuIHV0ZjE2bGVTbGljZSh0aGlzLCBzdGFydCwgZW5kKVxuXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBpZiAobG93ZXJlZENhc2UpIHRocm93IG5ldyBUeXBlRXJyb3IoJ1Vua25vd24gZW5jb2Rpbmc6ICcgKyBlbmNvZGluZylcbiAgICAgICAgZW5jb2RpbmcgPSAoZW5jb2RpbmcgKyAnJykudG9Mb3dlckNhc2UoKVxuICAgICAgICBsb3dlcmVkQ2FzZSA9IHRydWVcbiAgICB9XG4gIH1cbn1cblxuLy8gVGhlIHByb3BlcnR5IGlzIHVzZWQgYnkgYEJ1ZmZlci5pc0J1ZmZlcmAgYW5kIGBpcy1idWZmZXJgIChpbiBTYWZhcmkgNS03KSB0byBkZXRlY3Rcbi8vIEJ1ZmZlciBpbnN0YW5jZXMuXG5CdWZmZXIucHJvdG90eXBlLl9pc0J1ZmZlciA9IHRydWVcblxuZnVuY3Rpb24gc3dhcCAoYiwgbiwgbSkge1xuICB2YXIgaSA9IGJbbl1cbiAgYltuXSA9IGJbbV1cbiAgYlttXSA9IGlcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5zd2FwMTYgPSBmdW5jdGlvbiBzd2FwMTYgKCkge1xuICB2YXIgbGVuID0gdGhpcy5sZW5ndGhcbiAgaWYgKGxlbiAlIDIgIT09IDApIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignQnVmZmVyIHNpemUgbXVzdCBiZSBhIG11bHRpcGxlIG9mIDE2LWJpdHMnKVxuICB9XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpICs9IDIpIHtcbiAgICBzd2FwKHRoaXMsIGksIGkgKyAxKVxuICB9XG4gIHJldHVybiB0aGlzXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuc3dhcDMyID0gZnVuY3Rpb24gc3dhcDMyICgpIHtcbiAgdmFyIGxlbiA9IHRoaXMubGVuZ3RoXG4gIGlmIChsZW4gJSA0ICE9PSAwKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0J1ZmZlciBzaXplIG11c3QgYmUgYSBtdWx0aXBsZSBvZiAzMi1iaXRzJylcbiAgfVxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSArPSA0KSB7XG4gICAgc3dhcCh0aGlzLCBpLCBpICsgMylcbiAgICBzd2FwKHRoaXMsIGkgKyAxLCBpICsgMilcbiAgfVxuICByZXR1cm4gdGhpc1xufVxuXG5CdWZmZXIucHJvdG90eXBlLnN3YXA2NCA9IGZ1bmN0aW9uIHN3YXA2NCAoKSB7XG4gIHZhciBsZW4gPSB0aGlzLmxlbmd0aFxuICBpZiAobGVuICUgOCAhPT0gMCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdCdWZmZXIgc2l6ZSBtdXN0IGJlIGEgbXVsdGlwbGUgb2YgNjQtYml0cycpXG4gIH1cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkgKz0gOCkge1xuICAgIHN3YXAodGhpcywgaSwgaSArIDcpXG4gICAgc3dhcCh0aGlzLCBpICsgMSwgaSArIDYpXG4gICAgc3dhcCh0aGlzLCBpICsgMiwgaSArIDUpXG4gICAgc3dhcCh0aGlzLCBpICsgMywgaSArIDQpXG4gIH1cbiAgcmV0dXJuIHRoaXNcbn1cblxuQnVmZmVyLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uIHRvU3RyaW5nICgpIHtcbiAgdmFyIGxlbmd0aCA9IHRoaXMubGVuZ3RoIHwgMFxuICBpZiAobGVuZ3RoID09PSAwKSByZXR1cm4gJydcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHJldHVybiB1dGY4U2xpY2UodGhpcywgMCwgbGVuZ3RoKVxuICByZXR1cm4gc2xvd1RvU3RyaW5nLmFwcGx5KHRoaXMsIGFyZ3VtZW50cylcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5lcXVhbHMgPSBmdW5jdGlvbiBlcXVhbHMgKGIpIHtcbiAgaWYgKCFCdWZmZXIuaXNCdWZmZXIoYikpIHRocm93IG5ldyBUeXBlRXJyb3IoJ0FyZ3VtZW50IG11c3QgYmUgYSBCdWZmZXInKVxuICBpZiAodGhpcyA9PT0gYikgcmV0dXJuIHRydWVcbiAgcmV0dXJuIEJ1ZmZlci5jb21wYXJlKHRoaXMsIGIpID09PSAwXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuaW5zcGVjdCA9IGZ1bmN0aW9uIGluc3BlY3QgKCkge1xuICB2YXIgc3RyID0gJydcbiAgdmFyIG1heCA9IGV4cG9ydHMuSU5TUEVDVF9NQVhfQllURVNcbiAgaWYgKHRoaXMubGVuZ3RoID4gMCkge1xuICAgIHN0ciA9IHRoaXMudG9TdHJpbmcoJ2hleCcsIDAsIG1heCkubWF0Y2goLy57Mn0vZykuam9pbignICcpXG4gICAgaWYgKHRoaXMubGVuZ3RoID4gbWF4KSBzdHIgKz0gJyAuLi4gJ1xuICB9XG4gIHJldHVybiAnPEJ1ZmZlciAnICsgc3RyICsgJz4nXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuY29tcGFyZSA9IGZ1bmN0aW9uIGNvbXBhcmUgKHRhcmdldCwgc3RhcnQsIGVuZCwgdGhpc1N0YXJ0LCB0aGlzRW5kKSB7XG4gIGlmICghQnVmZmVyLmlzQnVmZmVyKHRhcmdldCkpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdBcmd1bWVudCBtdXN0IGJlIGEgQnVmZmVyJylcbiAgfVxuXG4gIGlmIChzdGFydCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgc3RhcnQgPSAwXG4gIH1cbiAgaWYgKGVuZCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgZW5kID0gdGFyZ2V0ID8gdGFyZ2V0Lmxlbmd0aCA6IDBcbiAgfVxuICBpZiAodGhpc1N0YXJ0ID09PSB1bmRlZmluZWQpIHtcbiAgICB0aGlzU3RhcnQgPSAwXG4gIH1cbiAgaWYgKHRoaXNFbmQgPT09IHVuZGVmaW5lZCkge1xuICAgIHRoaXNFbmQgPSB0aGlzLmxlbmd0aFxuICB9XG5cbiAgaWYgKHN0YXJ0IDwgMCB8fCBlbmQgPiB0YXJnZXQubGVuZ3RoIHx8IHRoaXNTdGFydCA8IDAgfHwgdGhpc0VuZCA+IHRoaXMubGVuZ3RoKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ291dCBvZiByYW5nZSBpbmRleCcpXG4gIH1cblxuICBpZiAodGhpc1N0YXJ0ID49IHRoaXNFbmQgJiYgc3RhcnQgPj0gZW5kKSB7XG4gICAgcmV0dXJuIDBcbiAgfVxuICBpZiAodGhpc1N0YXJ0ID49IHRoaXNFbmQpIHtcbiAgICByZXR1cm4gLTFcbiAgfVxuICBpZiAoc3RhcnQgPj0gZW5kKSB7XG4gICAgcmV0dXJuIDFcbiAgfVxuXG4gIHN0YXJ0ID4+Pj0gMFxuICBlbmQgPj4+PSAwXG4gIHRoaXNTdGFydCA+Pj49IDBcbiAgdGhpc0VuZCA+Pj49IDBcblxuICBpZiAodGhpcyA9PT0gdGFyZ2V0KSByZXR1cm4gMFxuXG4gIHZhciB4ID0gdGhpc0VuZCAtIHRoaXNTdGFydFxuICB2YXIgeSA9IGVuZCAtIHN0YXJ0XG4gIHZhciBsZW4gPSBNYXRoLm1pbih4LCB5KVxuXG4gIHZhciB0aGlzQ29weSA9IHRoaXMuc2xpY2UodGhpc1N0YXJ0LCB0aGlzRW5kKVxuICB2YXIgdGFyZ2V0Q29weSA9IHRhcmdldC5zbGljZShzdGFydCwgZW5kKVxuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyArK2kpIHtcbiAgICBpZiAodGhpc0NvcHlbaV0gIT09IHRhcmdldENvcHlbaV0pIHtcbiAgICAgIHggPSB0aGlzQ29weVtpXVxuICAgICAgeSA9IHRhcmdldENvcHlbaV1cbiAgICAgIGJyZWFrXG4gICAgfVxuICB9XG5cbiAgaWYgKHggPCB5KSByZXR1cm4gLTFcbiAgaWYgKHkgPCB4KSByZXR1cm4gMVxuICByZXR1cm4gMFxufVxuXG4vLyBGaW5kcyBlaXRoZXIgdGhlIGZpcnN0IGluZGV4IG9mIGB2YWxgIGluIGBidWZmZXJgIGF0IG9mZnNldCA+PSBgYnl0ZU9mZnNldGAsXG4vLyBPUiB0aGUgbGFzdCBpbmRleCBvZiBgdmFsYCBpbiBgYnVmZmVyYCBhdCBvZmZzZXQgPD0gYGJ5dGVPZmZzZXRgLlxuLy9cbi8vIEFyZ3VtZW50czpcbi8vIC0gYnVmZmVyIC0gYSBCdWZmZXIgdG8gc2VhcmNoXG4vLyAtIHZhbCAtIGEgc3RyaW5nLCBCdWZmZXIsIG9yIG51bWJlclxuLy8gLSBieXRlT2Zmc2V0IC0gYW4gaW5kZXggaW50byBgYnVmZmVyYDsgd2lsbCBiZSBjbGFtcGVkIHRvIGFuIGludDMyXG4vLyAtIGVuY29kaW5nIC0gYW4gb3B0aW9uYWwgZW5jb2RpbmcsIHJlbGV2YW50IGlzIHZhbCBpcyBhIHN0cmluZ1xuLy8gLSBkaXIgLSB0cnVlIGZvciBpbmRleE9mLCBmYWxzZSBmb3IgbGFzdEluZGV4T2ZcbmZ1bmN0aW9uIGJpZGlyZWN0aW9uYWxJbmRleE9mIChidWZmZXIsIHZhbCwgYnl0ZU9mZnNldCwgZW5jb2RpbmcsIGRpcikge1xuICAvLyBFbXB0eSBidWZmZXIgbWVhbnMgbm8gbWF0Y2hcbiAgaWYgKGJ1ZmZlci5sZW5ndGggPT09IDApIHJldHVybiAtMVxuXG4gIC8vIE5vcm1hbGl6ZSBieXRlT2Zmc2V0XG4gIGlmICh0eXBlb2YgYnl0ZU9mZnNldCA9PT0gJ3N0cmluZycpIHtcbiAgICBlbmNvZGluZyA9IGJ5dGVPZmZzZXRcbiAgICBieXRlT2Zmc2V0ID0gMFxuICB9IGVsc2UgaWYgKGJ5dGVPZmZzZXQgPiAweDdmZmZmZmZmKSB7XG4gICAgYnl0ZU9mZnNldCA9IDB4N2ZmZmZmZmZcbiAgfSBlbHNlIGlmIChieXRlT2Zmc2V0IDwgLTB4ODAwMDAwMDApIHtcbiAgICBieXRlT2Zmc2V0ID0gLTB4ODAwMDAwMDBcbiAgfVxuICBieXRlT2Zmc2V0ID0gK2J5dGVPZmZzZXQgIC8vIENvZXJjZSB0byBOdW1iZXIuXG4gIGlmIChpc05hTihieXRlT2Zmc2V0KSkge1xuICAgIC8vIGJ5dGVPZmZzZXQ6IGl0IGl0J3MgdW5kZWZpbmVkLCBudWxsLCBOYU4sIFwiZm9vXCIsIGV0Yywgc2VhcmNoIHdob2xlIGJ1ZmZlclxuICAgIGJ5dGVPZmZzZXQgPSBkaXIgPyAwIDogKGJ1ZmZlci5sZW5ndGggLSAxKVxuICB9XG5cbiAgLy8gTm9ybWFsaXplIGJ5dGVPZmZzZXQ6IG5lZ2F0aXZlIG9mZnNldHMgc3RhcnQgZnJvbSB0aGUgZW5kIG9mIHRoZSBidWZmZXJcbiAgaWYgKGJ5dGVPZmZzZXQgPCAwKSBieXRlT2Zmc2V0ID0gYnVmZmVyLmxlbmd0aCArIGJ5dGVPZmZzZXRcbiAgaWYgKGJ5dGVPZmZzZXQgPj0gYnVmZmVyLmxlbmd0aCkge1xuICAgIGlmIChkaXIpIHJldHVybiAtMVxuICAgIGVsc2UgYnl0ZU9mZnNldCA9IGJ1ZmZlci5sZW5ndGggLSAxXG4gIH0gZWxzZSBpZiAoYnl0ZU9mZnNldCA8IDApIHtcbiAgICBpZiAoZGlyKSBieXRlT2Zmc2V0ID0gMFxuICAgIGVsc2UgcmV0dXJuIC0xXG4gIH1cblxuICAvLyBOb3JtYWxpemUgdmFsXG4gIGlmICh0eXBlb2YgdmFsID09PSAnc3RyaW5nJykge1xuICAgIHZhbCA9IEJ1ZmZlci5mcm9tKHZhbCwgZW5jb2RpbmcpXG4gIH1cblxuICAvLyBGaW5hbGx5LCBzZWFyY2ggZWl0aGVyIGluZGV4T2YgKGlmIGRpciBpcyB0cnVlKSBvciBsYXN0SW5kZXhPZlxuICBpZiAoQnVmZmVyLmlzQnVmZmVyKHZhbCkpIHtcbiAgICAvLyBTcGVjaWFsIGNhc2U6IGxvb2tpbmcgZm9yIGVtcHR5IHN0cmluZy9idWZmZXIgYWx3YXlzIGZhaWxzXG4gICAgaWYgKHZhbC5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiAtMVxuICAgIH1cbiAgICByZXR1cm4gYXJyYXlJbmRleE9mKGJ1ZmZlciwgdmFsLCBieXRlT2Zmc2V0LCBlbmNvZGluZywgZGlyKVxuICB9IGVsc2UgaWYgKHR5cGVvZiB2YWwgPT09ICdudW1iZXInKSB7XG4gICAgdmFsID0gdmFsICYgMHhGRiAvLyBTZWFyY2ggZm9yIGEgYnl0ZSB2YWx1ZSBbMC0yNTVdXG4gICAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUICYmXG4gICAgICAgIHR5cGVvZiBVaW50OEFycmF5LnByb3RvdHlwZS5pbmRleE9mID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBpZiAoZGlyKSB7XG4gICAgICAgIHJldHVybiBVaW50OEFycmF5LnByb3RvdHlwZS5pbmRleE9mLmNhbGwoYnVmZmVyLCB2YWwsIGJ5dGVPZmZzZXQpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gVWludDhBcnJheS5wcm90b3R5cGUubGFzdEluZGV4T2YuY2FsbChidWZmZXIsIHZhbCwgYnl0ZU9mZnNldClcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGFycmF5SW5kZXhPZihidWZmZXIsIFsgdmFsIF0sIGJ5dGVPZmZzZXQsIGVuY29kaW5nLCBkaXIpXG4gIH1cblxuICB0aHJvdyBuZXcgVHlwZUVycm9yKCd2YWwgbXVzdCBiZSBzdHJpbmcsIG51bWJlciBvciBCdWZmZXInKVxufVxuXG5mdW5jdGlvbiBhcnJheUluZGV4T2YgKGFyciwgdmFsLCBieXRlT2Zmc2V0LCBlbmNvZGluZywgZGlyKSB7XG4gIHZhciBpbmRleFNpemUgPSAxXG4gIHZhciBhcnJMZW5ndGggPSBhcnIubGVuZ3RoXG4gIHZhciB2YWxMZW5ndGggPSB2YWwubGVuZ3RoXG5cbiAgaWYgKGVuY29kaW5nICE9PSB1bmRlZmluZWQpIHtcbiAgICBlbmNvZGluZyA9IFN0cmluZyhlbmNvZGluZykudG9Mb3dlckNhc2UoKVxuICAgIGlmIChlbmNvZGluZyA9PT0gJ3VjczInIHx8IGVuY29kaW5nID09PSAndWNzLTInIHx8XG4gICAgICAgIGVuY29kaW5nID09PSAndXRmMTZsZScgfHwgZW5jb2RpbmcgPT09ICd1dGYtMTZsZScpIHtcbiAgICAgIGlmIChhcnIubGVuZ3RoIDwgMiB8fCB2YWwubGVuZ3RoIDwgMikge1xuICAgICAgICByZXR1cm4gLTFcbiAgICAgIH1cbiAgICAgIGluZGV4U2l6ZSA9IDJcbiAgICAgIGFyckxlbmd0aCAvPSAyXG4gICAgICB2YWxMZW5ndGggLz0gMlxuICAgICAgYnl0ZU9mZnNldCAvPSAyXG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gcmVhZCAoYnVmLCBpKSB7XG4gICAgaWYgKGluZGV4U2l6ZSA9PT0gMSkge1xuICAgICAgcmV0dXJuIGJ1ZltpXVxuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gYnVmLnJlYWRVSW50MTZCRShpICogaW5kZXhTaXplKVxuICAgIH1cbiAgfVxuXG4gIHZhciBpXG4gIGlmIChkaXIpIHtcbiAgICB2YXIgZm91bmRJbmRleCA9IC0xXG4gICAgZm9yIChpID0gYnl0ZU9mZnNldDsgaSA8IGFyckxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAocmVhZChhcnIsIGkpID09PSByZWFkKHZhbCwgZm91bmRJbmRleCA9PT0gLTEgPyAwIDogaSAtIGZvdW5kSW5kZXgpKSB7XG4gICAgICAgIGlmIChmb3VuZEluZGV4ID09PSAtMSkgZm91bmRJbmRleCA9IGlcbiAgICAgICAgaWYgKGkgLSBmb3VuZEluZGV4ICsgMSA9PT0gdmFsTGVuZ3RoKSByZXR1cm4gZm91bmRJbmRleCAqIGluZGV4U2l6ZVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKGZvdW5kSW5kZXggIT09IC0xKSBpIC09IGkgLSBmb3VuZEluZGV4XG4gICAgICAgIGZvdW5kSW5kZXggPSAtMVxuICAgICAgfVxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBpZiAoYnl0ZU9mZnNldCArIHZhbExlbmd0aCA+IGFyckxlbmd0aCkgYnl0ZU9mZnNldCA9IGFyckxlbmd0aCAtIHZhbExlbmd0aFxuICAgIGZvciAoaSA9IGJ5dGVPZmZzZXQ7IGkgPj0gMDsgaS0tKSB7XG4gICAgICB2YXIgZm91bmQgPSB0cnVlXG4gICAgICBmb3IgKHZhciBqID0gMDsgaiA8IHZhbExlbmd0aDsgaisrKSB7XG4gICAgICAgIGlmIChyZWFkKGFyciwgaSArIGopICE9PSByZWFkKHZhbCwgaikpIHtcbiAgICAgICAgICBmb3VuZCA9IGZhbHNlXG4gICAgICAgICAgYnJlYWtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKGZvdW5kKSByZXR1cm4gaVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiAtMVxufVxuXG5CdWZmZXIucHJvdG90eXBlLmluY2x1ZGVzID0gZnVuY3Rpb24gaW5jbHVkZXMgKHZhbCwgYnl0ZU9mZnNldCwgZW5jb2RpbmcpIHtcbiAgcmV0dXJuIHRoaXMuaW5kZXhPZih2YWwsIGJ5dGVPZmZzZXQsIGVuY29kaW5nKSAhPT0gLTFcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5pbmRleE9mID0gZnVuY3Rpb24gaW5kZXhPZiAodmFsLCBieXRlT2Zmc2V0LCBlbmNvZGluZykge1xuICByZXR1cm4gYmlkaXJlY3Rpb25hbEluZGV4T2YodGhpcywgdmFsLCBieXRlT2Zmc2V0LCBlbmNvZGluZywgdHJ1ZSlcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5sYXN0SW5kZXhPZiA9IGZ1bmN0aW9uIGxhc3RJbmRleE9mICh2YWwsIGJ5dGVPZmZzZXQsIGVuY29kaW5nKSB7XG4gIHJldHVybiBiaWRpcmVjdGlvbmFsSW5kZXhPZih0aGlzLCB2YWwsIGJ5dGVPZmZzZXQsIGVuY29kaW5nLCBmYWxzZSlcbn1cblxuZnVuY3Rpb24gaGV4V3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICBvZmZzZXQgPSBOdW1iZXIob2Zmc2V0KSB8fCAwXG4gIHZhciByZW1haW5pbmcgPSBidWYubGVuZ3RoIC0gb2Zmc2V0XG4gIGlmICghbGVuZ3RoKSB7XG4gICAgbGVuZ3RoID0gcmVtYWluaW5nXG4gIH0gZWxzZSB7XG4gICAgbGVuZ3RoID0gTnVtYmVyKGxlbmd0aClcbiAgICBpZiAobGVuZ3RoID4gcmVtYWluaW5nKSB7XG4gICAgICBsZW5ndGggPSByZW1haW5pbmdcbiAgICB9XG4gIH1cblxuICAvLyBtdXN0IGJlIGFuIGV2ZW4gbnVtYmVyIG9mIGRpZ2l0c1xuICB2YXIgc3RyTGVuID0gc3RyaW5nLmxlbmd0aFxuICBpZiAoc3RyTGVuICUgMiAhPT0gMCkgdGhyb3cgbmV3IFR5cGVFcnJvcignSW52YWxpZCBoZXggc3RyaW5nJylcblxuICBpZiAobGVuZ3RoID4gc3RyTGVuIC8gMikge1xuICAgIGxlbmd0aCA9IHN0ckxlbiAvIDJcbiAgfVxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgKytpKSB7XG4gICAgdmFyIHBhcnNlZCA9IHBhcnNlSW50KHN0cmluZy5zdWJzdHIoaSAqIDIsIDIpLCAxNilcbiAgICBpZiAoaXNOYU4ocGFyc2VkKSkgcmV0dXJuIGlcbiAgICBidWZbb2Zmc2V0ICsgaV0gPSBwYXJzZWRcbiAgfVxuICByZXR1cm4gaVxufVxuXG5mdW5jdGlvbiB1dGY4V3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICByZXR1cm4gYmxpdEJ1ZmZlcih1dGY4VG9CeXRlcyhzdHJpbmcsIGJ1Zi5sZW5ndGggLSBvZmZzZXQpLCBidWYsIG9mZnNldCwgbGVuZ3RoKVxufVxuXG5mdW5jdGlvbiBhc2NpaVdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgcmV0dXJuIGJsaXRCdWZmZXIoYXNjaWlUb0J5dGVzKHN0cmluZyksIGJ1Ziwgb2Zmc2V0LCBsZW5ndGgpXG59XG5cbmZ1bmN0aW9uIGxhdGluMVdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgcmV0dXJuIGFzY2lpV3JpdGUoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxufVxuXG5mdW5jdGlvbiBiYXNlNjRXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHJldHVybiBibGl0QnVmZmVyKGJhc2U2NFRvQnl0ZXMoc3RyaW5nKSwgYnVmLCBvZmZzZXQsIGxlbmd0aClcbn1cblxuZnVuY3Rpb24gdWNzMldyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgcmV0dXJuIGJsaXRCdWZmZXIodXRmMTZsZVRvQnl0ZXMoc3RyaW5nLCBidWYubGVuZ3RoIC0gb2Zmc2V0KSwgYnVmLCBvZmZzZXQsIGxlbmd0aClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZSA9IGZ1bmN0aW9uIHdyaXRlIChzdHJpbmcsIG9mZnNldCwgbGVuZ3RoLCBlbmNvZGluZykge1xuICAvLyBCdWZmZXIjd3JpdGUoc3RyaW5nKVxuICBpZiAob2Zmc2V0ID09PSB1bmRlZmluZWQpIHtcbiAgICBlbmNvZGluZyA9ICd1dGY4J1xuICAgIGxlbmd0aCA9IHRoaXMubGVuZ3RoXG4gICAgb2Zmc2V0ID0gMFxuICAvLyBCdWZmZXIjd3JpdGUoc3RyaW5nLCBlbmNvZGluZylcbiAgfSBlbHNlIGlmIChsZW5ndGggPT09IHVuZGVmaW5lZCAmJiB0eXBlb2Ygb2Zmc2V0ID09PSAnc3RyaW5nJykge1xuICAgIGVuY29kaW5nID0gb2Zmc2V0XG4gICAgbGVuZ3RoID0gdGhpcy5sZW5ndGhcbiAgICBvZmZzZXQgPSAwXG4gIC8vIEJ1ZmZlciN3cml0ZShzdHJpbmcsIG9mZnNldFssIGxlbmd0aF1bLCBlbmNvZGluZ10pXG4gIH0gZWxzZSBpZiAoaXNGaW5pdGUob2Zmc2V0KSkge1xuICAgIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgICBpZiAoaXNGaW5pdGUobGVuZ3RoKSkge1xuICAgICAgbGVuZ3RoID0gbGVuZ3RoIHwgMFxuICAgICAgaWYgKGVuY29kaW5nID09PSB1bmRlZmluZWQpIGVuY29kaW5nID0gJ3V0ZjgnXG4gICAgfSBlbHNlIHtcbiAgICAgIGVuY29kaW5nID0gbGVuZ3RoXG4gICAgICBsZW5ndGggPSB1bmRlZmluZWRcbiAgICB9XG4gIC8vIGxlZ2FjeSB3cml0ZShzdHJpbmcsIGVuY29kaW5nLCBvZmZzZXQsIGxlbmd0aCkgLSByZW1vdmUgaW4gdjAuMTNcbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAnQnVmZmVyLndyaXRlKHN0cmluZywgZW5jb2RpbmcsIG9mZnNldFssIGxlbmd0aF0pIGlzIG5vIGxvbmdlciBzdXBwb3J0ZWQnXG4gICAgKVxuICB9XG5cbiAgdmFyIHJlbWFpbmluZyA9IHRoaXMubGVuZ3RoIC0gb2Zmc2V0XG4gIGlmIChsZW5ndGggPT09IHVuZGVmaW5lZCB8fCBsZW5ndGggPiByZW1haW5pbmcpIGxlbmd0aCA9IHJlbWFpbmluZ1xuXG4gIGlmICgoc3RyaW5nLmxlbmd0aCA+IDAgJiYgKGxlbmd0aCA8IDAgfHwgb2Zmc2V0IDwgMCkpIHx8IG9mZnNldCA+IHRoaXMubGVuZ3RoKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0F0dGVtcHQgdG8gd3JpdGUgb3V0c2lkZSBidWZmZXIgYm91bmRzJylcbiAgfVxuXG4gIGlmICghZW5jb2RpbmcpIGVuY29kaW5nID0gJ3V0ZjgnXG5cbiAgdmFyIGxvd2VyZWRDYXNlID0gZmFsc2VcbiAgZm9yICg7Oykge1xuICAgIHN3aXRjaCAoZW5jb2RpbmcpIHtcbiAgICAgIGNhc2UgJ2hleCc6XG4gICAgICAgIHJldHVybiBoZXhXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuXG4gICAgICBjYXNlICd1dGY4JzpcbiAgICAgIGNhc2UgJ3V0Zi04JzpcbiAgICAgICAgcmV0dXJuIHV0ZjhXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuXG4gICAgICBjYXNlICdhc2NpaSc6XG4gICAgICAgIHJldHVybiBhc2NpaVdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG5cbiAgICAgIGNhc2UgJ2xhdGluMSc6XG4gICAgICBjYXNlICdiaW5hcnknOlxuICAgICAgICByZXR1cm4gbGF0aW4xV3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcblxuICAgICAgY2FzZSAnYmFzZTY0JzpcbiAgICAgICAgLy8gV2FybmluZzogbWF4TGVuZ3RoIG5vdCB0YWtlbiBpbnRvIGFjY291bnQgaW4gYmFzZTY0V3JpdGVcbiAgICAgICAgcmV0dXJuIGJhc2U2NFdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG5cbiAgICAgIGNhc2UgJ3VjczInOlxuICAgICAgY2FzZSAndWNzLTInOlxuICAgICAgY2FzZSAndXRmMTZsZSc6XG4gICAgICBjYXNlICd1dGYtMTZsZSc6XG4gICAgICAgIHJldHVybiB1Y3MyV3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcblxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgaWYgKGxvd2VyZWRDYXNlKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdVbmtub3duIGVuY29kaW5nOiAnICsgZW5jb2RpbmcpXG4gICAgICAgIGVuY29kaW5nID0gKCcnICsgZW5jb2RpbmcpLnRvTG93ZXJDYXNlKClcbiAgICAgICAgbG93ZXJlZENhc2UgPSB0cnVlXG4gICAgfVxuICB9XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUudG9KU09OID0gZnVuY3Rpb24gdG9KU09OICgpIHtcbiAgcmV0dXJuIHtcbiAgICB0eXBlOiAnQnVmZmVyJyxcbiAgICBkYXRhOiBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbCh0aGlzLl9hcnIgfHwgdGhpcywgMClcbiAgfVxufVxuXG5mdW5jdGlvbiBiYXNlNjRTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIGlmIChzdGFydCA9PT0gMCAmJiBlbmQgPT09IGJ1Zi5sZW5ndGgpIHtcbiAgICByZXR1cm4gYmFzZTY0LmZyb21CeXRlQXJyYXkoYnVmKVxuICB9IGVsc2Uge1xuICAgIHJldHVybiBiYXNlNjQuZnJvbUJ5dGVBcnJheShidWYuc2xpY2Uoc3RhcnQsIGVuZCkpXG4gIH1cbn1cblxuZnVuY3Rpb24gdXRmOFNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgZW5kID0gTWF0aC5taW4oYnVmLmxlbmd0aCwgZW5kKVxuICB2YXIgcmVzID0gW11cblxuICB2YXIgaSA9IHN0YXJ0XG4gIHdoaWxlIChpIDwgZW5kKSB7XG4gICAgdmFyIGZpcnN0Qnl0ZSA9IGJ1ZltpXVxuICAgIHZhciBjb2RlUG9pbnQgPSBudWxsXG4gICAgdmFyIGJ5dGVzUGVyU2VxdWVuY2UgPSAoZmlyc3RCeXRlID4gMHhFRikgPyA0XG4gICAgICA6IChmaXJzdEJ5dGUgPiAweERGKSA/IDNcbiAgICAgIDogKGZpcnN0Qnl0ZSA+IDB4QkYpID8gMlxuICAgICAgOiAxXG5cbiAgICBpZiAoaSArIGJ5dGVzUGVyU2VxdWVuY2UgPD0gZW5kKSB7XG4gICAgICB2YXIgc2Vjb25kQnl0ZSwgdGhpcmRCeXRlLCBmb3VydGhCeXRlLCB0ZW1wQ29kZVBvaW50XG5cbiAgICAgIHN3aXRjaCAoYnl0ZXNQZXJTZXF1ZW5jZSkge1xuICAgICAgICBjYXNlIDE6XG4gICAgICAgICAgaWYgKGZpcnN0Qnl0ZSA8IDB4ODApIHtcbiAgICAgICAgICAgIGNvZGVQb2ludCA9IGZpcnN0Qnl0ZVxuICAgICAgICAgIH1cbiAgICAgICAgICBicmVha1xuICAgICAgICBjYXNlIDI6XG4gICAgICAgICAgc2Vjb25kQnl0ZSA9IGJ1ZltpICsgMV1cbiAgICAgICAgICBpZiAoKHNlY29uZEJ5dGUgJiAweEMwKSA9PT0gMHg4MCkge1xuICAgICAgICAgICAgdGVtcENvZGVQb2ludCA9IChmaXJzdEJ5dGUgJiAweDFGKSA8PCAweDYgfCAoc2Vjb25kQnl0ZSAmIDB4M0YpXG4gICAgICAgICAgICBpZiAodGVtcENvZGVQb2ludCA+IDB4N0YpIHtcbiAgICAgICAgICAgICAgY29kZVBvaW50ID0gdGVtcENvZGVQb2ludFxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBicmVha1xuICAgICAgICBjYXNlIDM6XG4gICAgICAgICAgc2Vjb25kQnl0ZSA9IGJ1ZltpICsgMV1cbiAgICAgICAgICB0aGlyZEJ5dGUgPSBidWZbaSArIDJdXG4gICAgICAgICAgaWYgKChzZWNvbmRCeXRlICYgMHhDMCkgPT09IDB4ODAgJiYgKHRoaXJkQnl0ZSAmIDB4QzApID09PSAweDgwKSB7XG4gICAgICAgICAgICB0ZW1wQ29kZVBvaW50ID0gKGZpcnN0Qnl0ZSAmIDB4RikgPDwgMHhDIHwgKHNlY29uZEJ5dGUgJiAweDNGKSA8PCAweDYgfCAodGhpcmRCeXRlICYgMHgzRilcbiAgICAgICAgICAgIGlmICh0ZW1wQ29kZVBvaW50ID4gMHg3RkYgJiYgKHRlbXBDb2RlUG9pbnQgPCAweEQ4MDAgfHwgdGVtcENvZGVQb2ludCA+IDB4REZGRikpIHtcbiAgICAgICAgICAgICAgY29kZVBvaW50ID0gdGVtcENvZGVQb2ludFxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBicmVha1xuICAgICAgICBjYXNlIDQ6XG4gICAgICAgICAgc2Vjb25kQnl0ZSA9IGJ1ZltpICsgMV1cbiAgICAgICAgICB0aGlyZEJ5dGUgPSBidWZbaSArIDJdXG4gICAgICAgICAgZm91cnRoQnl0ZSA9IGJ1ZltpICsgM11cbiAgICAgICAgICBpZiAoKHNlY29uZEJ5dGUgJiAweEMwKSA9PT0gMHg4MCAmJiAodGhpcmRCeXRlICYgMHhDMCkgPT09IDB4ODAgJiYgKGZvdXJ0aEJ5dGUgJiAweEMwKSA9PT0gMHg4MCkge1xuICAgICAgICAgICAgdGVtcENvZGVQb2ludCA9IChmaXJzdEJ5dGUgJiAweEYpIDw8IDB4MTIgfCAoc2Vjb25kQnl0ZSAmIDB4M0YpIDw8IDB4QyB8ICh0aGlyZEJ5dGUgJiAweDNGKSA8PCAweDYgfCAoZm91cnRoQnl0ZSAmIDB4M0YpXG4gICAgICAgICAgICBpZiAodGVtcENvZGVQb2ludCA+IDB4RkZGRiAmJiB0ZW1wQ29kZVBvaW50IDwgMHgxMTAwMDApIHtcbiAgICAgICAgICAgICAgY29kZVBvaW50ID0gdGVtcENvZGVQb2ludFxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoY29kZVBvaW50ID09PSBudWxsKSB7XG4gICAgICAvLyB3ZSBkaWQgbm90IGdlbmVyYXRlIGEgdmFsaWQgY29kZVBvaW50IHNvIGluc2VydCBhXG4gICAgICAvLyByZXBsYWNlbWVudCBjaGFyIChVK0ZGRkQpIGFuZCBhZHZhbmNlIG9ubHkgMSBieXRlXG4gICAgICBjb2RlUG9pbnQgPSAweEZGRkRcbiAgICAgIGJ5dGVzUGVyU2VxdWVuY2UgPSAxXG4gICAgfSBlbHNlIGlmIChjb2RlUG9pbnQgPiAweEZGRkYpIHtcbiAgICAgIC8vIGVuY29kZSB0byB1dGYxNiAoc3Vycm9nYXRlIHBhaXIgZGFuY2UpXG4gICAgICBjb2RlUG9pbnQgLT0gMHgxMDAwMFxuICAgICAgcmVzLnB1c2goY29kZVBvaW50ID4+PiAxMCAmIDB4M0ZGIHwgMHhEODAwKVxuICAgICAgY29kZVBvaW50ID0gMHhEQzAwIHwgY29kZVBvaW50ICYgMHgzRkZcbiAgICB9XG5cbiAgICByZXMucHVzaChjb2RlUG9pbnQpXG4gICAgaSArPSBieXRlc1BlclNlcXVlbmNlXG4gIH1cblxuICByZXR1cm4gZGVjb2RlQ29kZVBvaW50c0FycmF5KHJlcylcbn1cblxuLy8gQmFzZWQgb24gaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL2EvMjI3NDcyNzIvNjgwNzQyLCB0aGUgYnJvd3NlciB3aXRoXG4vLyB0aGUgbG93ZXN0IGxpbWl0IGlzIENocm9tZSwgd2l0aCAweDEwMDAwIGFyZ3MuXG4vLyBXZSBnbyAxIG1hZ25pdHVkZSBsZXNzLCBmb3Igc2FmZXR5XG52YXIgTUFYX0FSR1VNRU5UU19MRU5HVEggPSAweDEwMDBcblxuZnVuY3Rpb24gZGVjb2RlQ29kZVBvaW50c0FycmF5IChjb2RlUG9pbnRzKSB7XG4gIHZhciBsZW4gPSBjb2RlUG9pbnRzLmxlbmd0aFxuICBpZiAobGVuIDw9IE1BWF9BUkdVTUVOVFNfTEVOR1RIKSB7XG4gICAgcmV0dXJuIFN0cmluZy5mcm9tQ2hhckNvZGUuYXBwbHkoU3RyaW5nLCBjb2RlUG9pbnRzKSAvLyBhdm9pZCBleHRyYSBzbGljZSgpXG4gIH1cblxuICAvLyBEZWNvZGUgaW4gY2h1bmtzIHRvIGF2b2lkIFwiY2FsbCBzdGFjayBzaXplIGV4Y2VlZGVkXCIuXG4gIHZhciByZXMgPSAnJ1xuICB2YXIgaSA9IDBcbiAgd2hpbGUgKGkgPCBsZW4pIHtcbiAgICByZXMgKz0gU3RyaW5nLmZyb21DaGFyQ29kZS5hcHBseShcbiAgICAgIFN0cmluZyxcbiAgICAgIGNvZGVQb2ludHMuc2xpY2UoaSwgaSArPSBNQVhfQVJHVU1FTlRTX0xFTkdUSClcbiAgICApXG4gIH1cbiAgcmV0dXJuIHJlc1xufVxuXG5mdW5jdGlvbiBhc2NpaVNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIHJldCA9ICcnXG4gIGVuZCA9IE1hdGgubWluKGJ1Zi5sZW5ndGgsIGVuZClcblxuICBmb3IgKHZhciBpID0gc3RhcnQ7IGkgPCBlbmQ7ICsraSkge1xuICAgIHJldCArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGJ1ZltpXSAmIDB4N0YpXG4gIH1cbiAgcmV0dXJuIHJldFxufVxuXG5mdW5jdGlvbiBsYXRpbjFTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIHZhciByZXQgPSAnJ1xuICBlbmQgPSBNYXRoLm1pbihidWYubGVuZ3RoLCBlbmQpXG5cbiAgZm9yICh2YXIgaSA9IHN0YXJ0OyBpIDwgZW5kOyArK2kpIHtcbiAgICByZXQgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShidWZbaV0pXG4gIH1cbiAgcmV0dXJuIHJldFxufVxuXG5mdW5jdGlvbiBoZXhTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIHZhciBsZW4gPSBidWYubGVuZ3RoXG5cbiAgaWYgKCFzdGFydCB8fCBzdGFydCA8IDApIHN0YXJ0ID0gMFxuICBpZiAoIWVuZCB8fCBlbmQgPCAwIHx8IGVuZCA+IGxlbikgZW5kID0gbGVuXG5cbiAgdmFyIG91dCA9ICcnXG4gIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IGVuZDsgKytpKSB7XG4gICAgb3V0ICs9IHRvSGV4KGJ1ZltpXSlcbiAgfVxuICByZXR1cm4gb3V0XG59XG5cbmZ1bmN0aW9uIHV0ZjE2bGVTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIHZhciBieXRlcyA9IGJ1Zi5zbGljZShzdGFydCwgZW5kKVxuICB2YXIgcmVzID0gJydcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBieXRlcy5sZW5ndGg7IGkgKz0gMikge1xuICAgIHJlcyArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGJ5dGVzW2ldICsgYnl0ZXNbaSArIDFdICogMjU2KVxuICB9XG4gIHJldHVybiByZXNcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5zbGljZSA9IGZ1bmN0aW9uIHNsaWNlIChzdGFydCwgZW5kKSB7XG4gIHZhciBsZW4gPSB0aGlzLmxlbmd0aFxuICBzdGFydCA9IH5+c3RhcnRcbiAgZW5kID0gZW5kID09PSB1bmRlZmluZWQgPyBsZW4gOiB+fmVuZFxuXG4gIGlmIChzdGFydCA8IDApIHtcbiAgICBzdGFydCArPSBsZW5cbiAgICBpZiAoc3RhcnQgPCAwKSBzdGFydCA9IDBcbiAgfSBlbHNlIGlmIChzdGFydCA+IGxlbikge1xuICAgIHN0YXJ0ID0gbGVuXG4gIH1cblxuICBpZiAoZW5kIDwgMCkge1xuICAgIGVuZCArPSBsZW5cbiAgICBpZiAoZW5kIDwgMCkgZW5kID0gMFxuICB9IGVsc2UgaWYgKGVuZCA+IGxlbikge1xuICAgIGVuZCA9IGxlblxuICB9XG5cbiAgaWYgKGVuZCA8IHN0YXJ0KSBlbmQgPSBzdGFydFxuXG4gIHZhciBuZXdCdWZcbiAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgbmV3QnVmID0gdGhpcy5zdWJhcnJheShzdGFydCwgZW5kKVxuICAgIG5ld0J1Zi5fX3Byb3RvX18gPSBCdWZmZXIucHJvdG90eXBlXG4gIH0gZWxzZSB7XG4gICAgdmFyIHNsaWNlTGVuID0gZW5kIC0gc3RhcnRcbiAgICBuZXdCdWYgPSBuZXcgQnVmZmVyKHNsaWNlTGVuLCB1bmRlZmluZWQpXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzbGljZUxlbjsgKytpKSB7XG4gICAgICBuZXdCdWZbaV0gPSB0aGlzW2kgKyBzdGFydF1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gbmV3QnVmXG59XG5cbi8qXG4gKiBOZWVkIHRvIG1ha2Ugc3VyZSB0aGF0IGJ1ZmZlciBpc24ndCB0cnlpbmcgdG8gd3JpdGUgb3V0IG9mIGJvdW5kcy5cbiAqL1xuZnVuY3Rpb24gY2hlY2tPZmZzZXQgKG9mZnNldCwgZXh0LCBsZW5ndGgpIHtcbiAgaWYgKChvZmZzZXQgJSAxKSAhPT0gMCB8fCBvZmZzZXQgPCAwKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignb2Zmc2V0IGlzIG5vdCB1aW50JylcbiAgaWYgKG9mZnNldCArIGV4dCA+IGxlbmd0aCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ1RyeWluZyB0byBhY2Nlc3MgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50TEUgPSBmdW5jdGlvbiByZWFkVUludExFIChvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGggfCAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgYnl0ZUxlbmd0aCwgdGhpcy5sZW5ndGgpXG5cbiAgdmFyIHZhbCA9IHRoaXNbb2Zmc2V0XVxuICB2YXIgbXVsID0gMVxuICB2YXIgaSA9IDBcbiAgd2hpbGUgKCsraSA8IGJ5dGVMZW5ndGggJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICB2YWwgKz0gdGhpc1tvZmZzZXQgKyBpXSAqIG11bFxuICB9XG5cbiAgcmV0dXJuIHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50QkUgPSBmdW5jdGlvbiByZWFkVUludEJFIChvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGggfCAwXG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBjaGVja09mZnNldChvZmZzZXQsIGJ5dGVMZW5ndGgsIHRoaXMubGVuZ3RoKVxuICB9XG5cbiAgdmFyIHZhbCA9IHRoaXNbb2Zmc2V0ICsgLS1ieXRlTGVuZ3RoXVxuICB2YXIgbXVsID0gMVxuICB3aGlsZSAoYnl0ZUxlbmd0aCA+IDAgJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICB2YWwgKz0gdGhpc1tvZmZzZXQgKyAtLWJ5dGVMZW5ndGhdICogbXVsXG4gIH1cblxuICByZXR1cm4gdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnQ4ID0gZnVuY3Rpb24gcmVhZFVJbnQ4IChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgMSwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiB0aGlzW29mZnNldF1cbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDE2TEUgPSBmdW5jdGlvbiByZWFkVUludDE2TEUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCAyLCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuIHRoaXNbb2Zmc2V0XSB8ICh0aGlzW29mZnNldCArIDFdIDw8IDgpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnQxNkJFID0gZnVuY3Rpb24gcmVhZFVJbnQxNkJFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgMiwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiAodGhpc1tvZmZzZXRdIDw8IDgpIHwgdGhpc1tvZmZzZXQgKyAxXVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50MzJMRSA9IGZ1bmN0aW9uIHJlYWRVSW50MzJMRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuXG4gIHJldHVybiAoKHRoaXNbb2Zmc2V0XSkgfFxuICAgICAgKHRoaXNbb2Zmc2V0ICsgMV0gPDwgOCkgfFxuICAgICAgKHRoaXNbb2Zmc2V0ICsgMl0gPDwgMTYpKSArXG4gICAgICAodGhpc1tvZmZzZXQgKyAzXSAqIDB4MTAwMDAwMClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDMyQkUgPSBmdW5jdGlvbiByZWFkVUludDMyQkUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA0LCB0aGlzLmxlbmd0aClcblxuICByZXR1cm4gKHRoaXNbb2Zmc2V0XSAqIDB4MTAwMDAwMCkgK1xuICAgICgodGhpc1tvZmZzZXQgKyAxXSA8PCAxNikgfFxuICAgICh0aGlzW29mZnNldCArIDJdIDw8IDgpIHxcbiAgICB0aGlzW29mZnNldCArIDNdKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnRMRSA9IGZ1bmN0aW9uIHJlYWRJbnRMRSAob2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoIHwgMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIGJ5dGVMZW5ndGgsIHRoaXMubGVuZ3RoKVxuXG4gIHZhciB2YWwgPSB0aGlzW29mZnNldF1cbiAgdmFyIG11bCA9IDFcbiAgdmFyIGkgPSAwXG4gIHdoaWxlICgrK2kgPCBieXRlTGVuZ3RoICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgdmFsICs9IHRoaXNbb2Zmc2V0ICsgaV0gKiBtdWxcbiAgfVxuICBtdWwgKj0gMHg4MFxuXG4gIGlmICh2YWwgPj0gbXVsKSB2YWwgLT0gTWF0aC5wb3coMiwgOCAqIGJ5dGVMZW5ndGgpXG5cbiAgcmV0dXJuIHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnRCRSA9IGZ1bmN0aW9uIHJlYWRJbnRCRSAob2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoIHwgMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIGJ5dGVMZW5ndGgsIHRoaXMubGVuZ3RoKVxuXG4gIHZhciBpID0gYnl0ZUxlbmd0aFxuICB2YXIgbXVsID0gMVxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXQgKyAtLWldXG4gIHdoaWxlIChpID4gMCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIHZhbCArPSB0aGlzW29mZnNldCArIC0taV0gKiBtdWxcbiAgfVxuICBtdWwgKj0gMHg4MFxuXG4gIGlmICh2YWwgPj0gbXVsKSB2YWwgLT0gTWF0aC5wb3coMiwgOCAqIGJ5dGVMZW5ndGgpXG5cbiAgcmV0dXJuIHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQ4ID0gZnVuY3Rpb24gcmVhZEludDggKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCAxLCB0aGlzLmxlbmd0aClcbiAgaWYgKCEodGhpc1tvZmZzZXRdICYgMHg4MCkpIHJldHVybiAodGhpc1tvZmZzZXRdKVxuICByZXR1cm4gKCgweGZmIC0gdGhpc1tvZmZzZXRdICsgMSkgKiAtMSlcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50MTZMRSA9IGZ1bmN0aW9uIHJlYWRJbnQxNkxFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgMiwgdGhpcy5sZW5ndGgpXG4gIHZhciB2YWwgPSB0aGlzW29mZnNldF0gfCAodGhpc1tvZmZzZXQgKyAxXSA8PCA4KVxuICByZXR1cm4gKHZhbCAmIDB4ODAwMCkgPyB2YWwgfCAweEZGRkYwMDAwIDogdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDE2QkUgPSBmdW5jdGlvbiByZWFkSW50MTZCRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDIsIHRoaXMubGVuZ3RoKVxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXQgKyAxXSB8ICh0aGlzW29mZnNldF0gPDwgOClcbiAgcmV0dXJuICh2YWwgJiAweDgwMDApID8gdmFsIHwgMHhGRkZGMDAwMCA6IHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQzMkxFID0gZnVuY3Rpb24gcmVhZEludDMyTEUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA0LCB0aGlzLmxlbmd0aClcblxuICByZXR1cm4gKHRoaXNbb2Zmc2V0XSkgfFxuICAgICh0aGlzW29mZnNldCArIDFdIDw8IDgpIHxcbiAgICAodGhpc1tvZmZzZXQgKyAyXSA8PCAxNikgfFxuICAgICh0aGlzW29mZnNldCArIDNdIDw8IDI0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQzMkJFID0gZnVuY3Rpb24gcmVhZEludDMyQkUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA0LCB0aGlzLmxlbmd0aClcblxuICByZXR1cm4gKHRoaXNbb2Zmc2V0XSA8PCAyNCkgfFxuICAgICh0aGlzW29mZnNldCArIDFdIDw8IDE2KSB8XG4gICAgKHRoaXNbb2Zmc2V0ICsgMl0gPDwgOCkgfFxuICAgICh0aGlzW29mZnNldCArIDNdKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRGbG9hdExFID0gZnVuY3Rpb24gcmVhZEZsb2F0TEUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA0LCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuIGllZWU3NTQucmVhZCh0aGlzLCBvZmZzZXQsIHRydWUsIDIzLCA0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRGbG9hdEJFID0gZnVuY3Rpb24gcmVhZEZsb2F0QkUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA0LCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuIGllZWU3NTQucmVhZCh0aGlzLCBvZmZzZXQsIGZhbHNlLCAyMywgNClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkRG91YmxlTEUgPSBmdW5jdGlvbiByZWFkRG91YmxlTEUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA4LCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuIGllZWU3NTQucmVhZCh0aGlzLCBvZmZzZXQsIHRydWUsIDUyLCA4KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWREb3VibGVCRSA9IGZ1bmN0aW9uIHJlYWREb3VibGVCRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDgsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gaWVlZTc1NC5yZWFkKHRoaXMsIG9mZnNldCwgZmFsc2UsIDUyLCA4KVxufVxuXG5mdW5jdGlvbiBjaGVja0ludCAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBleHQsIG1heCwgbWluKSB7XG4gIGlmICghQnVmZmVyLmlzQnVmZmVyKGJ1ZikpIHRocm93IG5ldyBUeXBlRXJyb3IoJ1wiYnVmZmVyXCIgYXJndW1lbnQgbXVzdCBiZSBhIEJ1ZmZlciBpbnN0YW5jZScpXG4gIGlmICh2YWx1ZSA+IG1heCB8fCB2YWx1ZSA8IG1pbikgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ1widmFsdWVcIiBhcmd1bWVudCBpcyBvdXQgb2YgYm91bmRzJylcbiAgaWYgKG9mZnNldCArIGV4dCA+IGJ1Zi5sZW5ndGgpIHRocm93IG5ldyBSYW5nZUVycm9yKCdJbmRleCBvdXQgb2YgcmFuZ2UnKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludExFID0gZnVuY3Rpb24gd3JpdGVVSW50TEUgKHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGggfCAwXG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICB2YXIgbWF4Qnl0ZXMgPSBNYXRoLnBvdygyLCA4ICogYnl0ZUxlbmd0aCkgLSAxXG4gICAgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgbWF4Qnl0ZXMsIDApXG4gIH1cblxuICB2YXIgbXVsID0gMVxuICB2YXIgaSA9IDBcbiAgdGhpc1tvZmZzZXRdID0gdmFsdWUgJiAweEZGXG4gIHdoaWxlICgrK2kgPCBieXRlTGVuZ3RoICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgdGhpc1tvZmZzZXQgKyBpXSA9ICh2YWx1ZSAvIG11bCkgJiAweEZGXG4gIH1cblxuICByZXR1cm4gb2Zmc2V0ICsgYnl0ZUxlbmd0aFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludEJFID0gZnVuY3Rpb24gd3JpdGVVSW50QkUgKHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGggfCAwXG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICB2YXIgbWF4Qnl0ZXMgPSBNYXRoLnBvdygyLCA4ICogYnl0ZUxlbmd0aCkgLSAxXG4gICAgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgbWF4Qnl0ZXMsIDApXG4gIH1cblxuICB2YXIgaSA9IGJ5dGVMZW5ndGggLSAxXG4gIHZhciBtdWwgPSAxXG4gIHRoaXNbb2Zmc2V0ICsgaV0gPSB2YWx1ZSAmIDB4RkZcbiAgd2hpbGUgKC0taSA+PSAwICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgdGhpc1tvZmZzZXQgKyBpXSA9ICh2YWx1ZSAvIG11bCkgJiAweEZGXG4gIH1cblxuICByZXR1cm4gb2Zmc2V0ICsgYnl0ZUxlbmd0aFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDggPSBmdW5jdGlvbiB3cml0ZVVJbnQ4ICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDEsIDB4ZmYsIDApXG4gIGlmICghQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHZhbHVlID0gTWF0aC5mbG9vcih2YWx1ZSlcbiAgdGhpc1tvZmZzZXRdID0gKHZhbHVlICYgMHhmZilcbiAgcmV0dXJuIG9mZnNldCArIDFcbn1cblxuZnVuY3Rpb24gb2JqZWN0V3JpdGVVSW50MTYgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuKSB7XG4gIGlmICh2YWx1ZSA8IDApIHZhbHVlID0gMHhmZmZmICsgdmFsdWUgKyAxXG4gIGZvciAodmFyIGkgPSAwLCBqID0gTWF0aC5taW4oYnVmLmxlbmd0aCAtIG9mZnNldCwgMik7IGkgPCBqOyArK2kpIHtcbiAgICBidWZbb2Zmc2V0ICsgaV0gPSAodmFsdWUgJiAoMHhmZiA8PCAoOCAqIChsaXR0bGVFbmRpYW4gPyBpIDogMSAtIGkpKSkpID4+PlxuICAgICAgKGxpdHRsZUVuZGlhbiA/IGkgOiAxIC0gaSkgKiA4XG4gIH1cbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQxNkxFID0gZnVuY3Rpb24gd3JpdGVVSW50MTZMRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAyLCAweGZmZmYsIDApXG4gIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSAmIDB4ZmYpXG4gICAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSA+Pj4gOClcbiAgfSBlbHNlIHtcbiAgICBvYmplY3RXcml0ZVVJbnQxNih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlKVxuICB9XG4gIHJldHVybiBvZmZzZXQgKyAyXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MTZCRSA9IGZ1bmN0aW9uIHdyaXRlVUludDE2QkUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgMiwgMHhmZmZmLCAwKVxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICB0aGlzW29mZnNldF0gPSAodmFsdWUgPj4+IDgpXG4gICAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIH0gZWxzZSB7XG4gICAgb2JqZWN0V3JpdGVVSW50MTYodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UpXG4gIH1cbiAgcmV0dXJuIG9mZnNldCArIDJcbn1cblxuZnVuY3Rpb24gb2JqZWN0V3JpdGVVSW50MzIgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuKSB7XG4gIGlmICh2YWx1ZSA8IDApIHZhbHVlID0gMHhmZmZmZmZmZiArIHZhbHVlICsgMVxuICBmb3IgKHZhciBpID0gMCwgaiA9IE1hdGgubWluKGJ1Zi5sZW5ndGggLSBvZmZzZXQsIDQpOyBpIDwgajsgKytpKSB7XG4gICAgYnVmW29mZnNldCArIGldID0gKHZhbHVlID4+PiAobGl0dGxlRW5kaWFuID8gaSA6IDMgLSBpKSAqIDgpICYgMHhmZlxuICB9XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MzJMRSA9IGZ1bmN0aW9uIHdyaXRlVUludDMyTEUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgNCwgMHhmZmZmZmZmZiwgMClcbiAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgdGhpc1tvZmZzZXQgKyAzXSA9ICh2YWx1ZSA+Pj4gMjQpXG4gICAgdGhpc1tvZmZzZXQgKyAyXSA9ICh2YWx1ZSA+Pj4gMTYpXG4gICAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSA+Pj4gOClcbiAgICB0aGlzW29mZnNldF0gPSAodmFsdWUgJiAweGZmKVxuICB9IGVsc2Uge1xuICAgIG9iamVjdFdyaXRlVUludDMyKHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUpXG4gIH1cbiAgcmV0dXJuIG9mZnNldCArIDRcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQzMkJFID0gZnVuY3Rpb24gd3JpdGVVSW50MzJCRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCA0LCAweGZmZmZmZmZmLCAwKVxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICB0aGlzW29mZnNldF0gPSAodmFsdWUgPj4+IDI0KVxuICAgIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDE2KVxuICAgIHRoaXNbb2Zmc2V0ICsgMl0gPSAodmFsdWUgPj4+IDgpXG4gICAgdGhpc1tvZmZzZXQgKyAzXSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIH0gZWxzZSB7XG4gICAgb2JqZWN0V3JpdGVVSW50MzIodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UpXG4gIH1cbiAgcmV0dXJuIG9mZnNldCArIDRcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludExFID0gZnVuY3Rpb24gd3JpdGVJbnRMRSAodmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgdmFyIGxpbWl0ID0gTWF0aC5wb3coMiwgOCAqIGJ5dGVMZW5ndGggLSAxKVxuXG4gICAgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgbGltaXQgLSAxLCAtbGltaXQpXG4gIH1cblxuICB2YXIgaSA9IDBcbiAgdmFyIG11bCA9IDFcbiAgdmFyIHN1YiA9IDBcbiAgdGhpc1tvZmZzZXRdID0gdmFsdWUgJiAweEZGXG4gIHdoaWxlICgrK2kgPCBieXRlTGVuZ3RoICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgaWYgKHZhbHVlIDwgMCAmJiBzdWIgPT09IDAgJiYgdGhpc1tvZmZzZXQgKyBpIC0gMV0gIT09IDApIHtcbiAgICAgIHN1YiA9IDFcbiAgICB9XG4gICAgdGhpc1tvZmZzZXQgKyBpXSA9ICgodmFsdWUgLyBtdWwpID4+IDApIC0gc3ViICYgMHhGRlxuICB9XG5cbiAgcmV0dXJuIG9mZnNldCArIGJ5dGVMZW5ndGhcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludEJFID0gZnVuY3Rpb24gd3JpdGVJbnRCRSAodmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgdmFyIGxpbWl0ID0gTWF0aC5wb3coMiwgOCAqIGJ5dGVMZW5ndGggLSAxKVxuXG4gICAgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgbGltaXQgLSAxLCAtbGltaXQpXG4gIH1cblxuICB2YXIgaSA9IGJ5dGVMZW5ndGggLSAxXG4gIHZhciBtdWwgPSAxXG4gIHZhciBzdWIgPSAwXG4gIHRoaXNbb2Zmc2V0ICsgaV0gPSB2YWx1ZSAmIDB4RkZcbiAgd2hpbGUgKC0taSA+PSAwICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgaWYgKHZhbHVlIDwgMCAmJiBzdWIgPT09IDAgJiYgdGhpc1tvZmZzZXQgKyBpICsgMV0gIT09IDApIHtcbiAgICAgIHN1YiA9IDFcbiAgICB9XG4gICAgdGhpc1tvZmZzZXQgKyBpXSA9ICgodmFsdWUgLyBtdWwpID4+IDApIC0gc3ViICYgMHhGRlxuICB9XG5cbiAgcmV0dXJuIG9mZnNldCArIGJ5dGVMZW5ndGhcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDggPSBmdW5jdGlvbiB3cml0ZUludDggKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgMSwgMHg3ZiwgLTB4ODApXG4gIGlmICghQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHZhbHVlID0gTWF0aC5mbG9vcih2YWx1ZSlcbiAgaWYgKHZhbHVlIDwgMCkgdmFsdWUgPSAweGZmICsgdmFsdWUgKyAxXG4gIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIHJldHVybiBvZmZzZXQgKyAxXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQxNkxFID0gZnVuY3Rpb24gd3JpdGVJbnQxNkxFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDIsIDB4N2ZmZiwgLTB4ODAwMClcbiAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgdGhpc1tvZmZzZXRdID0gKHZhbHVlICYgMHhmZilcbiAgICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlID4+PiA4KVxuICB9IGVsc2Uge1xuICAgIG9iamVjdFdyaXRlVUludDE2KHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUpXG4gIH1cbiAgcmV0dXJuIG9mZnNldCArIDJcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDE2QkUgPSBmdW5jdGlvbiB3cml0ZUludDE2QkUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgMiwgMHg3ZmZmLCAtMHg4MDAwKVxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICB0aGlzW29mZnNldF0gPSAodmFsdWUgPj4+IDgpXG4gICAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIH0gZWxzZSB7XG4gICAgb2JqZWN0V3JpdGVVSW50MTYodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UpXG4gIH1cbiAgcmV0dXJuIG9mZnNldCArIDJcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDMyTEUgPSBmdW5jdGlvbiB3cml0ZUludDMyTEUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgNCwgMHg3ZmZmZmZmZiwgLTB4ODAwMDAwMDApXG4gIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSAmIDB4ZmYpXG4gICAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSA+Pj4gOClcbiAgICB0aGlzW29mZnNldCArIDJdID0gKHZhbHVlID4+PiAxNilcbiAgICB0aGlzW29mZnNldCArIDNdID0gKHZhbHVlID4+PiAyNClcbiAgfSBlbHNlIHtcbiAgICBvYmplY3RXcml0ZVVJbnQzMih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlKVxuICB9XG4gIHJldHVybiBvZmZzZXQgKyA0XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQzMkJFID0gZnVuY3Rpb24gd3JpdGVJbnQzMkJFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDQsIDB4N2ZmZmZmZmYsIC0weDgwMDAwMDAwKVxuICBpZiAodmFsdWUgPCAwKSB2YWx1ZSA9IDB4ZmZmZmZmZmYgKyB2YWx1ZSArIDFcbiAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgdGhpc1tvZmZzZXRdID0gKHZhbHVlID4+PiAyNClcbiAgICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlID4+PiAxNilcbiAgICB0aGlzW29mZnNldCArIDJdID0gKHZhbHVlID4+PiA4KVxuICAgIHRoaXNbb2Zmc2V0ICsgM10gPSAodmFsdWUgJiAweGZmKVxuICB9IGVsc2Uge1xuICAgIG9iamVjdFdyaXRlVUludDMyKHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlKVxuICB9XG4gIHJldHVybiBvZmZzZXQgKyA0XG59XG5cbmZ1bmN0aW9uIGNoZWNrSUVFRTc1NCAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBleHQsIG1heCwgbWluKSB7XG4gIGlmIChvZmZzZXQgKyBleHQgPiBidWYubGVuZ3RoKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignSW5kZXggb3V0IG9mIHJhbmdlJylcbiAgaWYgKG9mZnNldCA8IDApIHRocm93IG5ldyBSYW5nZUVycm9yKCdJbmRleCBvdXQgb2YgcmFuZ2UnKVxufVxuXG5mdW5jdGlvbiB3cml0ZUZsb2F0IChidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGNoZWNrSUVFRTc1NChidWYsIHZhbHVlLCBvZmZzZXQsIDQsIDMuNDAyODIzNDY2Mzg1Mjg4NmUrMzgsIC0zLjQwMjgyMzQ2NjM4NTI4ODZlKzM4KVxuICB9XG4gIGllZWU3NTQud3JpdGUoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIDIzLCA0KVxuICByZXR1cm4gb2Zmc2V0ICsgNFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlRmxvYXRMRSA9IGZ1bmN0aW9uIHdyaXRlRmxvYXRMRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIHdyaXRlRmxvYXQodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVGbG9hdEJFID0gZnVuY3Rpb24gd3JpdGVGbG9hdEJFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gd3JpdGVGbG9hdCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbmZ1bmN0aW9uIHdyaXRlRG91YmxlIChidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGNoZWNrSUVFRTc1NChidWYsIHZhbHVlLCBvZmZzZXQsIDgsIDEuNzk3NjkzMTM0ODYyMzE1N0UrMzA4LCAtMS43OTc2OTMxMzQ4NjIzMTU3RSszMDgpXG4gIH1cbiAgaWVlZTc1NC53cml0ZShidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgNTIsIDgpXG4gIHJldHVybiBvZmZzZXQgKyA4XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVEb3VibGVMRSA9IGZ1bmN0aW9uIHdyaXRlRG91YmxlTEUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiB3cml0ZURvdWJsZSh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZURvdWJsZUJFID0gZnVuY3Rpb24gd3JpdGVEb3VibGVCRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIHdyaXRlRG91YmxlKHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuLy8gY29weSh0YXJnZXRCdWZmZXIsIHRhcmdldFN0YXJ0PTAsIHNvdXJjZVN0YXJ0PTAsIHNvdXJjZUVuZD1idWZmZXIubGVuZ3RoKVxuQnVmZmVyLnByb3RvdHlwZS5jb3B5ID0gZnVuY3Rpb24gY29weSAodGFyZ2V0LCB0YXJnZXRTdGFydCwgc3RhcnQsIGVuZCkge1xuICBpZiAoIXN0YXJ0KSBzdGFydCA9IDBcbiAgaWYgKCFlbmQgJiYgZW5kICE9PSAwKSBlbmQgPSB0aGlzLmxlbmd0aFxuICBpZiAodGFyZ2V0U3RhcnQgPj0gdGFyZ2V0Lmxlbmd0aCkgdGFyZ2V0U3RhcnQgPSB0YXJnZXQubGVuZ3RoXG4gIGlmICghdGFyZ2V0U3RhcnQpIHRhcmdldFN0YXJ0ID0gMFxuICBpZiAoZW5kID4gMCAmJiBlbmQgPCBzdGFydCkgZW5kID0gc3RhcnRcblxuICAvLyBDb3B5IDAgYnl0ZXM7IHdlJ3JlIGRvbmVcbiAgaWYgKGVuZCA9PT0gc3RhcnQpIHJldHVybiAwXG4gIGlmICh0YXJnZXQubGVuZ3RoID09PSAwIHx8IHRoaXMubGVuZ3RoID09PSAwKSByZXR1cm4gMFxuXG4gIC8vIEZhdGFsIGVycm9yIGNvbmRpdGlvbnNcbiAgaWYgKHRhcmdldFN0YXJ0IDwgMCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCd0YXJnZXRTdGFydCBvdXQgb2YgYm91bmRzJylcbiAgfVxuICBpZiAoc3RhcnQgPCAwIHx8IHN0YXJ0ID49IHRoaXMubGVuZ3RoKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignc291cmNlU3RhcnQgb3V0IG9mIGJvdW5kcycpXG4gIGlmIChlbmQgPCAwKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignc291cmNlRW5kIG91dCBvZiBib3VuZHMnKVxuXG4gIC8vIEFyZSB3ZSBvb2I/XG4gIGlmIChlbmQgPiB0aGlzLmxlbmd0aCkgZW5kID0gdGhpcy5sZW5ndGhcbiAgaWYgKHRhcmdldC5sZW5ndGggLSB0YXJnZXRTdGFydCA8IGVuZCAtIHN0YXJ0KSB7XG4gICAgZW5kID0gdGFyZ2V0Lmxlbmd0aCAtIHRhcmdldFN0YXJ0ICsgc3RhcnRcbiAgfVxuXG4gIHZhciBsZW4gPSBlbmQgLSBzdGFydFxuICB2YXIgaVxuXG4gIGlmICh0aGlzID09PSB0YXJnZXQgJiYgc3RhcnQgPCB0YXJnZXRTdGFydCAmJiB0YXJnZXRTdGFydCA8IGVuZCkge1xuICAgIC8vIGRlc2NlbmRpbmcgY29weSBmcm9tIGVuZFxuICAgIGZvciAoaSA9IGxlbiAtIDE7IGkgPj0gMDsgLS1pKSB7XG4gICAgICB0YXJnZXRbaSArIHRhcmdldFN0YXJ0XSA9IHRoaXNbaSArIHN0YXJ0XVxuICAgIH1cbiAgfSBlbHNlIGlmIChsZW4gPCAxMDAwIHx8ICFCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIC8vIGFzY2VuZGluZyBjb3B5IGZyb20gc3RhcnRcbiAgICBmb3IgKGkgPSAwOyBpIDwgbGVuOyArK2kpIHtcbiAgICAgIHRhcmdldFtpICsgdGFyZ2V0U3RhcnRdID0gdGhpc1tpICsgc3RhcnRdXG4gICAgfVxuICB9IGVsc2Uge1xuICAgIFVpbnQ4QXJyYXkucHJvdG90eXBlLnNldC5jYWxsKFxuICAgICAgdGFyZ2V0LFxuICAgICAgdGhpcy5zdWJhcnJheShzdGFydCwgc3RhcnQgKyBsZW4pLFxuICAgICAgdGFyZ2V0U3RhcnRcbiAgICApXG4gIH1cblxuICByZXR1cm4gbGVuXG59XG5cbi8vIFVzYWdlOlxuLy8gICAgYnVmZmVyLmZpbGwobnVtYmVyWywgb2Zmc2V0WywgZW5kXV0pXG4vLyAgICBidWZmZXIuZmlsbChidWZmZXJbLCBvZmZzZXRbLCBlbmRdXSlcbi8vICAgIGJ1ZmZlci5maWxsKHN0cmluZ1ssIG9mZnNldFssIGVuZF1dWywgZW5jb2RpbmddKVxuQnVmZmVyLnByb3RvdHlwZS5maWxsID0gZnVuY3Rpb24gZmlsbCAodmFsLCBzdGFydCwgZW5kLCBlbmNvZGluZykge1xuICAvLyBIYW5kbGUgc3RyaW5nIGNhc2VzOlxuICBpZiAodHlwZW9mIHZhbCA9PT0gJ3N0cmluZycpIHtcbiAgICBpZiAodHlwZW9mIHN0YXJ0ID09PSAnc3RyaW5nJykge1xuICAgICAgZW5jb2RpbmcgPSBzdGFydFxuICAgICAgc3RhcnQgPSAwXG4gICAgICBlbmQgPSB0aGlzLmxlbmd0aFxuICAgIH0gZWxzZSBpZiAodHlwZW9mIGVuZCA9PT0gJ3N0cmluZycpIHtcbiAgICAgIGVuY29kaW5nID0gZW5kXG4gICAgICBlbmQgPSB0aGlzLmxlbmd0aFxuICAgIH1cbiAgICBpZiAodmFsLmxlbmd0aCA9PT0gMSkge1xuICAgICAgdmFyIGNvZGUgPSB2YWwuY2hhckNvZGVBdCgwKVxuICAgICAgaWYgKGNvZGUgPCAyNTYpIHtcbiAgICAgICAgdmFsID0gY29kZVxuICAgICAgfVxuICAgIH1cbiAgICBpZiAoZW5jb2RpbmcgIT09IHVuZGVmaW5lZCAmJiB0eXBlb2YgZW5jb2RpbmcgIT09ICdzdHJpbmcnKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdlbmNvZGluZyBtdXN0IGJlIGEgc3RyaW5nJylcbiAgICB9XG4gICAgaWYgKHR5cGVvZiBlbmNvZGluZyA9PT0gJ3N0cmluZycgJiYgIUJ1ZmZlci5pc0VuY29kaW5nKGVuY29kaW5nKSkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVW5rbm93biBlbmNvZGluZzogJyArIGVuY29kaW5nKVxuICAgIH1cbiAgfSBlbHNlIGlmICh0eXBlb2YgdmFsID09PSAnbnVtYmVyJykge1xuICAgIHZhbCA9IHZhbCAmIDI1NVxuICB9XG5cbiAgLy8gSW52YWxpZCByYW5nZXMgYXJlIG5vdCBzZXQgdG8gYSBkZWZhdWx0LCBzbyBjYW4gcmFuZ2UgY2hlY2sgZWFybHkuXG4gIGlmIChzdGFydCA8IDAgfHwgdGhpcy5sZW5ndGggPCBzdGFydCB8fCB0aGlzLmxlbmd0aCA8IGVuZCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdPdXQgb2YgcmFuZ2UgaW5kZXgnKVxuICB9XG5cbiAgaWYgKGVuZCA8PSBzdGFydCkge1xuICAgIHJldHVybiB0aGlzXG4gIH1cblxuICBzdGFydCA9IHN0YXJ0ID4+PiAwXG4gIGVuZCA9IGVuZCA9PT0gdW5kZWZpbmVkID8gdGhpcy5sZW5ndGggOiBlbmQgPj4+IDBcblxuICBpZiAoIXZhbCkgdmFsID0gMFxuXG4gIHZhciBpXG4gIGlmICh0eXBlb2YgdmFsID09PSAnbnVtYmVyJykge1xuICAgIGZvciAoaSA9IHN0YXJ0OyBpIDwgZW5kOyArK2kpIHtcbiAgICAgIHRoaXNbaV0gPSB2YWxcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgdmFyIGJ5dGVzID0gQnVmZmVyLmlzQnVmZmVyKHZhbClcbiAgICAgID8gdmFsXG4gICAgICA6IHV0ZjhUb0J5dGVzKG5ldyBCdWZmZXIodmFsLCBlbmNvZGluZykudG9TdHJpbmcoKSlcbiAgICB2YXIgbGVuID0gYnl0ZXMubGVuZ3RoXG4gICAgZm9yIChpID0gMDsgaSA8IGVuZCAtIHN0YXJ0OyArK2kpIHtcbiAgICAgIHRoaXNbaSArIHN0YXJ0XSA9IGJ5dGVzW2kgJSBsZW5dXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRoaXNcbn1cblxuLy8gSEVMUEVSIEZVTkNUSU9OU1xuLy8gPT09PT09PT09PT09PT09PVxuXG52YXIgSU5WQUxJRF9CQVNFNjRfUkUgPSAvW14rXFwvMC05QS1aYS16LV9dL2dcblxuZnVuY3Rpb24gYmFzZTY0Y2xlYW4gKHN0cikge1xuICAvLyBOb2RlIHN0cmlwcyBvdXQgaW52YWxpZCBjaGFyYWN0ZXJzIGxpa2UgXFxuIGFuZCBcXHQgZnJvbSB0aGUgc3RyaW5nLCBiYXNlNjQtanMgZG9lcyBub3RcbiAgc3RyID0gc3RyaW5ndHJpbShzdHIpLnJlcGxhY2UoSU5WQUxJRF9CQVNFNjRfUkUsICcnKVxuICAvLyBOb2RlIGNvbnZlcnRzIHN0cmluZ3Mgd2l0aCBsZW5ndGggPCAyIHRvICcnXG4gIGlmIChzdHIubGVuZ3RoIDwgMikgcmV0dXJuICcnXG4gIC8vIE5vZGUgYWxsb3dzIGZvciBub24tcGFkZGVkIGJhc2U2NCBzdHJpbmdzIChtaXNzaW5nIHRyYWlsaW5nID09PSksIGJhc2U2NC1qcyBkb2VzIG5vdFxuICB3aGlsZSAoc3RyLmxlbmd0aCAlIDQgIT09IDApIHtcbiAgICBzdHIgPSBzdHIgKyAnPSdcbiAgfVxuICByZXR1cm4gc3RyXG59XG5cbmZ1bmN0aW9uIHN0cmluZ3RyaW0gKHN0cikge1xuICBpZiAoc3RyLnRyaW0pIHJldHVybiBzdHIudHJpbSgpXG4gIHJldHVybiBzdHIucmVwbGFjZSgvXlxccyt8XFxzKyQvZywgJycpXG59XG5cbmZ1bmN0aW9uIHRvSGV4IChuKSB7XG4gIGlmIChuIDwgMTYpIHJldHVybiAnMCcgKyBuLnRvU3RyaW5nKDE2KVxuICByZXR1cm4gbi50b1N0cmluZygxNilcbn1cblxuZnVuY3Rpb24gdXRmOFRvQnl0ZXMgKHN0cmluZywgdW5pdHMpIHtcbiAgdW5pdHMgPSB1bml0cyB8fCBJbmZpbml0eVxuICB2YXIgY29kZVBvaW50XG4gIHZhciBsZW5ndGggPSBzdHJpbmcubGVuZ3RoXG4gIHZhciBsZWFkU3Vycm9nYXRlID0gbnVsbFxuICB2YXIgYnl0ZXMgPSBbXVxuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyArK2kpIHtcbiAgICBjb2RlUG9pbnQgPSBzdHJpbmcuY2hhckNvZGVBdChpKVxuXG4gICAgLy8gaXMgc3Vycm9nYXRlIGNvbXBvbmVudFxuICAgIGlmIChjb2RlUG9pbnQgPiAweEQ3RkYgJiYgY29kZVBvaW50IDwgMHhFMDAwKSB7XG4gICAgICAvLyBsYXN0IGNoYXIgd2FzIGEgbGVhZFxuICAgICAgaWYgKCFsZWFkU3Vycm9nYXRlKSB7XG4gICAgICAgIC8vIG5vIGxlYWQgeWV0XG4gICAgICAgIGlmIChjb2RlUG9pbnQgPiAweERCRkYpIHtcbiAgICAgICAgICAvLyB1bmV4cGVjdGVkIHRyYWlsXG4gICAgICAgICAgaWYgKCh1bml0cyAtPSAzKSA+IC0xKSBieXRlcy5wdXNoKDB4RUYsIDB4QkYsIDB4QkQpXG4gICAgICAgICAgY29udGludWVcbiAgICAgICAgfSBlbHNlIGlmIChpICsgMSA9PT0gbGVuZ3RoKSB7XG4gICAgICAgICAgLy8gdW5wYWlyZWQgbGVhZFxuICAgICAgICAgIGlmICgodW5pdHMgLT0gMykgPiAtMSkgYnl0ZXMucHVzaCgweEVGLCAweEJGLCAweEJEKVxuICAgICAgICAgIGNvbnRpbnVlXG4gICAgICAgIH1cblxuICAgICAgICAvLyB2YWxpZCBsZWFkXG4gICAgICAgIGxlYWRTdXJyb2dhdGUgPSBjb2RlUG9pbnRcblxuICAgICAgICBjb250aW51ZVxuICAgICAgfVxuXG4gICAgICAvLyAyIGxlYWRzIGluIGEgcm93XG4gICAgICBpZiAoY29kZVBvaW50IDwgMHhEQzAwKSB7XG4gICAgICAgIGlmICgodW5pdHMgLT0gMykgPiAtMSkgYnl0ZXMucHVzaCgweEVGLCAweEJGLCAweEJEKVxuICAgICAgICBsZWFkU3Vycm9nYXRlID0gY29kZVBvaW50XG4gICAgICAgIGNvbnRpbnVlXG4gICAgICB9XG5cbiAgICAgIC8vIHZhbGlkIHN1cnJvZ2F0ZSBwYWlyXG4gICAgICBjb2RlUG9pbnQgPSAobGVhZFN1cnJvZ2F0ZSAtIDB4RDgwMCA8PCAxMCB8IGNvZGVQb2ludCAtIDB4REMwMCkgKyAweDEwMDAwXG4gICAgfSBlbHNlIGlmIChsZWFkU3Vycm9nYXRlKSB7XG4gICAgICAvLyB2YWxpZCBibXAgY2hhciwgYnV0IGxhc3QgY2hhciB3YXMgYSBsZWFkXG4gICAgICBpZiAoKHVuaXRzIC09IDMpID4gLTEpIGJ5dGVzLnB1c2goMHhFRiwgMHhCRiwgMHhCRClcbiAgICB9XG5cbiAgICBsZWFkU3Vycm9nYXRlID0gbnVsbFxuXG4gICAgLy8gZW5jb2RlIHV0ZjhcbiAgICBpZiAoY29kZVBvaW50IDwgMHg4MCkge1xuICAgICAgaWYgKCh1bml0cyAtPSAxKSA8IDApIGJyZWFrXG4gICAgICBieXRlcy5wdXNoKGNvZGVQb2ludClcbiAgICB9IGVsc2UgaWYgKGNvZGVQb2ludCA8IDB4ODAwKSB7XG4gICAgICBpZiAoKHVuaXRzIC09IDIpIDwgMCkgYnJlYWtcbiAgICAgIGJ5dGVzLnB1c2goXG4gICAgICAgIGNvZGVQb2ludCA+PiAweDYgfCAweEMwLFxuICAgICAgICBjb2RlUG9pbnQgJiAweDNGIHwgMHg4MFxuICAgICAgKVxuICAgIH0gZWxzZSBpZiAoY29kZVBvaW50IDwgMHgxMDAwMCkge1xuICAgICAgaWYgKCh1bml0cyAtPSAzKSA8IDApIGJyZWFrXG4gICAgICBieXRlcy5wdXNoKFxuICAgICAgICBjb2RlUG9pbnQgPj4gMHhDIHwgMHhFMCxcbiAgICAgICAgY29kZVBvaW50ID4+IDB4NiAmIDB4M0YgfCAweDgwLFxuICAgICAgICBjb2RlUG9pbnQgJiAweDNGIHwgMHg4MFxuICAgICAgKVxuICAgIH0gZWxzZSBpZiAoY29kZVBvaW50IDwgMHgxMTAwMDApIHtcbiAgICAgIGlmICgodW5pdHMgLT0gNCkgPCAwKSBicmVha1xuICAgICAgYnl0ZXMucHVzaChcbiAgICAgICAgY29kZVBvaW50ID4+IDB4MTIgfCAweEYwLFxuICAgICAgICBjb2RlUG9pbnQgPj4gMHhDICYgMHgzRiB8IDB4ODAsXG4gICAgICAgIGNvZGVQb2ludCA+PiAweDYgJiAweDNGIHwgMHg4MCxcbiAgICAgICAgY29kZVBvaW50ICYgMHgzRiB8IDB4ODBcbiAgICAgIClcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIGNvZGUgcG9pbnQnKVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBieXRlc1xufVxuXG5mdW5jdGlvbiBhc2NpaVRvQnl0ZXMgKHN0cikge1xuICB2YXIgYnl0ZUFycmF5ID0gW11cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdHIubGVuZ3RoOyArK2kpIHtcbiAgICAvLyBOb2RlJ3MgY29kZSBzZWVtcyB0byBiZSBkb2luZyB0aGlzIGFuZCBub3QgJiAweDdGLi5cbiAgICBieXRlQXJyYXkucHVzaChzdHIuY2hhckNvZGVBdChpKSAmIDB4RkYpXG4gIH1cbiAgcmV0dXJuIGJ5dGVBcnJheVxufVxuXG5mdW5jdGlvbiB1dGYxNmxlVG9CeXRlcyAoc3RyLCB1bml0cykge1xuICB2YXIgYywgaGksIGxvXG4gIHZhciBieXRlQXJyYXkgPSBbXVxuICBmb3IgKHZhciBpID0gMDsgaSA8IHN0ci5sZW5ndGg7ICsraSkge1xuICAgIGlmICgodW5pdHMgLT0gMikgPCAwKSBicmVha1xuXG4gICAgYyA9IHN0ci5jaGFyQ29kZUF0KGkpXG4gICAgaGkgPSBjID4+IDhcbiAgICBsbyA9IGMgJSAyNTZcbiAgICBieXRlQXJyYXkucHVzaChsbylcbiAgICBieXRlQXJyYXkucHVzaChoaSlcbiAgfVxuXG4gIHJldHVybiBieXRlQXJyYXlcbn1cblxuZnVuY3Rpb24gYmFzZTY0VG9CeXRlcyAoc3RyKSB7XG4gIHJldHVybiBiYXNlNjQudG9CeXRlQXJyYXkoYmFzZTY0Y2xlYW4oc3RyKSlcbn1cblxuZnVuY3Rpb24gYmxpdEJ1ZmZlciAoc3JjLCBkc3QsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyArK2kpIHtcbiAgICBpZiAoKGkgKyBvZmZzZXQgPj0gZHN0Lmxlbmd0aCkgfHwgKGkgPj0gc3JjLmxlbmd0aCkpIGJyZWFrXG4gICAgZHN0W2kgKyBvZmZzZXRdID0gc3JjW2ldXG4gIH1cbiAgcmV0dXJuIGlcbn1cblxuZnVuY3Rpb24gaXNuYW4gKHZhbCkge1xuICByZXR1cm4gdmFsICE9PSB2YWwgLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1zZWxmLWNvbXBhcmVcbn1cbiIsIid1c2Ugc3RyaWN0J1xuXG5leHBvcnRzLmJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoXG5leHBvcnRzLnRvQnl0ZUFycmF5ID0gdG9CeXRlQXJyYXlcbmV4cG9ydHMuZnJvbUJ5dGVBcnJheSA9IGZyb21CeXRlQXJyYXlcblxudmFyIGxvb2t1cCA9IFtdXG52YXIgcmV2TG9va3VwID0gW11cbnZhciBBcnIgPSB0eXBlb2YgVWludDhBcnJheSAhPT0gJ3VuZGVmaW5lZCcgPyBVaW50OEFycmF5IDogQXJyYXlcblxudmFyIGNvZGUgPSAnQUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ejAxMjM0NTY3ODkrLydcbmZvciAodmFyIGkgPSAwLCBsZW4gPSBjb2RlLmxlbmd0aDsgaSA8IGxlbjsgKytpKSB7XG4gIGxvb2t1cFtpXSA9IGNvZGVbaV1cbiAgcmV2TG9va3VwW2NvZGUuY2hhckNvZGVBdChpKV0gPSBpXG59XG5cbnJldkxvb2t1cFsnLScuY2hhckNvZGVBdCgwKV0gPSA2MlxucmV2TG9va3VwWydfJy5jaGFyQ29kZUF0KDApXSA9IDYzXG5cbmZ1bmN0aW9uIHBsYWNlSG9sZGVyc0NvdW50IChiNjQpIHtcbiAgdmFyIGxlbiA9IGI2NC5sZW5ndGhcbiAgaWYgKGxlbiAlIDQgPiAwKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIHN0cmluZy4gTGVuZ3RoIG11c3QgYmUgYSBtdWx0aXBsZSBvZiA0JylcbiAgfVxuXG4gIC8vIHRoZSBudW1iZXIgb2YgZXF1YWwgc2lnbnMgKHBsYWNlIGhvbGRlcnMpXG4gIC8vIGlmIHRoZXJlIGFyZSB0d28gcGxhY2Vob2xkZXJzLCB0aGFuIHRoZSB0d28gY2hhcmFjdGVycyBiZWZvcmUgaXRcbiAgLy8gcmVwcmVzZW50IG9uZSBieXRlXG4gIC8vIGlmIHRoZXJlIGlzIG9ubHkgb25lLCB0aGVuIHRoZSB0aHJlZSBjaGFyYWN0ZXJzIGJlZm9yZSBpdCByZXByZXNlbnQgMiBieXRlc1xuICAvLyB0aGlzIGlzIGp1c3QgYSBjaGVhcCBoYWNrIHRvIG5vdCBkbyBpbmRleE9mIHR3aWNlXG4gIHJldHVybiBiNjRbbGVuIC0gMl0gPT09ICc9JyA/IDIgOiBiNjRbbGVuIC0gMV0gPT09ICc9JyA/IDEgOiAwXG59XG5cbmZ1bmN0aW9uIGJ5dGVMZW5ndGggKGI2NCkge1xuICAvLyBiYXNlNjQgaXMgNC8zICsgdXAgdG8gdHdvIGNoYXJhY3RlcnMgb2YgdGhlIG9yaWdpbmFsIGRhdGFcbiAgcmV0dXJuIGI2NC5sZW5ndGggKiAzIC8gNCAtIHBsYWNlSG9sZGVyc0NvdW50KGI2NClcbn1cblxuZnVuY3Rpb24gdG9CeXRlQXJyYXkgKGI2NCkge1xuICB2YXIgaSwgaiwgbCwgdG1wLCBwbGFjZUhvbGRlcnMsIGFyclxuICB2YXIgbGVuID0gYjY0Lmxlbmd0aFxuICBwbGFjZUhvbGRlcnMgPSBwbGFjZUhvbGRlcnNDb3VudChiNjQpXG5cbiAgYXJyID0gbmV3IEFycihsZW4gKiAzIC8gNCAtIHBsYWNlSG9sZGVycylcblxuICAvLyBpZiB0aGVyZSBhcmUgcGxhY2Vob2xkZXJzLCBvbmx5IGdldCB1cCB0byB0aGUgbGFzdCBjb21wbGV0ZSA0IGNoYXJzXG4gIGwgPSBwbGFjZUhvbGRlcnMgPiAwID8gbGVuIC0gNCA6IGxlblxuXG4gIHZhciBMID0gMFxuXG4gIGZvciAoaSA9IDAsIGogPSAwOyBpIDwgbDsgaSArPSA0LCBqICs9IDMpIHtcbiAgICB0bXAgPSAocmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkpXSA8PCAxOCkgfCAocmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkgKyAxKV0gPDwgMTIpIHwgKHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpICsgMildIDw8IDYpIHwgcmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkgKyAzKV1cbiAgICBhcnJbTCsrXSA9ICh0bXAgPj4gMTYpICYgMHhGRlxuICAgIGFycltMKytdID0gKHRtcCA+PiA4KSAmIDB4RkZcbiAgICBhcnJbTCsrXSA9IHRtcCAmIDB4RkZcbiAgfVxuXG4gIGlmIChwbGFjZUhvbGRlcnMgPT09IDIpIHtcbiAgICB0bXAgPSAocmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkpXSA8PCAyKSB8IChyZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSArIDEpXSA+PiA0KVxuICAgIGFycltMKytdID0gdG1wICYgMHhGRlxuICB9IGVsc2UgaWYgKHBsYWNlSG9sZGVycyA9PT0gMSkge1xuICAgIHRtcCA9IChyZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSldIDw8IDEwKSB8IChyZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSArIDEpXSA8PCA0KSB8IChyZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSArIDIpXSA+PiAyKVxuICAgIGFycltMKytdID0gKHRtcCA+PiA4KSAmIDB4RkZcbiAgICBhcnJbTCsrXSA9IHRtcCAmIDB4RkZcbiAgfVxuXG4gIHJldHVybiBhcnJcbn1cblxuZnVuY3Rpb24gdHJpcGxldFRvQmFzZTY0IChudW0pIHtcbiAgcmV0dXJuIGxvb2t1cFtudW0gPj4gMTggJiAweDNGXSArIGxvb2t1cFtudW0gPj4gMTIgJiAweDNGXSArIGxvb2t1cFtudW0gPj4gNiAmIDB4M0ZdICsgbG9va3VwW251bSAmIDB4M0ZdXG59XG5cbmZ1bmN0aW9uIGVuY29kZUNodW5rICh1aW50OCwgc3RhcnQsIGVuZCkge1xuICB2YXIgdG1wXG4gIHZhciBvdXRwdXQgPSBbXVxuICBmb3IgKHZhciBpID0gc3RhcnQ7IGkgPCBlbmQ7IGkgKz0gMykge1xuICAgIHRtcCA9ICh1aW50OFtpXSA8PCAxNikgKyAodWludDhbaSArIDFdIDw8IDgpICsgKHVpbnQ4W2kgKyAyXSlcbiAgICBvdXRwdXQucHVzaCh0cmlwbGV0VG9CYXNlNjQodG1wKSlcbiAgfVxuICByZXR1cm4gb3V0cHV0LmpvaW4oJycpXG59XG5cbmZ1bmN0aW9uIGZyb21CeXRlQXJyYXkgKHVpbnQ4KSB7XG4gIHZhciB0bXBcbiAgdmFyIGxlbiA9IHVpbnQ4Lmxlbmd0aFxuICB2YXIgZXh0cmFCeXRlcyA9IGxlbiAlIDMgLy8gaWYgd2UgaGF2ZSAxIGJ5dGUgbGVmdCwgcGFkIDIgYnl0ZXNcbiAgdmFyIG91dHB1dCA9ICcnXG4gIHZhciBwYXJ0cyA9IFtdXG4gIHZhciBtYXhDaHVua0xlbmd0aCA9IDE2MzgzIC8vIG11c3QgYmUgbXVsdGlwbGUgb2YgM1xuXG4gIC8vIGdvIHRocm91Z2ggdGhlIGFycmF5IGV2ZXJ5IHRocmVlIGJ5dGVzLCB3ZSdsbCBkZWFsIHdpdGggdHJhaWxpbmcgc3R1ZmYgbGF0ZXJcbiAgZm9yICh2YXIgaSA9IDAsIGxlbjIgPSBsZW4gLSBleHRyYUJ5dGVzOyBpIDwgbGVuMjsgaSArPSBtYXhDaHVua0xlbmd0aCkge1xuICAgIHBhcnRzLnB1c2goZW5jb2RlQ2h1bmsodWludDgsIGksIChpICsgbWF4Q2h1bmtMZW5ndGgpID4gbGVuMiA/IGxlbjIgOiAoaSArIG1heENodW5rTGVuZ3RoKSkpXG4gIH1cblxuICAvLyBwYWQgdGhlIGVuZCB3aXRoIHplcm9zLCBidXQgbWFrZSBzdXJlIHRvIG5vdCBmb3JnZXQgdGhlIGV4dHJhIGJ5dGVzXG4gIGlmIChleHRyYUJ5dGVzID09PSAxKSB7XG4gICAgdG1wID0gdWludDhbbGVuIC0gMV1cbiAgICBvdXRwdXQgKz0gbG9va3VwW3RtcCA+PiAyXVxuICAgIG91dHB1dCArPSBsb29rdXBbKHRtcCA8PCA0KSAmIDB4M0ZdXG4gICAgb3V0cHV0ICs9ICc9PSdcbiAgfSBlbHNlIGlmIChleHRyYUJ5dGVzID09PSAyKSB7XG4gICAgdG1wID0gKHVpbnQ4W2xlbiAtIDJdIDw8IDgpICsgKHVpbnQ4W2xlbiAtIDFdKVxuICAgIG91dHB1dCArPSBsb29rdXBbdG1wID4+IDEwXVxuICAgIG91dHB1dCArPSBsb29rdXBbKHRtcCA+PiA0KSAmIDB4M0ZdXG4gICAgb3V0cHV0ICs9IGxvb2t1cFsodG1wIDw8IDIpICYgMHgzRl1cbiAgICBvdXRwdXQgKz0gJz0nXG4gIH1cblxuICBwYXJ0cy5wdXNoKG91dHB1dClcblxuICByZXR1cm4gcGFydHMuam9pbignJylcbn1cbiIsImV4cG9ydHMucmVhZCA9IGZ1bmN0aW9uIChidWZmZXIsIG9mZnNldCwgaXNMRSwgbUxlbiwgbkJ5dGVzKSB7XG4gIHZhciBlLCBtXG4gIHZhciBlTGVuID0gbkJ5dGVzICogOCAtIG1MZW4gLSAxXG4gIHZhciBlTWF4ID0gKDEgPDwgZUxlbikgLSAxXG4gIHZhciBlQmlhcyA9IGVNYXggPj4gMVxuICB2YXIgbkJpdHMgPSAtN1xuICB2YXIgaSA9IGlzTEUgPyAobkJ5dGVzIC0gMSkgOiAwXG4gIHZhciBkID0gaXNMRSA/IC0xIDogMVxuICB2YXIgcyA9IGJ1ZmZlcltvZmZzZXQgKyBpXVxuXG4gIGkgKz0gZFxuXG4gIGUgPSBzICYgKCgxIDw8ICgtbkJpdHMpKSAtIDEpXG4gIHMgPj49ICgtbkJpdHMpXG4gIG5CaXRzICs9IGVMZW5cbiAgZm9yICg7IG5CaXRzID4gMDsgZSA9IGUgKiAyNTYgKyBidWZmZXJbb2Zmc2V0ICsgaV0sIGkgKz0gZCwgbkJpdHMgLT0gOCkge31cblxuICBtID0gZSAmICgoMSA8PCAoLW5CaXRzKSkgLSAxKVxuICBlID4+PSAoLW5CaXRzKVxuICBuQml0cyArPSBtTGVuXG4gIGZvciAoOyBuQml0cyA+IDA7IG0gPSBtICogMjU2ICsgYnVmZmVyW29mZnNldCArIGldLCBpICs9IGQsIG5CaXRzIC09IDgpIHt9XG5cbiAgaWYgKGUgPT09IDApIHtcbiAgICBlID0gMSAtIGVCaWFzXG4gIH0gZWxzZSBpZiAoZSA9PT0gZU1heCkge1xuICAgIHJldHVybiBtID8gTmFOIDogKChzID8gLTEgOiAxKSAqIEluZmluaXR5KVxuICB9IGVsc2Uge1xuICAgIG0gPSBtICsgTWF0aC5wb3coMiwgbUxlbilcbiAgICBlID0gZSAtIGVCaWFzXG4gIH1cbiAgcmV0dXJuIChzID8gLTEgOiAxKSAqIG0gKiBNYXRoLnBvdygyLCBlIC0gbUxlbilcbn1cblxuZXhwb3J0cy53cml0ZSA9IGZ1bmN0aW9uIChidWZmZXIsIHZhbHVlLCBvZmZzZXQsIGlzTEUsIG1MZW4sIG5CeXRlcykge1xuICB2YXIgZSwgbSwgY1xuICB2YXIgZUxlbiA9IG5CeXRlcyAqIDggLSBtTGVuIC0gMVxuICB2YXIgZU1heCA9ICgxIDw8IGVMZW4pIC0gMVxuICB2YXIgZUJpYXMgPSBlTWF4ID4+IDFcbiAgdmFyIHJ0ID0gKG1MZW4gPT09IDIzID8gTWF0aC5wb3coMiwgLTI0KSAtIE1hdGgucG93KDIsIC03NykgOiAwKVxuICB2YXIgaSA9IGlzTEUgPyAwIDogKG5CeXRlcyAtIDEpXG4gIHZhciBkID0gaXNMRSA/IDEgOiAtMVxuICB2YXIgcyA9IHZhbHVlIDwgMCB8fCAodmFsdWUgPT09IDAgJiYgMSAvIHZhbHVlIDwgMCkgPyAxIDogMFxuXG4gIHZhbHVlID0gTWF0aC5hYnModmFsdWUpXG5cbiAgaWYgKGlzTmFOKHZhbHVlKSB8fCB2YWx1ZSA9PT0gSW5maW5pdHkpIHtcbiAgICBtID0gaXNOYU4odmFsdWUpID8gMSA6IDBcbiAgICBlID0gZU1heFxuICB9IGVsc2Uge1xuICAgIGUgPSBNYXRoLmZsb29yKE1hdGgubG9nKHZhbHVlKSAvIE1hdGguTE4yKVxuICAgIGlmICh2YWx1ZSAqIChjID0gTWF0aC5wb3coMiwgLWUpKSA8IDEpIHtcbiAgICAgIGUtLVxuICAgICAgYyAqPSAyXG4gICAgfVxuICAgIGlmIChlICsgZUJpYXMgPj0gMSkge1xuICAgICAgdmFsdWUgKz0gcnQgLyBjXG4gICAgfSBlbHNlIHtcbiAgICAgIHZhbHVlICs9IHJ0ICogTWF0aC5wb3coMiwgMSAtIGVCaWFzKVxuICAgIH1cbiAgICBpZiAodmFsdWUgKiBjID49IDIpIHtcbiAgICAgIGUrK1xuICAgICAgYyAvPSAyXG4gICAgfVxuXG4gICAgaWYgKGUgKyBlQmlhcyA+PSBlTWF4KSB7XG4gICAgICBtID0gMFxuICAgICAgZSA9IGVNYXhcbiAgICB9IGVsc2UgaWYgKGUgKyBlQmlhcyA+PSAxKSB7XG4gICAgICBtID0gKHZhbHVlICogYyAtIDEpICogTWF0aC5wb3coMiwgbUxlbilcbiAgICAgIGUgPSBlICsgZUJpYXNcbiAgICB9IGVsc2Uge1xuICAgICAgbSA9IHZhbHVlICogTWF0aC5wb3coMiwgZUJpYXMgLSAxKSAqIE1hdGgucG93KDIsIG1MZW4pXG4gICAgICBlID0gMFxuICAgIH1cbiAgfVxuXG4gIGZvciAoOyBtTGVuID49IDg7IGJ1ZmZlcltvZmZzZXQgKyBpXSA9IG0gJiAweGZmLCBpICs9IGQsIG0gLz0gMjU2LCBtTGVuIC09IDgpIHt9XG5cbiAgZSA9IChlIDw8IG1MZW4pIHwgbVxuICBlTGVuICs9IG1MZW5cbiAgZm9yICg7IGVMZW4gPiAwOyBidWZmZXJbb2Zmc2V0ICsgaV0gPSBlICYgMHhmZiwgaSArPSBkLCBlIC89IDI1NiwgZUxlbiAtPSA4KSB7fVxuXG4gIGJ1ZmZlcltvZmZzZXQgKyBpIC0gZF0gfD0gcyAqIDEyOFxufVxuIiwidmFyIHRvU3RyaW5nID0ge30udG9TdHJpbmc7XG5cbm1vZHVsZS5leHBvcnRzID0gQXJyYXkuaXNBcnJheSB8fCBmdW5jdGlvbiAoYXJyKSB7XG4gIHJldHVybiB0b1N0cmluZy5jYWxsKGFycikgPT0gJ1tvYmplY3QgQXJyYXldJztcbn07XG4iLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcbnZhciBwcm9jZXNzID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcblxuLy8gY2FjaGVkIGZyb20gd2hhdGV2ZXIgZ2xvYmFsIGlzIHByZXNlbnQgc28gdGhhdCB0ZXN0IHJ1bm5lcnMgdGhhdCBzdHViIGl0XG4vLyBkb24ndCBicmVhayB0aGluZ3MuICBCdXQgd2UgbmVlZCB0byB3cmFwIGl0IGluIGEgdHJ5IGNhdGNoIGluIGNhc2UgaXQgaXNcbi8vIHdyYXBwZWQgaW4gc3RyaWN0IG1vZGUgY29kZSB3aGljaCBkb2Vzbid0IGRlZmluZSBhbnkgZ2xvYmFscy4gIEl0J3MgaW5zaWRlIGFcbi8vIGZ1bmN0aW9uIGJlY2F1c2UgdHJ5L2NhdGNoZXMgZGVvcHRpbWl6ZSBpbiBjZXJ0YWluIGVuZ2luZXMuXG5cbnZhciBjYWNoZWRTZXRUaW1lb3V0O1xudmFyIGNhY2hlZENsZWFyVGltZW91dDtcblxuZnVuY3Rpb24gZGVmYXVsdFNldFRpbW91dCgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3NldFRpbWVvdXQgaGFzIG5vdCBiZWVuIGRlZmluZWQnKTtcbn1cbmZ1bmN0aW9uIGRlZmF1bHRDbGVhclRpbWVvdXQgKCkge1xuICAgIHRocm93IG5ldyBFcnJvcignY2xlYXJUaW1lb3V0IGhhcyBub3QgYmVlbiBkZWZpbmVkJyk7XG59XG4oZnVuY3Rpb24gKCkge1xuICAgIHRyeSB7XG4gICAgICAgIGlmICh0eXBlb2Ygc2V0VGltZW91dCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IHNldFRpbWVvdXQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gZGVmYXVsdFNldFRpbW91dDtcbiAgICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IGRlZmF1bHRTZXRUaW1vdXQ7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIGlmICh0eXBlb2YgY2xlYXJUaW1lb3V0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBjbGVhclRpbWVvdXQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBkZWZhdWx0Q2xlYXJUaW1lb3V0O1xuICAgICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBkZWZhdWx0Q2xlYXJUaW1lb3V0O1xuICAgIH1cbn0gKCkpXG5mdW5jdGlvbiBydW5UaW1lb3V0KGZ1bikge1xuICAgIGlmIChjYWNoZWRTZXRUaW1lb3V0ID09PSBzZXRUaW1lb3V0KSB7XG4gICAgICAgIC8vbm9ybWFsIGVudmlyb21lbnRzIGluIHNhbmUgc2l0dWF0aW9uc1xuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW4sIDApO1xuICAgIH1cbiAgICAvLyBpZiBzZXRUaW1lb3V0IHdhc24ndCBhdmFpbGFibGUgYnV0IHdhcyBsYXR0ZXIgZGVmaW5lZFxuICAgIGlmICgoY2FjaGVkU2V0VGltZW91dCA9PT0gZGVmYXVsdFNldFRpbW91dCB8fCAhY2FjaGVkU2V0VGltZW91dCkgJiYgc2V0VGltZW91dCkge1xuICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gc2V0VGltZW91dDtcbiAgICAgICAgcmV0dXJuIHNldFRpbWVvdXQoZnVuLCAwKTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgLy8gd2hlbiB3aGVuIHNvbWVib2R5IGhhcyBzY3Jld2VkIHdpdGggc2V0VGltZW91dCBidXQgbm8gSS5FLiBtYWRkbmVzc1xuICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dChmdW4sIDApO1xuICAgIH0gY2F0Y2goZSl7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBXaGVuIHdlIGFyZSBpbiBJLkUuIGJ1dCB0aGUgc2NyaXB0IGhhcyBiZWVuIGV2YWxlZCBzbyBJLkUuIGRvZXNuJ3QgdHJ1c3QgdGhlIGdsb2JhbCBvYmplY3Qgd2hlbiBjYWxsZWQgbm9ybWFsbHlcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0LmNhbGwobnVsbCwgZnVuLCAwKTtcbiAgICAgICAgfSBjYXRjaChlKXtcbiAgICAgICAgICAgIC8vIHNhbWUgYXMgYWJvdmUgYnV0IHdoZW4gaXQncyBhIHZlcnNpb24gb2YgSS5FLiB0aGF0IG11c3QgaGF2ZSB0aGUgZ2xvYmFsIG9iamVjdCBmb3IgJ3RoaXMnLCBob3BmdWxseSBvdXIgY29udGV4dCBjb3JyZWN0IG90aGVyd2lzZSBpdCB3aWxsIHRocm93IGEgZ2xvYmFsIGVycm9yXG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dC5jYWxsKHRoaXMsIGZ1biwgMCk7XG4gICAgICAgIH1cbiAgICB9XG5cblxufVxuZnVuY3Rpb24gcnVuQ2xlYXJUaW1lb3V0KG1hcmtlcikge1xuICAgIGlmIChjYWNoZWRDbGVhclRpbWVvdXQgPT09IGNsZWFyVGltZW91dCkge1xuICAgICAgICAvL25vcm1hbCBlbnZpcm9tZW50cyBpbiBzYW5lIHNpdHVhdGlvbnNcbiAgICAgICAgcmV0dXJuIGNsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH1cbiAgICAvLyBpZiBjbGVhclRpbWVvdXQgd2Fzbid0IGF2YWlsYWJsZSBidXQgd2FzIGxhdHRlciBkZWZpbmVkXG4gICAgaWYgKChjYWNoZWRDbGVhclRpbWVvdXQgPT09IGRlZmF1bHRDbGVhclRpbWVvdXQgfHwgIWNhY2hlZENsZWFyVGltZW91dCkgJiYgY2xlYXJUaW1lb3V0KSB7XG4gICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGNsZWFyVGltZW91dDtcbiAgICAgICAgcmV0dXJuIGNsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICAvLyB3aGVuIHdoZW4gc29tZWJvZHkgaGFzIHNjcmV3ZWQgd2l0aCBzZXRUaW1lb3V0IGJ1dCBubyBJLkUuIG1hZGRuZXNzXG4gICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQobWFya2VyKTtcbiAgICB9IGNhdGNoIChlKXtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFdoZW4gd2UgYXJlIGluIEkuRS4gYnV0IHRoZSBzY3JpcHQgaGFzIGJlZW4gZXZhbGVkIHNvIEkuRS4gZG9lc24ndCAgdHJ1c3QgdGhlIGdsb2JhbCBvYmplY3Qgd2hlbiBjYWxsZWQgbm9ybWFsbHlcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQuY2FsbChudWxsLCBtYXJrZXIpO1xuICAgICAgICB9IGNhdGNoIChlKXtcbiAgICAgICAgICAgIC8vIHNhbWUgYXMgYWJvdmUgYnV0IHdoZW4gaXQncyBhIHZlcnNpb24gb2YgSS5FLiB0aGF0IG11c3QgaGF2ZSB0aGUgZ2xvYmFsIG9iamVjdCBmb3IgJ3RoaXMnLCBob3BmdWxseSBvdXIgY29udGV4dCBjb3JyZWN0IG90aGVyd2lzZSBpdCB3aWxsIHRocm93IGEgZ2xvYmFsIGVycm9yLlxuICAgICAgICAgICAgLy8gU29tZSB2ZXJzaW9ucyBvZiBJLkUuIGhhdmUgZGlmZmVyZW50IHJ1bGVzIGZvciBjbGVhclRpbWVvdXQgdnMgc2V0VGltZW91dFxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dC5jYWxsKHRoaXMsIG1hcmtlcik7XG4gICAgICAgIH1cbiAgICB9XG5cblxuXG59XG52YXIgcXVldWUgPSBbXTtcbnZhciBkcmFpbmluZyA9IGZhbHNlO1xudmFyIGN1cnJlbnRRdWV1ZTtcbnZhciBxdWV1ZUluZGV4ID0gLTE7XG5cbmZ1bmN0aW9uIGNsZWFuVXBOZXh0VGljaygpIHtcbiAgICBpZiAoIWRyYWluaW5nIHx8ICFjdXJyZW50UXVldWUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIGlmIChjdXJyZW50UXVldWUubGVuZ3RoKSB7XG4gICAgICAgIHF1ZXVlID0gY3VycmVudFF1ZXVlLmNvbmNhdChxdWV1ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcXVldWVJbmRleCA9IC0xO1xuICAgIH1cbiAgICBpZiAocXVldWUubGVuZ3RoKSB7XG4gICAgICAgIGRyYWluUXVldWUoKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGRyYWluUXVldWUoKSB7XG4gICAgaWYgKGRyYWluaW5nKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHRpbWVvdXQgPSBydW5UaW1lb3V0KGNsZWFuVXBOZXh0VGljayk7XG4gICAgZHJhaW5pbmcgPSB0cnVlO1xuXG4gICAgdmFyIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB3aGlsZShsZW4pIHtcbiAgICAgICAgY3VycmVudFF1ZXVlID0gcXVldWU7XG4gICAgICAgIHF1ZXVlID0gW107XG4gICAgICAgIHdoaWxlICgrK3F1ZXVlSW5kZXggPCBsZW4pIHtcbiAgICAgICAgICAgIGlmIChjdXJyZW50UXVldWUpIHtcbiAgICAgICAgICAgICAgICBjdXJyZW50UXVldWVbcXVldWVJbmRleF0ucnVuKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcXVldWVJbmRleCA9IC0xO1xuICAgICAgICBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgfVxuICAgIGN1cnJlbnRRdWV1ZSA9IG51bGw7XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbiAgICBydW5DbGVhclRpbWVvdXQodGltZW91dCk7XG59XG5cbnByb2Nlc3MubmV4dFRpY2sgPSBmdW5jdGlvbiAoZnVuKSB7XG4gICAgdmFyIGFyZ3MgPSBuZXcgQXJyYXkoYXJndW1lbnRzLmxlbmd0aCAtIDEpO1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSkge1xuICAgICAgICBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgIH1cbiAgICB9XG4gICAgcXVldWUucHVzaChuZXcgSXRlbShmdW4sIGFyZ3MpKTtcbiAgICBpZiAocXVldWUubGVuZ3RoID09PSAxICYmICFkcmFpbmluZykge1xuICAgICAgICBydW5UaW1lb3V0KGRyYWluUXVldWUpO1xuICAgIH1cbn07XG5cbi8vIHY4IGxpa2VzIHByZWRpY3RpYmxlIG9iamVjdHNcbmZ1bmN0aW9uIEl0ZW0oZnVuLCBhcnJheSkge1xuICAgIHRoaXMuZnVuID0gZnVuO1xuICAgIHRoaXMuYXJyYXkgPSBhcnJheTtcbn1cbkl0ZW0ucHJvdG90eXBlLnJ1biA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmZ1bi5hcHBseShudWxsLCB0aGlzLmFycmF5KTtcbn07XG5wcm9jZXNzLnRpdGxlID0gJ2Jyb3dzZXInO1xucHJvY2Vzcy5icm93c2VyID0gdHJ1ZTtcbnByb2Nlc3MuZW52ID0ge307XG5wcm9jZXNzLmFyZ3YgPSBbXTtcbnByb2Nlc3MudmVyc2lvbiA9ICcnOyAvLyBlbXB0eSBzdHJpbmcgdG8gYXZvaWQgcmVnZXhwIGlzc3Vlc1xucHJvY2Vzcy52ZXJzaW9ucyA9IHt9O1xuXG5mdW5jdGlvbiBub29wKCkge31cblxucHJvY2Vzcy5vbiA9IG5vb3A7XG5wcm9jZXNzLmFkZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3Mub25jZSA9IG5vb3A7XG5wcm9jZXNzLm9mZiA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUxpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlQWxsTGlzdGVuZXJzID0gbm9vcDtcbnByb2Nlc3MuZW1pdCA9IG5vb3A7XG5cbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcblxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5wcm9jZXNzLnVtYXNrID0gZnVuY3Rpb24oKSB7IHJldHVybiAwOyB9O1xuIiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxudmFyIGNsYXNzQ2FsbENoZWNrID0gZnVuY3Rpb24gKGluc3RhbmNlLCBDb25zdHJ1Y3Rvcikge1xyXG4gIGlmICghKGluc3RhbmNlIGluc3RhbmNlb2YgQ29uc3RydWN0b3IpKSB7XHJcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiQ2Fubm90IGNhbGwgYSBjbGFzcyBhcyBhIGZ1bmN0aW9uXCIpO1xyXG4gIH1cclxufTtcclxuXHJcbnZhciBjcmVhdGVDbGFzcyA9IGZ1bmN0aW9uICgpIHtcclxuICBmdW5jdGlvbiBkZWZpbmVQcm9wZXJ0aWVzKHRhcmdldCwgcHJvcHMpIHtcclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcHJvcHMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgdmFyIGRlc2NyaXB0b3IgPSBwcm9wc1tpXTtcclxuICAgICAgZGVzY3JpcHRvci5lbnVtZXJhYmxlID0gZGVzY3JpcHRvci5lbnVtZXJhYmxlIHx8IGZhbHNlO1xyXG4gICAgICBkZXNjcmlwdG9yLmNvbmZpZ3VyYWJsZSA9IHRydWU7XHJcbiAgICAgIGlmIChcInZhbHVlXCIgaW4gZGVzY3JpcHRvcikgZGVzY3JpcHRvci53cml0YWJsZSA9IHRydWU7XHJcbiAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0YXJnZXQsIGRlc2NyaXB0b3Iua2V5LCBkZXNjcmlwdG9yKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHJldHVybiBmdW5jdGlvbiAoQ29uc3RydWN0b3IsIHByb3RvUHJvcHMsIHN0YXRpY1Byb3BzKSB7XHJcbiAgICBpZiAocHJvdG9Qcm9wcykgZGVmaW5lUHJvcGVydGllcyhDb25zdHJ1Y3Rvci5wcm90b3R5cGUsIHByb3RvUHJvcHMpO1xyXG4gICAgaWYgKHN0YXRpY1Byb3BzKSBkZWZpbmVQcm9wZXJ0aWVzKENvbnN0cnVjdG9yLCBzdGF0aWNQcm9wcyk7XHJcbiAgICByZXR1cm4gQ29uc3RydWN0b3I7XHJcbiAgfTtcclxufSgpO1xyXG5cclxuXHJcblxyXG5cclxuXHJcblxyXG5cclxuXHJcblxyXG52YXIgaW5oZXJpdHMgPSBmdW5jdGlvbiAoc3ViQ2xhc3MsIHN1cGVyQ2xhc3MpIHtcclxuICBpZiAodHlwZW9mIHN1cGVyQ2xhc3MgIT09IFwiZnVuY3Rpb25cIiAmJiBzdXBlckNsYXNzICE9PSBudWxsKSB7XHJcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiU3VwZXIgZXhwcmVzc2lvbiBtdXN0IGVpdGhlciBiZSBudWxsIG9yIGEgZnVuY3Rpb24sIG5vdCBcIiArIHR5cGVvZiBzdXBlckNsYXNzKTtcclxuICB9XHJcblxyXG4gIHN1YkNsYXNzLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoc3VwZXJDbGFzcyAmJiBzdXBlckNsYXNzLnByb3RvdHlwZSwge1xyXG4gICAgY29uc3RydWN0b3I6IHtcclxuICAgICAgdmFsdWU6IHN1YkNsYXNzLFxyXG4gICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcclxuICAgICAgd3JpdGFibGU6IHRydWUsXHJcbiAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxyXG4gICAgfVxyXG4gIH0pO1xyXG4gIGlmIChzdXBlckNsYXNzKSBPYmplY3Quc2V0UHJvdG90eXBlT2YgPyBPYmplY3Quc2V0UHJvdG90eXBlT2Yoc3ViQ2xhc3MsIHN1cGVyQ2xhc3MpIDogc3ViQ2xhc3MuX19wcm90b19fID0gc3VwZXJDbGFzcztcclxufTtcclxuXHJcblxyXG5cclxuXHJcblxyXG5cclxuXHJcblxyXG5cclxuXHJcblxyXG52YXIgcG9zc2libGVDb25zdHJ1Y3RvclJldHVybiA9IGZ1bmN0aW9uIChzZWxmLCBjYWxsKSB7XHJcbiAgaWYgKCFzZWxmKSB7XHJcbiAgICB0aHJvdyBuZXcgUmVmZXJlbmNlRXJyb3IoXCJ0aGlzIGhhc24ndCBiZWVuIGluaXRpYWxpc2VkIC0gc3VwZXIoKSBoYXNuJ3QgYmVlbiBjYWxsZWRcIik7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gY2FsbCAmJiAodHlwZW9mIGNhbGwgPT09IFwib2JqZWN0XCIgfHwgdHlwZW9mIGNhbGwgPT09IFwiZnVuY3Rpb25cIikgPyBjYWxsIDogc2VsZjtcclxufTtcclxuXHJcbnZhciBFdmVudHMgPSBmdW5jdGlvbiAoKSB7XHJcblx0ZnVuY3Rpb24gRXZlbnRzKCkge1xyXG5cdFx0Y2xhc3NDYWxsQ2hlY2sodGhpcywgRXZlbnRzKTtcclxuXHJcblx0XHR0aGlzLmxpc3RlbmVycyA9IHt9O1xyXG5cdH1cclxuXHJcblx0Ly8gdGFrZSB0aGlzIGV2ZW50IG5hbWUsIGFuZCBydW4gdGhpcyBoYW5kbGVyIHdoZW4gaXQgb2NjdXJzXHJcblxyXG5cclxuXHRjcmVhdGVDbGFzcyhFdmVudHMsIFt7XHJcblx0XHRrZXk6IFwib25cIixcclxuXHRcdHZhbHVlOiBmdW5jdGlvbiBvbihldmVudCwgaGFuZGxlcikge1xyXG5cdFx0XHRpZiAodGhpcy5saXN0ZW5lcnNbZXZlbnRdID09PSB1bmRlZmluZWQpIHtcclxuXHRcdFx0XHR0aGlzLmxpc3RlbmVyc1tldmVudF0gPSBbaGFuZGxlcl07XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0dGhpcy5saXN0ZW5lcnNbZXZlbnRdLnB1c2goaGFuZGxlcik7XHJcblx0XHRcdH1cclxuXHRcdFx0cmV0dXJuIGhhbmRsZXI7XHJcblx0XHR9XHJcblx0fSwge1xyXG5cdFx0a2V5OiBcIm9mZlwiLFxyXG5cclxuXHJcblx0XHQvLyB1bmJpbmQgdGhpcyBldmVudCBhbmQgaGFuZGxlclxyXG5cdFx0dmFsdWU6IGZ1bmN0aW9uIG9mZihldmVudCkge1xyXG5cdFx0XHR2YXIgaGFuZGxlciA9IGFyZ3VtZW50cy5sZW5ndGggPiAxICYmIGFyZ3VtZW50c1sxXSAhPT0gdW5kZWZpbmVkID8gYXJndW1lbnRzWzFdIDogbnVsbDtcclxuXHJcblx0XHRcdGlmICh0aGlzLmxpc3RlbmVyc1tldmVudF0pIHtcclxuXHRcdFx0XHRpZiAoaGFuZGxlciA9PSBudWxsKSB7XHJcblx0XHRcdFx0XHRmb3IgKHZhciBpID0gdGhpcy5saXN0ZW5lcnNbZXZlbnRdLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XHJcblx0XHRcdFx0XHRcdGlmICh0aGlzLmxpc3RlbmVyc1tldmVudF0ubGVuZ3RoID09PSAxKSB7XHJcblx0XHRcdFx0XHRcdFx0ZGVsZXRlIHRoaXMubGlzdGVuZXJzW2V2ZW50XTtcclxuXHRcdFx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHRcdFx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdFx0XHR0aGlzLmxpc3RlbmVyc1tldmVudF0uc3BsaWNlKGksIDEpO1xyXG5cdFx0XHRcdFx0XHRcdHJldHVybiB0cnVlO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdGZvciAodmFyIF9pID0gMDsgX2kgPCB0aGlzLmxpc3RlbmVyc1tldmVudF0ubGVuZ3RoOyBfaSsrKSB7XHJcblx0XHRcdFx0XHRcdGlmICh0aGlzLmxpc3RlbmVyc1tldmVudF1bX2ldID09IGhhbmRsZXIpIHtcclxuXHRcdFx0XHRcdFx0XHR0aGlzLmxpc3RlbmVyc1tldmVudF0uc3BsaWNlKF9pLCAxKTtcclxuXHRcdFx0XHRcdFx0XHRpZiAodGhpcy5saXN0ZW5lcnNbZXZlbnRdLmxlbmd0aCA9PT0gMCkge1xyXG5cdFx0XHRcdFx0XHRcdFx0ZGVsZXRlIHRoaXMubGlzdGVuZXJzW2V2ZW50XTtcclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0fVxyXG5cdH0sIHtcclxuXHRcdGtleTogXCJ0cmlnZ2VyXCIsXHJcblx0XHR2YWx1ZTogZnVuY3Rpb24gdHJpZ2dlcihldmVudCwgZGF0YSkge1xyXG5cdFx0XHRpZiAodGhpcy5saXN0ZW5lcnNbZXZlbnRdKSB7XHJcblx0XHRcdFx0Zm9yICh2YXIgaSA9IHRoaXMubGlzdGVuZXJzW2V2ZW50XS5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xyXG5cdFx0XHRcdFx0aWYgKHRoaXMubGlzdGVuZXJzW2V2ZW50XSAhPT0gdW5kZWZpbmVkKSB7XHJcblx0XHRcdFx0XHRcdGlmICh0eXBlb2YgdGhpcy5saXN0ZW5lcnNbZXZlbnRdW2ldID09PSBcImZ1bmN0aW9uXCIgJiYgdGhpcy5saXN0ZW5lcnNbZXZlbnRdW2ldKSB7XHJcblx0XHRcdFx0XHRcdFx0dGhpcy5saXN0ZW5lcnNbZXZlbnRdW2ldKGRhdGEpO1xyXG5cdFx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0XHRcdHRocm93IFwiRXZlbnQgaGFuZGxlciBpcyBub3QgYSBmdW5jdGlvbi5cIjtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH1dKTtcclxuXHRyZXR1cm4gRXZlbnRzO1xyXG59KCk7XHJcblxyXG52YXIgR0xPQkFMX1RVTkUgPSA0NDA7XHJcbnZhciBNSURJXzE0QklUX01BWF9WQUxVRSA9IDE2Mzg0O1xyXG52YXIgTUlESV9NQVhfVkFMVUUgPSAxMjc7XHJcblxyXG52YXIgQ29udmVydCA9IGZ1bmN0aW9uICgpIHtcclxuXHRmdW5jdGlvbiBDb252ZXJ0KCkge1xyXG5cdFx0Y2xhc3NDYWxsQ2hlY2sodGhpcywgQ29udmVydCk7XHJcblx0fVxyXG5cclxuXHRjcmVhdGVDbGFzcyhDb252ZXJ0LCBudWxsLCBbe1xyXG5cdFx0a2V5OiBcIk1JRElOb3RlVG9GcmVxdWVuY3lcIixcclxuXHRcdHZhbHVlOiBmdW5jdGlvbiBNSURJTm90ZVRvRnJlcXVlbmN5KG1pZGlub3RlKSB7XHJcblx0XHRcdHZhciB0dW5lID0gYXJndW1lbnRzLmxlbmd0aCA+IDEgJiYgYXJndW1lbnRzWzFdICE9PSB1bmRlZmluZWQgPyBhcmd1bWVudHNbMV0gOiBHTE9CQUxfVFVORTtcclxuXHJcblx0XHRcdHJldHVybiB0dW5lICogTWF0aC5wb3coMiwgKG1pZGlub3RlIC0gNjkpIC8gMTIpOyAvL1xyXG5cdFx0fVxyXG5cdH0sIHtcclxuXHRcdGtleTogXCJQaXRjaFdoZWVsVG9Qb2xhclwiLFxyXG5cdFx0dmFsdWU6IGZ1bmN0aW9uIFBpdGNoV2hlZWxUb1BvbGFyKHJhdykge1xyXG5cdFx0XHRyZXR1cm4gLShNSURJXzE0QklUX01BWF9WQUxVRSAqIDAuNSAtIHJhdyk7XHJcblx0XHR9XHJcblx0fSwge1xyXG5cdFx0a2V5OiBcIlBpdGNoV2hlZWxUb1BvbGFyUmF0aW9cIixcclxuXHRcdHZhbHVlOiBmdW5jdGlvbiBQaXRjaFdoZWVsVG9Qb2xhclJhdGlvKHJhdykge1xyXG5cdFx0XHRyZXR1cm4gQ29udmVydC5QaXRjaFdoZWVsVG9Qb2xhcihyYXcpIC8gKE1JRElfMTRCSVRfTUFYX1ZBTFVFICogMC41KTtcclxuXHRcdH1cclxuXHR9LCB7XHJcblx0XHRrZXk6IFwiTWlkaVZhbHVlVG9SYXRpb1wiLFxyXG5cdFx0dmFsdWU6IGZ1bmN0aW9uIE1pZGlWYWx1ZVRvUmF0aW8odmFsdWUpIHtcclxuXHRcdFx0cmV0dXJuIHZhbHVlIC8gTUlESV9NQVhfVkFMVUU7XHJcblx0XHR9XHJcblx0fSwge1xyXG5cdFx0a2V5OiBcIk1pZGlWYWx1ZVRvUG9sYXJSYXRpb1wiLFxyXG5cdFx0dmFsdWU6IGZ1bmN0aW9uIE1pZGlWYWx1ZVRvUG9sYXJSYXRpbyh2YWx1ZSkge1xyXG5cdFx0XHR2YXIgaGFsZm1heCA9IE1JRElfTUFYX1ZBTFVFICogMC41O1xyXG5cdFx0XHRyZXR1cm4gLShoYWxmbWF4IC0gdmFsdWUpIC8gaGFsZm1heDtcclxuXHRcdH1cclxuXHR9XSk7XHJcblx0cmV0dXJuIENvbnZlcnQ7XHJcbn0oKTtcclxuXHJcbnZhciBNSURJX05PVEVfT04gPSAweDkwO1xyXG52YXIgTUlESV9OT1RFX09GRiA9IDB4ODA7XHJcbnZhciBNSURJX0FGVEVSVE9VQ0ggPSAweEEwO1xyXG52YXIgTUlESV9DT05UUk9MX0NIQU5HRSA9IDB4QjA7XHJcbnZhciBNSURJX1BST0dSQU1fQ0hBTkdFID0gMHhDMDtcclxudmFyIE1JRElfQ0hBTk5FTF9QUkVTU1VSRSA9IDB4RDA7XHJcbnZhciBNSURJX1BJVENIQkVORCA9IDB4RTA7XHJcblxyXG52YXIgTUlESV9NRVNTQUdFX0VWRU5UID0gXCJtaWRpbWVzc2FnZVwiO1xyXG5cclxudmFyIE5PVEVfT05fRVZFTlQgPSBcIk5vdGVPblwiO1xyXG52YXIgTk9URV9PRkZfRVZFTlQgPSBcIk5vdGVPZmZcIjtcclxudmFyIFBJVENIV0hFRUxfRVZFTlQgPSBcIlBpdGNoV2hlZWxcIjtcclxudmFyIENPTlRST0xMRVJfRVZFTlQgPSBcIkNvbnRyb2xsZXJcIjtcclxudmFyIFBST0dSQU1fQ0hBTkdFX0VWRU5UID0gXCJQcm9ncmFtQ2hhbmdlXCI7XHJcbnZhciBBRlRFUlRPVUNIX0VWRU5UID0gXCJBZnRlcnRvdWNoXCI7XHJcblxyXG52YXIgS0VZQk9BUkRfRVZFTlRfS0VZX0RPV04gPSBcImtleWRvd25cIjtcclxudmFyIEtFWUJPQVJEX0VWRU5UX0tFWV9VUCA9IFwia2V5dXBcIjtcclxuXHJcbnZhciBFTkhBUk1PTklDX0tFWVMgPSBbXCJDXCIsIFwiR1wiLCBcIkRcIiwgXCJBXCIsIFwiRVwiLCBcIkJcIiwgXCJDYlwiLCBcIkYjXCIsIFwiR2JcIiwgXCJDI1wiLCBcIkRiXCIsIFwiQWJcIiwgXCJFYlwiLCBcIkJiXCIsIFwiRlwiXTtcclxuXHJcbnZhciBNSURJX05PVEVfTUFQID0ge1xyXG5cdFwiQ1wiOiBbMCwgMTIsIDI0LCAzNiwgNDgsIDYwLCA3MiwgODQsIDk2LCAxMDgsIDEyMF0sXHJcblx0XCJEXCI6IFsyLCAxNCwgMjYsIDM4LCA1MCwgNjIsIDc0LCA4NiwgOTgsIDExMCwgMTIyXSxcclxuXHRcIkVcIjogWzQsIDE2LCAyOCwgNDAsIDUyLCA2NCwgNzYsIDg4LCAxMDAsIDExMiwgMTI0XSxcclxuXHRcIkZcIjogWzUsIDE3LCAyOSwgNDEsIDUzLCA2NSwgNzcsIDg5LCAxMDEsIDExMywgMTI1XSxcclxuXHRcIkdcIjogWzcsIDE5LCAzMSwgNDMsIDU1LCA2NywgNzksIDkxLCAxMDMsIDExNSwgMTI3XSxcclxuXHRcIkFcIjogWzksIDIxLCAzMywgNDUsIDU3LCA2OSwgODEsIDkzLCAxMDUsIDExN10sXHJcblx0XCJCXCI6IFsxMSwgMjMsIDM1LCA0NywgNTksIDcxLCA4MywgOTUsIDEwNywgMTE5XSxcclxuXHRcIkMjXCI6IFsxLCAxMywgMjUsIDM3LCA0OSwgNjEsIDczLCA4NSwgOTcsIDEwOSwgMTIxXSxcclxuXHRcIkQjXCI6IFszLCAxNSwgMjcsIDM5LCA1MSwgNjMsIDc1LCA4NywgOTksIDExMSwgMTIzXSxcclxuXHRcIkUjXCI6IFs1LCAxNywgMjksIDQxLCA1MywgNjUsIDc3LCA4OSwgMTAxLCAxMTMsIDEyNV0sXHJcblx0XCJGI1wiOiBbNiwgMTgsIDMwLCA0MiwgNTQsIDY2LCA3OCwgOTAsIDEwMiwgMTE0LCAxMjZdLFxyXG5cdFwiRyNcIjogWzgsIDIwLCAzMiwgNDQsIDU2LCA2OCwgODAsIDkyLCAxMDQsIDExNl0sXHJcblx0XCJBI1wiOiBbMTAsIDIyLCAzNCwgNDYsIDU4LCA3MCwgODIsIDk0LCAxMDYsIDExOF0sXHJcblx0XCJCI1wiOiBbMCwgMTIsIDI0LCAzNiwgNDgsIDYwLCA3MiwgODQsIDk2LCAxMDgsIDEyMF0sXHJcblx0XCJEYlwiOiBbMSwgMTMsIDI1LCAzNywgNDksIDYxLCA3MywgODUsIDk3LCAxMDksIDEyMV0sXHJcblx0XCJFYlwiOiBbMywgMTUsIDI3LCAzOSwgNTEsIDYzLCA3NSwgODcsIDk5LCAxMTEsIDEyM10sXHJcblx0XCJGYlwiOiBbNCwgMTYsIDI4LCA0MCwgNTIsIDY0LCA3NiwgODgsIDEwMCwgMTEyLCAxMjRdLFxyXG5cdFwiR2JcIjogWzYsIDE4LCAzMCwgNDIsIDU0LCA2NiwgNzgsIDkwLCAxMDIsIDExNCwgMTI2XSxcclxuXHRcIkFiXCI6IFs4LCAyMCwgMzIsIDQ0LCA1NiwgNjgsIDgwLCA5MiwgMTA0LCAxMTZdLFxyXG5cdFwiQmJcIjogWzEwLCAyMiwgMzQsIDQ2LCA1OCwgNzAsIDgyLCA5NCwgMTA2LCAxMThdLFxyXG5cdFwiQ2JcIjogWzExLCAyMywgMzUsIDQ3LCA1OSwgNzEsIDgzLCA5NSwgMTA3LCAxMTldXHJcbn07XHJcblxyXG5cclxuXHJcbnZhciBLRVlfTk9URV9BUlJBWVMgPSB7XHJcblx0XCJDXCI6IFtcIkNcIiwgXCJEXCIsIFwiRVwiLCBcIkZcIiwgXCJHXCIsIFwiQVwiLCBcIkJcIl0sXHJcblx0XCJHXCI6IFtcIkdcIiwgXCJBXCIsIFwiQlwiLCBcIkNcIiwgXCJEXCIsIFwiRVwiLCBcIkYjXCJdLFxyXG5cdFwiRFwiOiBbXCJEXCIsIFwiRVwiLCBcIkYjXCIsIFwiR1wiLCBcIkFcIiwgXCJCXCIsIFwiQyNcIl0sXHJcblx0XCJBXCI6IFtcIkFcIiwgXCJCXCIsIFwiQyNcIiwgXCJEXCIsIFwiRVwiLCBcIkYjXCIsIFwiRyNcIl0sXHJcblx0XCJFXCI6IFtcIkVcIiwgXCJGI1wiLCBcIkcjXCIsIFwiQVwiLCBcIkJcIiwgXCJDI1wiLCBcIkQjXCJdLFxyXG5cdFwiQlwiOiBbXCJCXCIsIFwiQyNcIiwgXCJEI1wiLCBcIkVcIiwgXCJGI1wiLCBcIkcjXCIsIFwiQSNcIl0sXHJcblx0XCJGI1wiOiBbXCJGI1wiLCBcIkcjXCIsIFwiQSNcIiwgXCJCXCIsIFwiQyNcIiwgXCJEI1wiLCBcIkUjXCJdLFxyXG5cdFwiQyNcIjogW1wiQyNcIiwgXCJEI1wiLCBcIkUjXCIsIFwiRiNcIiwgXCJHI1wiLCBcIkEjXCIsIFwiQiNcIl0sXHJcblx0XCJDYlwiOiBbXCJDYlwiLCBcIkRiXCIsIFwiRWJcIiwgXCJGYlwiLCBcIkdiXCIsIFwiQWJcIiwgXCJCYlwiXSxcclxuXHRcIkdiXCI6IFtcIkdiXCIsIFwiQWJcIiwgXCJCYlwiLCBcIkNiXCIsIFwiRGJcIiwgXCJFYlwiLCBcIkZcIl0sXHJcblx0XCJEYlwiOiBbXCJEYlwiLCBcIkViXCIsIFwiRlwiLCBcIkdiXCIsIFwiQWJcIiwgXCJCYlwiLCBcIkNcIl0sXHJcblx0XCJBYlwiOiBbXCJBYlwiLCBcIkJiXCIsIFwiQ1wiLCBcIkRiXCIsIFwiRWJcIiwgXCJGXCIsIFwiR1wiXSxcclxuXHRcIkViXCI6IFtcIkViXCIsIFwiRlwiLCBcIkdcIiwgXCJBYlwiLCBcIkJiXCIsIFwiQ1wiLCBcIkRcIl0sXHJcblx0XCJCYlwiOiBbXCJCYlwiLCBcIkNcIiwgXCJEXCIsIFwiRWJcIiwgXCJGXCIsIFwiR1wiLCBcIkFcIl0sXHJcblx0XCJGXCI6IFtcIkZcIiwgXCJHXCIsIFwiQVwiLCBcIkJiXCIsIFwiQ1wiLCBcIkRcIiwgXCJFXCJdXHJcbn07XHJcblxyXG52YXIgRGF0YVByb2Nlc3MgPSBmdW5jdGlvbiAoKSB7XHJcblx0ZnVuY3Rpb24gRGF0YVByb2Nlc3MoKSB7XHJcblx0XHRjbGFzc0NhbGxDaGVjayh0aGlzLCBEYXRhUHJvY2Vzcyk7XHJcblx0fVxyXG5cclxuXHRjcmVhdGVDbGFzcyhEYXRhUHJvY2VzcywgbnVsbCwgW3tcclxuXHRcdGtleTogXCJOb3RlRXZlbnRcIixcclxuXHJcblx0XHQvLyBhZGQgYWxsIG9mIG91ciBleHRyYSBkYXRhIHRvIHRoZSBNSURJIG1lc3NhZ2UgZXZlbnQuXHJcblx0XHR2YWx1ZTogZnVuY3Rpb24gTm90ZUV2ZW50KG1lc3NhZ2UpIHtcclxuXHRcdFx0dmFyIGtleSA9IGFyZ3VtZW50cy5sZW5ndGggPiAxICYmIGFyZ3VtZW50c1sxXSAhPT0gdW5kZWZpbmVkID8gYXJndW1lbnRzWzFdIDogRU5IQVJNT05JQ19LRVlTWzBdO1xyXG5cdFx0XHR2YXIgdHJhbnNwb3NlID0gYXJndW1lbnRzLmxlbmd0aCA+IDIgJiYgYXJndW1lbnRzWzJdICE9PSB1bmRlZmluZWQgPyBhcmd1bWVudHNbMl0gOiAwO1xyXG5cclxuXHRcdFx0dmFyIHZhbHVlID0gbWVzc2FnZS5kYXRhWzFdICsgdHJhbnNwb3NlO1xyXG5cdFx0XHR2YXIgbm90ZXMgPSB0aGlzLmdldE5vdGVOYW1lcyh2YWx1ZSk7XHJcblx0XHRcdHZhciBkYXRhID0ge1xyXG5cdFx0XHRcdFwiZW5oYXJtb25pY3NcIjogbm90ZXMsXHJcblx0XHRcdFx0XCJub3RlXCI6IERhdGFQcm9jZXNzLmZpbmROb3RlSW5LZXkobm90ZXMsIGtleSksXHJcblx0XHRcdFx0XCJpbktleVwiOiBEYXRhUHJvY2Vzcy5pc05vdGVJbktleShub3Rlcywga2V5KSxcclxuXHRcdFx0XHRcInZhbHVlXCI6IHZhbHVlLFxyXG5cdFx0XHRcdFwidmVsb2NpdHlcIjogbWVzc2FnZS5kYXRhWzJdLFxyXG5cdFx0XHRcdFwiZnJlcXVlbmN5XCI6IENvbnZlcnQuTUlESU5vdGVUb0ZyZXF1ZW5jeSh2YWx1ZSlcclxuXHRcdFx0fTtcclxuXHRcdFx0cmV0dXJuIE9iamVjdC5hc3NpZ24obWVzc2FnZSwgZGF0YSk7XHJcblx0XHR9XHJcblx0fSwge1xyXG5cdFx0a2V5OiBcIkNDRXZlbnRcIixcclxuXHJcblxyXG5cdFx0Ly8gYWRkIGFsbCBvZiBvdXIgZXh0cmEgZGF0YSB0byB0aGUgTUlESSBtZXNzYWdlIGV2ZW50LlxyXG5cdFx0dmFsdWU6IGZ1bmN0aW9uIENDRXZlbnQobWVzc2FnZSwgY2NOYW1lT3ZlcnJpZGUpIHtcclxuXHRcdFx0cmV0dXJuIE9iamVjdC5hc3NpZ24obWVzc2FnZSwge1xyXG5cdFx0XHRcdFwiY2NcIjogY2NOYW1lT3ZlcnJpZGUgfHwgbWVzc2FnZS5kYXRhWzFdLFxyXG5cdFx0XHRcdFwidmFsdWVcIjogbWVzc2FnZS5kYXRhWzJdLFxyXG5cdFx0XHRcdFwicmF0aW9cIjogQ29udmVydC5NaWRpVmFsdWVUb1JhdGlvKG1lc3NhZ2UuZGF0YVsyXSksXHJcblx0XHRcdFx0XCJwb2xhclJhdGlvXCI6IENvbnZlcnQuTWlkaVZhbHVlVG9Qb2xhclJhdGlvKG1lc3NhZ2UuZGF0YVsyXSlcclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gYWRkIGFsbCBvZiBvdXIgZXh0cmEgZGF0YSB0byB0aGUgTUlESSBtZXNzYWdlIGV2ZW50LlxyXG5cclxuXHR9LCB7XHJcblx0XHRrZXk6IFwiTWlkaUNvbnRyb2xFdmVudFwiLFxyXG5cdFx0dmFsdWU6IGZ1bmN0aW9uIE1pZGlDb250cm9sRXZlbnQobWVzc2FnZSwgY29udHJvbE5hbWUpIHtcclxuXHRcdFx0cmV0dXJuIE9iamVjdC5hc3NpZ24obWVzc2FnZSwge1xyXG5cdFx0XHRcdFwiY2NcIjogY29udHJvbE5hbWUsXHJcblx0XHRcdFx0XCJ2YWx1ZVwiOiBtZXNzYWdlLmRhdGFbMV0sXHJcblx0XHRcdFx0XCJyYXRpb1wiOiBDb252ZXJ0Lk1pZGlWYWx1ZVRvUmF0aW8obWVzc2FnZS5kYXRhWzJdKVxyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBhZGQgYWxsIG9mIG91ciBleHRyYSBkYXRhIHRvIHRoZSBNSURJIG1lc3NhZ2UgZXZlbnQuXHJcblxyXG5cdH0sIHtcclxuXHRcdGtleTogXCJQaXRjaFdoZWVsRXZlbnRcIixcclxuXHRcdHZhbHVlOiBmdW5jdGlvbiBQaXRjaFdoZWVsRXZlbnQobWVzc2FnZSkge1xyXG5cdFx0XHR2YXIgcmF3ID0gbWVzc2FnZS5kYXRhWzFdIHwgbWVzc2FnZS5kYXRhWzJdIDw8IDc7XHJcblx0XHRcdHJldHVybiBPYmplY3QuYXNzaWduKG1lc3NhZ2UsIHtcclxuXHRcdFx0XHRcImNjXCI6IFwicGl0Y2h3aGVlbFwiLFxyXG5cdFx0XHRcdFwidmFsdWVcIjogcmF3LFxyXG5cdFx0XHRcdFwicG9sYXJcIjogQ29udmVydC5QaXRjaFdoZWVsVG9Qb2xhcihyYXcpLFxyXG5cdFx0XHRcdFwicG9sYXJSYXRpb1wiOiBDb252ZXJ0LlBpdGNoV2hlZWxUb1BvbGFyUmF0aW8ocmF3KVxyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBwcm9jZXNzIHRoZSBtaWRpIG1lc3NhZ2UuIEdvIHRocm91Z2ggZWFjaCB0eXBlIGFuZCBhZGQgcHJvY2Vzc2VkIGRhdGFcclxuXHRcdC8vIHdoZW4gZG9uZSwgY2hlY2sgZm9yIGFueSBib3VuZCBldmVudHMgYW5kIHJ1biB0aGVtLlxyXG5cclxuXHRcdC8vIGdldCBhIGxpc3Qgb2Ygbm90ZXMgdGhhdCBtYXRjaCB0aGlzIG5vdGVOdW1iZXJcclxuXHJcblx0fSwge1xyXG5cdFx0a2V5OiBcImdldE5vdGVOYW1lc1wiLFxyXG5cdFx0dmFsdWU6IGZ1bmN0aW9uIGdldE5vdGVOYW1lcyhub3RlTnVtYmVyKSB7XHJcblx0XHRcdHZhciBub3RlTmFtZXMgPSBbXTsgLy8gY3JlYXRlIGEgbGlzdCBmb3IgdGhlIG5vdGVzXHJcblx0XHRcdGZvciAodmFyIG5vdGUgaW4gTUlESV9OT1RFX01BUCkge1xyXG5cdFx0XHRcdC8vIGxvb3AgdGhyb3VnaCB0aGUgbm90ZSB0YWJsZSBhbmQgcHVzaCBub3RlcyB0aGF0IG1hdGNoLlxyXG5cdFx0XHRcdE1JRElfTk9URV9NQVBbbm90ZV0uZm9yRWFjaChmdW5jdGlvbiAoa2V5bnVtYmVyKSB7XHJcblx0XHRcdFx0XHRpZiAobm90ZU51bWJlciA9PT0ga2V5bnVtYmVyKSB7XHJcblx0XHRcdFx0XHRcdG5vdGVOYW1lcy5wdXNoKG5vdGUpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblx0XHRcdHJldHVybiBub3RlTmFtZXM7XHJcblx0XHR9XHJcblx0fSwge1xyXG5cdFx0a2V5OiBcImZpbmROb3RlSW5LZXlcIixcclxuXHJcblxyXG5cdFx0Ly8gZmluZCB0aGUgZmlyc3Qgbm90ZSB0aGF0IGlzIGluIHRoZSBjdXJyZW50IGtleVxyXG5cdFx0dmFsdWU6IGZ1bmN0aW9uIGZpbmROb3RlSW5LZXkobm90ZXMsIGtleSkge1xyXG5cdFx0XHQvLyBsb29wIHRocm91Z2ggdGhlIG5vdGUgbGlzdFxyXG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IG5vdGVzLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdFx0dmFyIG5vdGUgPSBub3Rlc1tpXTtcclxuXHRcdFx0XHRpZiAoRGF0YVByb2Nlc3MubWF0Y2hOb3RlSW5LZXkobm90ZSwga2V5KSkge1xyXG5cdFx0XHRcdFx0cmV0dXJuIG5vdGU7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHRcdHJldHVybiBub3Rlc1swXTtcclxuXHRcdH1cclxuXHR9LCB7XHJcblx0XHRrZXk6IFwiaXNOb3RlSW5LZXlcIixcclxuXHJcblxyXG5cdFx0Ly8gaXMgdGhpcyBub3RlIGluIGtleVxyXG5cdFx0dmFsdWU6IGZ1bmN0aW9uIGlzTm90ZUluS2V5KG5vdGVzLCBrZXkpIHtcclxuXHRcdFx0Zm9yICh2YXIgbiA9IDA7IG4gPCBub3Rlcy5sZW5ndGg7IG4rKykge1xyXG5cdFx0XHRcdHZhciBub3RlID0gbm90ZXNbbl07XHJcblx0XHRcdFx0aWYgKHRoaXMubWF0Y2hOb3RlSW5LZXkobm90ZSwga2V5KSkge1xyXG5cdFx0XHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHRcdHJldHVybiBmYWxzZTtcclxuXHRcdH1cclxuXHR9LCB7XHJcblx0XHRrZXk6IFwibWF0Y2hOb3RlSW5LZXlcIixcclxuXHRcdHZhbHVlOiBmdW5jdGlvbiBtYXRjaE5vdGVJbktleShub3RlLCBrZXkpIHtcclxuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBLRVlfTk9URV9BUlJBWVNba2V5XS5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHRcdHZhciBrZXlub3RlID0gS0VZX05PVEVfQVJSQVlTW2tleV1baV07XHJcblx0XHRcdFx0aWYgKG5vdGUgPT09IGtleW5vdGUpIHtcclxuXHRcdFx0XHRcdHJldHVybiB0cnVlO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0XHRyZXR1cm4gZmFsc2U7XHJcblx0XHR9XHJcblx0fV0pO1xyXG5cdHJldHVybiBEYXRhUHJvY2VzcztcclxufSgpO1xyXG5cclxudmFyIEdlbmVyYXRlID0gZnVuY3Rpb24gKCkge1xyXG5cdGZ1bmN0aW9uIEdlbmVyYXRlKCkge1xyXG5cdFx0Y2xhc3NDYWxsQ2hlY2sodGhpcywgR2VuZXJhdGUpO1xyXG5cdH1cclxuXHJcblx0Y3JlYXRlQ2xhc3MoR2VuZXJhdGUsIG51bGwsIFt7XHJcblx0XHRrZXk6IFwiTm90ZU9uXCIsXHJcblx0XHR2YWx1ZTogZnVuY3Rpb24gTm90ZU9uKG5vdGVOdW1iZXIsIHZlbG9jaXR5KSB7XHJcblx0XHRcdHJldHVybiBuZXcgVWludDhBcnJheShbTUlESV9OT1RFX09OLCBub3RlTnVtYmVyLCB2ZWxvY2l0eV0pO1xyXG5cdFx0fVxyXG5cdH0sIHtcclxuXHRcdGtleTogXCJOb3RlT2ZmXCIsXHJcblx0XHR2YWx1ZTogZnVuY3Rpb24gTm90ZU9mZihub3RlTnVtYmVyLCB2ZWxvY2l0eSkge1xyXG5cdFx0XHRyZXR1cm4gbmV3IFVpbnQ4QXJyYXkoW01JRElfTk9URV9PRkYsIG5vdGVOdW1iZXIsIHZlbG9jaXR5XSk7XHJcblx0XHR9XHJcblx0fSwge1xyXG5cdFx0a2V5OiBcIkFmdGVyVG91Y2hcIixcclxuXHRcdHZhbHVlOiBmdW5jdGlvbiBBZnRlclRvdWNoKG5vdGVOdW1iZXIsIHZhbHVlKSB7XHJcblx0XHRcdHJldHVybiBuZXcgVWludDhBcnJheShbTUlESV9BRlRFUlRPVUNILCBub3RlTnVtYmVyLCB2YWx1ZV0pO1xyXG5cdFx0fVxyXG5cdH0sIHtcclxuXHRcdGtleTogXCJDQ1wiLFxyXG5cdFx0dmFsdWU6IGZ1bmN0aW9uIENDKGNvbnRyb2xsZXIsIHZhbHVlKSB7XHJcblx0XHRcdHJldHVybiBuZXcgVWludDhBcnJheShbTUlESV9DT05UUk9MX0NIQU5HRSwgY29udHJvbGxlciwgdmFsdWVdKTtcclxuXHRcdH1cclxuXHR9LCB7XHJcblx0XHRrZXk6IFwiUHJvZ3JhbUNoYW5nZVwiLFxyXG5cdFx0dmFsdWU6IGZ1bmN0aW9uIFByb2dyYW1DaGFuZ2UoaW5zdHJ1bWVudCkge1xyXG5cdFx0XHRyZXR1cm4gbmV3IFVpbnQ4QXJyYXkoW01JRElfUFJPR1JBTV9DSEFOR0UsIGluc3RydW1lbnRdKTtcclxuXHRcdH1cclxuXHR9LCB7XHJcblx0XHRrZXk6IFwiQ2hhbm5lbFByZXNzdXJlXCIsXHJcblx0XHR2YWx1ZTogZnVuY3Rpb24gQ2hhbm5lbFByZXNzdXJlKHByZXNzdXJlKSB7XHJcblx0XHRcdHJldHVybiBuZXcgVWludDhBcnJheShbTUlESV9DSEFOTkVMX1BSRVNTVVJFLCBwcmVzc3VyZV0pO1xyXG5cdFx0fVxyXG5cdH0sIHtcclxuXHRcdGtleTogXCJQaXRjaEJlbmRcIixcclxuXHRcdHZhbHVlOiBmdW5jdGlvbiBQaXRjaEJlbmQodmFsdWUpIHtcclxuXHRcdFx0dmFyIG1zYiA9IDAsXHJcblx0XHRcdCAgICBsc2IgPSAwO1xyXG5cdFx0XHRyZXR1cm4gbmV3IFVpbnQ4QXJyYXkoW01JRElfUElUQ0hCRU5ELCBtc2IsIGxzYl0pO1xyXG5cdFx0fVxyXG5cdH0sIHtcclxuXHRcdGtleTogXCJOb3RlRXZlbnRcIixcclxuXHRcdHZhbHVlOiBmdW5jdGlvbiBOb3RlRXZlbnQobWVzc2FnZVR5cGUsIHZhbHVlKSB7XHJcblx0XHRcdHZhciB2ZWxvY2l0eSA9IGFyZ3VtZW50cy5sZW5ndGggPiAyICYmIGFyZ3VtZW50c1syXSAhPT0gdW5kZWZpbmVkID8gYXJndW1lbnRzWzJdIDogMTI3O1xyXG5cclxuXHRcdFx0dmFyIGRhdGEgPSBudWxsO1xyXG5cdFx0XHRzd2l0Y2ggKG1lc3NhZ2VUeXBlKSB7XHJcblx0XHRcdFx0Y2FzZSBOT1RFX09OX0VWRU5UOlxyXG5cdFx0XHRcdFx0ZGF0YSA9IEdlbmVyYXRlLk5vdGVPbih2YWx1ZSwgdmVsb2NpdHkpO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0Y2FzZSBOT1RFX09GRl9FVkVOVDpcclxuXHRcdFx0XHRcdGRhdGEgPSBHZW5lcmF0ZS5Ob3RlT2ZmKHZhbHVlLCB2ZWxvY2l0eSk7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0fVxyXG5cdFx0XHR2YXIgbmV3TWVzc2FnZSA9IG5ldyBNSURJTWVzc2FnZUV2ZW50KE1JRElfTUVTU0FHRV9FVkVOVCwgeyBcImRhdGFcIjogZGF0YSB9KSB8fCB7IFwiZGF0YVwiOiBkYXRhIH07XHJcblx0XHRcdHJldHVybiBEYXRhUHJvY2Vzcy5Ob3RlRXZlbnQobmV3TWVzc2FnZSwgdGhpcy5rZXkpO1xyXG5cdFx0fVxyXG5cdH0sIHtcclxuXHRcdGtleTogXCJDQ0V2ZW50XCIsXHJcblx0XHR2YWx1ZTogZnVuY3Rpb24gQ0NFdmVudChjYywgdmFsdWUpIHtcclxuXHRcdFx0dmFyIGRhdGEgPSBHZW5lcmF0ZS5DQyhjYywgdmFsdWUpO1xyXG5cdFx0XHR2YXIgbmV3TWVzc2FnZSA9IG5ldyBNSURJTWVzc2FnZUV2ZW50KE1JRElfTUVTU0FHRV9FVkVOVCwgeyBcImRhdGFcIjogZGF0YSB9KTtcclxuXHRcdFx0cmV0dXJuIERhdGFQcm9jZXNzLkNDRXZlbnQobmV3TWVzc2FnZSk7XHJcblx0XHR9XHJcblx0fSwge1xyXG5cdFx0a2V5OiBcIlBpdGNoQmVuZEV2ZW50XCIsXHJcblx0XHR2YWx1ZTogZnVuY3Rpb24gUGl0Y2hCZW5kRXZlbnQodmFsdWUpIHtcclxuXHRcdFx0dmFyIGRhdGEgPSBHZW5lcmF0ZS5QaXRjaEJlbmQodmFsdWUpO1xyXG5cdFx0XHR2YXIgbmV3TWVzc2FnZSA9IG5ldyBNSURJTWVzc2FnZUV2ZW50KE1JRElfTUVTU0FHRV9FVkVOVCwgeyBcImRhdGFcIjogZGF0YSB9KTtcclxuXHRcdFx0cmV0dXJuIERhdGFQcm9jZXNzLkNDRXZlbnQobmV3TWVzc2FnZSk7XHJcblx0XHR9XHJcblx0fV0pO1xyXG5cdHJldHVybiBHZW5lcmF0ZTtcclxufSgpO1xyXG5cclxuLyoqXHJcbiAqIE1JRElFdmVudHMgLSBjb250YWlucyBhbGwgdGhlIGZ1bmN0aW9uYWxpdHkgZm9yIGJpbmRpbmcgYW5kIHJlbW92aW5nIE1JREkgZXZlbnRzXHJcbiAqL1xyXG52YXIgS0VZX0NPREVfTUFQID0ge1xyXG5cdFwiOTBcIjogNjAsXHJcblx0XCI4M1wiOiA2MSxcclxuXHRcIjg4XCI6IDYyLFxyXG5cdFwiNjhcIjogNjMsXHJcblx0XCI2N1wiOiA2NCxcclxuXHRcIjg2XCI6IDY1LFxyXG5cdFwiNzFcIjogNjYsXHJcblx0XCI2NlwiOiA2NyxcclxuXHRcIjcyXCI6IDY4LFxyXG5cdFwiNzhcIjogNjksXHJcblx0XCI3NFwiOiA3MCxcclxuXHRcIjc3XCI6IDcxLFxyXG5cdFwiMTg4XCI6IDcyXHJcbn07XHJcblxyXG52YXIgTUlESUV2ZW50cyA9IGZ1bmN0aW9uIChfRXZlbnRzKSB7XHJcblx0aW5oZXJpdHMoTUlESUV2ZW50cywgX0V2ZW50cyk7XHJcblxyXG5cdGZ1bmN0aW9uIE1JRElFdmVudHMoKSB7XHJcblx0XHRjbGFzc0NhbGxDaGVjayh0aGlzLCBNSURJRXZlbnRzKTtcclxuXHJcblx0XHR2YXIgX3RoaXMgPSBwb3NzaWJsZUNvbnN0cnVjdG9yUmV0dXJuKHRoaXMsIChNSURJRXZlbnRzLl9fcHJvdG9fXyB8fCBPYmplY3QuZ2V0UHJvdG90eXBlT2YoTUlESUV2ZW50cykpLmNhbGwodGhpcykpO1xyXG5cclxuXHRcdF90aGlzLmtleXNQcmVzc2VkID0gW107XHJcblx0XHRfdGhpcy5rZXlib2FkS2V5UHJlc3NlZCA9IFtdO1xyXG5cdFx0cmV0dXJuIF90aGlzO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcbiAgKiBvbk1JRElNZXNzYWdlIGhhbmRsZXMgYWxsIGluY29taW5nIG1pZGkgbWVzc2FnZXMsIHByb2Nlc3NlcyB0aGVtIGFuZCB0aGVuIHJvdXRlcyB0aGVtIHRvIHRoZSBjb3JyZWN0IGV2ZW50IGhhbmRsZXIuXHJcbiAgKiBAcGFyYW0gbWVzc2FnZVxyXG4gICogQHBhcmFtIGtleVxyXG4gICovXHJcblxyXG5cclxuXHRjcmVhdGVDbGFzcyhNSURJRXZlbnRzLCBbe1xyXG5cdFx0a2V5OiBcIm9uTUlESU1lc3NhZ2VcIixcclxuXHRcdHZhbHVlOiBmdW5jdGlvbiBvbk1JRElNZXNzYWdlKG1lc3NhZ2UpIHtcclxuXHRcdFx0dmFyIGtleSA9IGFyZ3VtZW50cy5sZW5ndGggPiAxICYmIGFyZ3VtZW50c1sxXSAhPT0gdW5kZWZpbmVkID8gYXJndW1lbnRzWzFdIDogRU5IQVJNT05JQ19LRVlTWzBdO1xyXG5cclxuXHRcdFx0dmFyIGV2ZW50TmFtZSA9IG51bGwsXHJcblx0XHRcdCAgICBkYXRhID0gbnVsbDtcclxuXHRcdFx0c3dpdGNoIChtZXNzYWdlLmRhdGFbMF0pIHtcclxuXHRcdFx0XHRjYXNlIDEyODpcclxuXHRcdFx0XHRcdGV2ZW50TmFtZSA9IE5PVEVfT0ZGX0VWRU5UO1xyXG5cdFx0XHRcdFx0ZGVsZXRlIHRoaXMua2V5c1ByZXNzZWRbbWVzc2FnZS5kYXRhWzFdXTtcclxuXHRcdFx0XHRcdGRhdGEgPSBEYXRhUHJvY2Vzcy5Ob3RlRXZlbnQobWVzc2FnZSwga2V5KTtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdGNhc2UgMTQ0OlxyXG5cdFx0XHRcdFx0Ly8gaGFuZGxlIDAgdmVsb2NpdHkgYXMgYSBub3RlIG9mZiBldmVudFxyXG5cdFx0XHRcdFx0aWYgKG1lc3NhZ2UuZGF0YVsyXSA+IDApIHtcclxuXHRcdFx0XHRcdFx0ZXZlbnROYW1lID0gTk9URV9PTl9FVkVOVDtcclxuXHRcdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRcdGV2ZW50TmFtZSA9IE5PVEVfT0ZGX0VWRU5UO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0ZGF0YSA9IERhdGFQcm9jZXNzLk5vdGVFdmVudChtZXNzYWdlLCBrZXkpO1xyXG5cdFx0XHRcdFx0aWYgKGV2ZW50TmFtZSA9PSBOT1RFX09OX0VWRU5UKSB7XHJcblx0XHRcdFx0XHRcdHRoaXMua2V5c1ByZXNzZWRbbWVzc2FnZS5kYXRhWzFdXSA9IGRhdGE7XHJcblx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0XHRkZWxldGUgdGhpcy5rZXlzUHJlc3NlZFttZXNzYWdlLmRhdGFbMV1dO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0Y2FzZSAxNzY6XHJcblx0XHRcdFx0XHRldmVudE5hbWUgPSBDT05UUk9MTEVSX0VWRU5UO1xyXG5cdFx0XHRcdFx0ZGF0YSA9IERhdGFQcm9jZXNzLkNDRXZlbnQobWVzc2FnZSk7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRjYXNlIDIyNDpcclxuXHRcdFx0XHRcdGV2ZW50TmFtZSA9IFBJVENIV0hFRUxfRVZFTlQ7XHJcblx0XHRcdFx0XHRkYXRhID0gRGF0YVByb2Nlc3MuUGl0Y2hXaGVlbEV2ZW50KG1lc3NhZ2UpO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0Y2FzZSAyMDg6XHJcblx0XHRcdFx0XHRldmVudE5hbWUgPSBBRlRFUlRPVUNIX0VWRU5UO1xyXG5cdFx0XHRcdFx0ZGF0YSA9IERhdGFQcm9jZXNzLk1pZGlDb250cm9sRXZlbnQobWVzc2FnZSwgZXZlbnROYW1lKTtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdGNhc2UgMTkyOlxyXG5cdFx0XHRcdFx0ZXZlbnROYW1lID0gUFJPR1JBTV9DSEFOR0VfRVZFTlQ7XHJcblx0XHRcdFx0XHRkYXRhID0gRGF0YVByb2Nlc3MuTWlkaUNvbnRyb2xFdmVudChtZXNzYWdlLCBldmVudE5hbWUpO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdH1cclxuXHRcdFx0Ly8gaWYgdGhlcmUgaXMgbm8gZXZlbnQgbmFtZSwgdGhlbiB3ZSBkb24ndCBzdXBwb3J0IHRoYXQgZXZlbnQgeWV0IHNvIGRvIG5vdGhpbmcuXHJcblx0XHRcdGlmIChldmVudE5hbWUgIT09IG51bGwpIHtcclxuXHRcdFx0XHR0aGlzLnRyaWdnZXIoZXZlbnROYW1lLCBkYXRhKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH0sIHtcclxuXHRcdGtleTogXCJvbkNDXCIsXHJcblxyXG5cclxuXHRcdC8qKlxyXG4gICAqIEVaIGJpbmRpbmcgZm9yIGEgc2luZ2xlIENvbnRyb2wgQ2hhbmdlIGRhdGEsIGp1c3QgcGFzcyBpbiB0aGUgQ0MgbnVtYmVyIGFuZCBoYW5kbGVyLiBUaGlzIHJldHVybnMgYW4gYW5vbnltb3VzIGZ1bmN0aW9uIHdoaWNoIHlvdSBzaG91bGQgc3RvcmUgYSByZWZlcmVuY2UgdG8gaWYgeW91IHdhbnQgdG8gdW5iaW5kIHRoaXMgQ0MgbGF0ZXIuXHJcbiAgICogQHBhcmFtIGNjXHJcbiAgICogQHBhcmFtIGhhbmRsZXJcclxuICAgKiBAcmV0dXJucyB7RnVuY3Rpb259XHJcbiAgICovXHJcblx0XHR2YWx1ZTogZnVuY3Rpb24gb25DQyhjYywgaGFuZGxlcikge1xyXG5cdFx0XHRyZXR1cm4gdGhpcy5vbihDT05UUk9MTEVSX0VWRU5ULCBmdW5jdGlvbiAoZGF0YSkge1xyXG5cdFx0XHRcdGlmIChkYXRhLmNjID09IGNjKSB7XHJcblx0XHRcdFx0XHRoYW5kbGVyKGRhdGEpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblxyXG5cdFx0LyoqXHJcbiAgICogVGFrZXMgdGhlIENDIyBhbmQgRXZlbnQgaGFuZGxlciBhbmQgcmVtb3ZlcyB0aGUgZXZlbnQgZnJvbSB0aGUgbGlzdGVuZXJzLlxyXG4gICAqIEBwYXJhbSBoYW5kbGVyXHJcbiAgICogQHJldHVybnMge0Jvb2xlYW59XHJcbiAgICovXHJcblxyXG5cdH0sIHtcclxuXHRcdGtleTogXCJyZW1vdmVDQ1wiLFxyXG5cdFx0dmFsdWU6IGZ1bmN0aW9uIHJlbW92ZUNDKGhhbmRsZXIpIHtcclxuXHRcdFx0cmV0dXJuIHRoaXMub2ZmKENPTlRST0xMRVJfRVZFTlQsIGhhbmRsZXIpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8qKlxyXG4gICAqIEtleVRvZ2dsZSB3aWxsIGJpbmQgdG8gYWxsIE1JREkgbm90ZSBldmVudHMgYW5kIGV4ZWN1dGUgdGhlIGBrZXlEb3duYCBoYW5kbGVyIHdoZW4gdGhlIGtleSBpcyBwcmVzc2VkIGFuZCBga2V5VXBgIGhhbmRsZXIgd2hlbiB0aGUga2V5IGlzIHJlbGVhc2VkLiBUaGlzIGZ1bmN0aW9uIHJldHVybnMgdGhlIHJlZmVyZW5jZSB0byB0aGUgaGFuZGxlcnMgY3JlYXRlZCBmb3IgdGhlc2UgZXZlbnRzLiBQYXNzIHRoaXMgcmVmZXJlbmNlIGludG8gcmVtb3ZlS2V5VG9nZ2xlIHRvIHVuYmluZCB0aGVzZSBldmVudHMuXHJcbiAgICpcclxuICAgKiAjIyMgVXNhZ2VcclxuICAgKiBgYGBcclxuICAgKiB2YXIgbSA9IG5ldyBNaXp6eSgpO1xyXG4gICAqIHZhciB0b2dnbGVLZXlzID0gbS5rZXlUb2dnbGUoKGUpID0+IGNvbnNvbGUubG9nKGUpLChlKSA9PiBjb25zb2xlLmxvZyhlKSk7XHJcbiAgICogLy8gd2hlbiByZWFkeSB0byB1bmJpbmRcclxuICAgKiBtLnJlbW92ZUtleVRvZ2dsZSh0b2dnbGVLZXlzKTtcclxuICAgKiBgYGBcclxuICAgKlxyXG4gICAqIEBwYXJhbSBoYW5kbGVyT25cclxuICAgKiBAcGFyYW0gaGFuZGxlck9mZlxyXG4gICAqIEByZXR1cm5zIHt7b246IEZ1bmN0aW9uLCBvZmY6IEZ1bmN0aW9ufX1cclxuICAgKi9cclxuXHJcblx0fSwge1xyXG5cdFx0a2V5OiBcImtleVRvZ2dsZVwiLFxyXG5cdFx0dmFsdWU6IGZ1bmN0aW9uIGtleVRvZ2dsZShrZXlEb3duLCBrZXlVcCkge1xyXG5cdFx0XHRyZXR1cm4ge1xyXG5cdFx0XHRcdGtleURvd246IHRoaXMub24oTk9URV9PTl9FVkVOVCwga2V5RG93biksXHJcblx0XHRcdFx0a2V5VXA6IHRoaXMub24oTk9URV9PRkZfRVZFTlQsIGtleVVwKVxyXG5cdFx0XHR9O1xyXG5cdFx0fVxyXG5cdH0sIHtcclxuXHRcdGtleTogXCJyZW1vdmVLZXlUb2dnbGVcIixcclxuXHJcblxyXG5cdFx0LyoqXHJcbiAgICogVGhpcyB3aWxsIHVuYmluZCB0aGUga2V5VG9nZ2xlLiBQYXNzIGluIHRoZSByZWZlcmVuY2UgY3JlYXRlZCB3aGVuIHlvdSBjYWxsZWQgYGtleVRvZ2dsZSgpYFxyXG4gICAqIEBwYXJhbSB0b2dnbGVzXHJcbiAgICovXHJcblx0XHR2YWx1ZTogZnVuY3Rpb24gcmVtb3ZlS2V5VG9nZ2xlKHRvZ2dsZXMpIHtcclxuXHRcdFx0dGhpcy5vZmYoTk9URV9PTl9FVkVOVCwgdG9nZ2xlcy5rZXlEb3duKTtcclxuXHRcdFx0dGhpcy5vZmYoTk9URV9PRkZfRVZFTlQsIHRvZ2dsZXMua2V5VXApO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8qKlxyXG4gICAqIEVaIGJpbmRpbmcgZm9yIGluZGl2aWR1YWwga2V5IHZhbHVlcy4gUGFzcyBpbiB0aGUgbm90ZSBudW1iZXIgeW91IHdhbnQgdG8gd2FpdCBmb3IgKGllIDYwID0gbWlkZGxlIGMpIGFuZCB0aGUgaGFuZGxlciBmb3IgaXQuIFRoaXMgZnVuY3Rpb24gd2lsbCByZXR1cm4gYSByZWZlcmVuY2UgdG8gdGhlIGhhbmRsZXIgY3JlYXRlZCBmb3IgdGhpcyBub3RlLlxyXG4gICAqIEBwYXJhbSBudW1iZXJcclxuICAgKiBAcGFyYW0gaGFuZGxlclxyXG4gICAqIEByZXR1cm5zIHtGdW5jdGlvbn1cclxuICAgKi9cclxuXHJcblx0fSwge1xyXG5cdFx0a2V5OiBcInByZXNzTm90ZU51bWJlclwiLFxyXG5cdFx0dmFsdWU6IGZ1bmN0aW9uIHByZXNzTm90ZU51bWJlcihudW1iZXIsIGhhbmRsZXIpIHtcclxuXHRcdFx0cmV0dXJuIHRoaXMub24oTk9URV9PTl9FVkVOVCwgZnVuY3Rpb24gKGRhdGEpIHtcclxuXHRcdFx0XHRpZiAoZGF0YS52YWx1ZSA9PSBudW1iZXIpIHtcclxuXHRcdFx0XHRcdGhhbmRsZXIoZGF0YSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHR9LCB7XHJcblx0XHRrZXk6IFwicmVtb3ZlUHJlc3NOb3RlTnVtYmVyXCIsXHJcblx0XHR2YWx1ZTogZnVuY3Rpb24gcmVtb3ZlUHJlc3NOb3RlTnVtYmVyKGhhbmRsZXIpIHtcclxuXHRcdFx0cmV0dXJuIHRoaXMub2ZmKE5PVEVfT05fRVZFTlQsIGhhbmRsZXIpO1xyXG5cdFx0fVxyXG5cdFx0Ly8gRVogYmluZGluZyBmb3Iga2V5IHZhbHVlcy4gQ2FuIG9ubHkgYmUgdW5ib3VuZCB3aXRoIHVuYmluZEFMTCgpXHJcblxyXG5cdH0sIHtcclxuXHRcdGtleTogXCJyZWxlYXNlTm90ZU51bWJlclwiLFxyXG5cdFx0dmFsdWU6IGZ1bmN0aW9uIHJlbGVhc2VOb3RlTnVtYmVyKG51bWJlciwgaGFuZGxlcikge1xyXG5cdFx0XHRyZXR1cm4gdGhpcy5vbihOT1RFX09GRl9FVkVOVCwgZnVuY3Rpb24gKGRhdGEpIHtcclxuXHRcdFx0XHRpZiAoZGF0YS52YWx1ZSA9PSBudW1iZXIpIHtcclxuXHRcdFx0XHRcdGhhbmRsZXIoZGF0YSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHR9LCB7XHJcblx0XHRrZXk6IFwicmVtb3ZlUmVsZWFzZU5vdGVOdW1iZXJcIixcclxuXHRcdHZhbHVlOiBmdW5jdGlvbiByZW1vdmVSZWxlYXNlTm90ZU51bWJlcihoYW5kbGVyKSB7XHJcblx0XHRcdHJldHVybiB0aGlzLm9mZihOT1RFX09GRl9FVkVOVCwgaGFuZGxlcik7XHJcblx0XHR9XHJcblxyXG5cdFx0LyoqXHJcbiAgICogQmluZCBrZXlib2FyZCBzcGxpdHMuIFxyXG4gICAqIEBwYXJhbSBtaW5cclxuICAgKiBAcGFyYW0gbWF4XHJcbiAgICogQHBhcmFtIG9uSGFuZGxlclxyXG4gICAqIEBwYXJhbSBvZmZIYW5kbGVyXHJcbiAgICogQHJldHVybnMge3tvblJhbmdlOiBBcnJheSwgb2ZmUmFuZ2U6IEFycmF5fX1cclxuICAgKi9cclxuXHJcblx0fSwge1xyXG5cdFx0a2V5OiBcImtleVRvZ2dsZVJhbmdlXCIsXHJcblx0XHR2YWx1ZTogZnVuY3Rpb24ga2V5VG9nZ2xlUmFuZ2UobWluLCBtYXgsIG9uSGFuZGxlciwgb2ZmSGFuZGxlcikge1xyXG5cdFx0XHRyZXR1cm4ge1xyXG5cdFx0XHRcdHByZXNzOiB0aGlzLm9uU3BsaXQobWluLCBtYXgsIG9uSGFuZGxlciksXHJcblx0XHRcdFx0cmVsZWFzZTogdGhpcy5vZmZTcGxpdChtaW4sIG1heCwgb2ZmSGFuZGxlcilcclxuXHRcdFx0fTtcclxuXHRcdH1cclxuXHR9LCB7XHJcblx0XHRrZXk6IFwib25TcGxpdFwiLFxyXG5cdFx0dmFsdWU6IGZ1bmN0aW9uIG9uU3BsaXQobWluLCBtYXgsIG9uSGFuZGxlcikge1xyXG5cdFx0XHR2YXIgb24gPSBbXTtcclxuXHRcdFx0aWYgKG1heCA+IG1pbikge1xyXG5cdFx0XHRcdGZvciAodmFyIGkgPSBtaW47IGkgPD0gbWF4OyBpKyspIHtcclxuXHRcdFx0XHRcdG9uLnB1c2godGhpcy5wcmVzc05vdGVOdW1iZXIoaSwgb25IYW5kbGVyKSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdGZvciAodmFyIF9pID0gbWF4OyBfaSA+PSBtaW47IF9pLS0pIHtcclxuXHRcdFx0XHRcdG9uLnB1c2godGhpcy5wcmVzc05vdGVOdW1iZXIoX2ksIG9uSGFuZGxlcikpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0XHRyZXR1cm4gb247XHJcblx0XHR9XHJcblx0fSwge1xyXG5cdFx0a2V5OiBcIm9mZlNwbGl0XCIsXHJcblx0XHR2YWx1ZTogZnVuY3Rpb24gb2ZmU3BsaXQobWluLCBtYXgsIG9mZkhhbmRsZXIpIHtcclxuXHRcdFx0dmFyIG9mZiA9IFtdO1xyXG5cdFx0XHRpZiAobWF4ID4gbWluKSB7XHJcblx0XHRcdFx0Zm9yICh2YXIgaSA9IG1pbjsgaSA8PSBtYXg7IGkrKykge1xyXG5cdFx0XHRcdFx0b2ZmLnB1c2godGhpcy5yZWxlYXNlTm90ZU51bWJlcihpLCBvZmZIYW5kbGVyKSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdGZvciAodmFyIF9pMiA9IG1heDsgX2kyID49IG1pbjsgX2kyLS0pIHtcclxuXHRcdFx0XHRcdG9mZi5wdXNoKHRoaXMucmVsZWFzZU5vdGVOdW1iZXIoX2kyLCBvZmZIYW5kbGVyKSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHRcdHJldHVybiBvZmY7XHJcblx0XHR9XHJcblx0fSwge1xyXG5cdFx0a2V5OiBcInJlbW92ZUtleVRvZ2dsZVJhbmdlXCIsXHJcblx0XHR2YWx1ZTogZnVuY3Rpb24gcmVtb3ZlS2V5VG9nZ2xlUmFuZ2UocmFuZ2VzKSB7XHJcblx0XHRcdHZhciBfdGhpczIgPSB0aGlzO1xyXG5cclxuXHRcdFx0dmFyIHJlbW92ZU9uUmFuZ2VzID0gcmFuZ2VzLnByZXNzLmZvckVhY2goZnVuY3Rpb24gKG5vdGVIYW5kbGVyKSB7XHJcblx0XHRcdFx0cmV0dXJuIF90aGlzMi5yZW1vdmVQcmVzc05vdGVOdW1iZXIobm90ZUhhbmRsZXIpO1xyXG5cdFx0XHR9KTtcclxuXHRcdFx0dmFyIHJlbW92ZU9mZlJhbmdlcyA9IHJhbmdlcy5yZWxlYXNlLmZvckVhY2goZnVuY3Rpb24gKG5vdGVIYW5kbGVyKSB7XHJcblx0XHRcdFx0cmV0dXJuIF90aGlzMi5yZW1vdmVSZWxlYXNlTm90ZU51bWJlcihub3RlSGFuZGxlcik7XHJcblx0XHRcdH0pO1xyXG5cdFx0XHRyZXR1cm4gcmVtb3ZlT2ZmUmFuZ2VzID09IHRydWUgJiYgcmVtb3ZlT25SYW5nZXMgPT0gdHJ1ZTtcclxuXHRcdH1cclxuXHJcblx0XHQvKipcclxuICAgKiBSZW1vdmVzIGFsbCBib3VuZCBoYW5kbGVycyBmb3IgYWxsIGV2ZW50cy4gR3JlYXQgZm9yIHdoZW4geW91IGtub3cgeW91IG5lZWQgdG8gbG9zZSBhbGwgdGhlIGV2ZW50cy5cclxuICAgKiBAcmV0dXJucyB7Ym9vbGVhbn1cclxuICAgKi9cclxuXHJcblx0fSwge1xyXG5cdFx0a2V5OiBcInVuYmluZEFsbFwiLFxyXG5cdFx0dmFsdWU6IGZ1bmN0aW9uIHVuYmluZEFsbCgpIHtcclxuXHRcdFx0dGhpcy51bkJpbmRLZXlib2FyZCgpO1xyXG5cdFx0XHRmb3IgKHZhciBldmVudCBpbiB0aGlzLmxpc3RlbmVycykge1xyXG5cdFx0XHRcdGRlbGV0ZSB0aGlzLmxpc3RlbmVyc1tldmVudF07XHJcblx0XHRcdH1cclxuXHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHR9XHJcblx0fSwge1xyXG5cdFx0a2V5OiBcImJpbmRLZXlib2FyZFwiLFxyXG5cclxuXHJcblx0XHQvKipcclxuICAgKiBCaW5kIHRoZSBjb21wdXRlciAocXdlcnR5KSBrZXlib2FyZCB0byBhbGxvdyBpdCB0byBnZW5lcmF0ZSBNSURJIG5vdGUgb24gYW5kIG5vdGUgb2ZmIG1lc3NhZ2VzLlxyXG4gICAqL1xyXG5cdFx0dmFsdWU6IGZ1bmN0aW9uIGJpbmRLZXlib2FyZCgpIHtcclxuXHRcdFx0dmFyIF90aGlzMyA9IHRoaXM7XHJcblxyXG5cdFx0XHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihLRVlCT0FSRF9FVkVOVF9LRVlfRE9XTiwgZnVuY3Rpb24gKGUpIHtcclxuXHRcdFx0XHRyZXR1cm4gX3RoaXMzLmtleWJvYXJkS2V5RG93bihlKTtcclxuXHRcdFx0fSk7XHJcblx0XHRcdHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKEtFWUJPQVJEX0VWRU5UX0tFWV9VUCwgZnVuY3Rpb24gKGUpIHtcclxuXHRcdFx0XHRyZXR1cm4gX3RoaXMzLmtleWJvYXJkS2V5VXAoZSk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cdH0sIHtcclxuXHRcdGtleTogXCJ1bkJpbmRLZXlib2FyZFwiLFxyXG5cdFx0dmFsdWU6IGZ1bmN0aW9uIHVuQmluZEtleWJvYXJkKCkge1xyXG5cdFx0XHR2YXIgX3RoaXM0ID0gdGhpcztcclxuXHJcblx0XHRcdHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKEtFWUJPQVJEX0VWRU5UX0tFWV9ET1dOLCBmdW5jdGlvbiAoZSkge1xyXG5cdFx0XHRcdHJldHVybiBfdGhpczQua2V5Ym9hcmRLZXlEb3duKGUpO1xyXG5cdFx0XHR9KTtcclxuXHRcdFx0d2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoS0VZQk9BUkRfRVZFTlRfS0VZX1VQLCBmdW5jdGlvbiAoZSkge1xyXG5cdFx0XHRcdHJldHVybiBfdGhpczQua2V5Ym9hcmRLZXlVcChlKTtcclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblx0fSwge1xyXG5cdFx0a2V5OiBcImtleWJvYXJkS2V5RG93blwiLFxyXG5cdFx0dmFsdWU6IGZ1bmN0aW9uIGtleWJvYXJkS2V5RG93bihtZXNzYWdlKSB7XHJcblx0XHRcdGlmIChLRVlfQ09ERV9NQVBbbWVzc2FnZS5rZXlDb2RlXSAhPSB1bmRlZmluZWQpIHtcclxuXHRcdFx0XHRpZiAodGhpcy5rZXlib2FkS2V5UHJlc3NlZFttZXNzYWdlLmtleUNvZGVdICE9IHRydWUpIHtcclxuXHRcdFx0XHRcdHRoaXMua2V5Ym9hZEtleVByZXNzZWRbbWVzc2FnZS5rZXlDb2RlXSA9IHRydWU7XHJcblx0XHRcdFx0XHR2YXIgbmV3TWVzc2FnZSA9IEdlbmVyYXRlLk5vdGVFdmVudChOT1RFX09OX0VWRU5ULCBLRVlfQ09ERV9NQVBbbWVzc2FnZS5rZXlDb2RlXSk7XHJcblx0XHRcdFx0XHRpZiAobmV3TWVzc2FnZSAhPT0gbnVsbCkge1xyXG5cdFx0XHRcdFx0XHR0aGlzLnNlbmRNaWRpTWVzc2FnZShuZXdNZXNzYWdlKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9LCB7XHJcblx0XHRrZXk6IFwia2V5Ym9hcmRLZXlVcFwiLFxyXG5cdFx0dmFsdWU6IGZ1bmN0aW9uIGtleWJvYXJkS2V5VXAobWVzc2FnZSkge1xyXG5cdFx0XHRpZiAoS0VZX0NPREVfTUFQW21lc3NhZ2Uua2V5Q29kZV0gIT0gdW5kZWZpbmVkKSB7XHJcblx0XHRcdFx0aWYgKHRoaXMua2V5Ym9hZEtleVByZXNzZWRbbWVzc2FnZS5rZXlDb2RlXSA9PSB0cnVlKSB7XHJcblx0XHRcdFx0XHRkZWxldGUgdGhpcy5rZXlib2FkS2V5UHJlc3NlZFttZXNzYWdlLmtleUNvZGVdO1xyXG5cdFx0XHRcdFx0dmFyIG5ld01lc3NhZ2UgPSBHZW5lcmF0ZS5Ob3RlRXZlbnQoTk9URV9PRkZfRVZFTlQsIEtFWV9DT0RFX01BUFttZXNzYWdlLmtleUNvZGVdKTtcclxuXHRcdFx0XHRcdGlmIChuZXdNZXNzYWdlICE9PSBudWxsKSB7XHJcblx0XHRcdFx0XHRcdHRoaXMuc2VuZE1pZGlNZXNzYWdlKG5ld01lc3NhZ2UpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH0sIHtcclxuXHRcdGtleTogXCJzZW5kTWlkaU1lc3NhZ2VcIixcclxuXHRcdHZhbHVlOiBmdW5jdGlvbiBzZW5kTWlkaU1lc3NhZ2UobWVzc2FnZSkge31cclxuXHR9XSk7XHJcblx0cmV0dXJuIE1JRElFdmVudHM7XHJcbn0oRXZlbnRzKTtcclxuXHJcbnZhciBNaXp6eSA9IGZ1bmN0aW9uIChfTUlESUV2ZW50cykge1xyXG5cdGluaGVyaXRzKE1penp5LCBfTUlESUV2ZW50cyk7XHJcblx0Y3JlYXRlQ2xhc3MoTWl6enksIG51bGwsIFt7XHJcblx0XHRrZXk6IFwiR2VuZXJhdGVcIixcclxuXHRcdGdldDogZnVuY3Rpb24gZ2V0JCQxKCkge1xyXG5cdFx0XHRyZXR1cm4gR2VuZXJhdGU7XHJcblx0XHR9XHJcblx0fSwge1xyXG5cdFx0a2V5OiBcIk5PVEVfT05cIixcclxuXHRcdGdldDogZnVuY3Rpb24gZ2V0JCQxKCkge1xyXG5cdFx0XHRyZXR1cm4gTk9URV9PTl9FVkVOVDtcclxuXHRcdH1cclxuXHR9LCB7XHJcblx0XHRrZXk6IFwiTk9URV9PRkZcIixcclxuXHRcdGdldDogZnVuY3Rpb24gZ2V0JCQxKCkge1xyXG5cdFx0XHRyZXR1cm4gTk9URV9PRkZfRVZFTlQ7XHJcblx0XHR9XHJcblx0fSwge1xyXG5cdFx0a2V5OiBcIkNPTlRST0xDSEFOR0VcIixcclxuXHRcdGdldDogZnVuY3Rpb24gZ2V0JCQxKCkge1xyXG5cdFx0XHRyZXR1cm4gQ09OVFJPTExFUl9FVkVOVDtcclxuXHRcdH1cclxuXHR9LCB7XHJcblx0XHRrZXk6IFwiUElUQ0hXSEVFTFwiLFxyXG5cdFx0Z2V0OiBmdW5jdGlvbiBnZXQkJDEoKSB7XHJcblx0XHRcdHJldHVybiBQSVRDSFdIRUVMX0VWRU5UO1xyXG5cdFx0fVxyXG5cdH1dKTtcclxuXHJcblx0ZnVuY3Rpb24gTWl6enkoKSB7XHJcblx0XHRjbGFzc0NhbGxDaGVjayh0aGlzLCBNaXp6eSk7XHJcblxyXG5cdFx0dmFyIF90aGlzID0gcG9zc2libGVDb25zdHJ1Y3RvclJldHVybih0aGlzLCAoTWl6enkuX19wcm90b19fIHx8IE9iamVjdC5nZXRQcm90b3R5cGVPZihNaXp6eSkpLmNhbGwodGhpcykpO1xyXG5cclxuXHRcdF90aGlzLmtleXNQcmVzc2VkID0gW107XHJcblx0XHRfdGhpcy5taWRpQWNjZXNzID0gbnVsbDtcclxuXHRcdF90aGlzLmxvb3BiYWNrID0gdHJ1ZTtcclxuXHJcblx0XHRfdGhpcy5ib3VuZElucHV0cyA9IFtdO1xyXG5cdFx0X3RoaXMuYm91bmRPdXRwdXRzID0gW107XHJcblxyXG5cdFx0X3RoaXMua2V5ID0gRU5IQVJNT05JQ19LRVlTWzBdOyAvLyBDLU1ham9yXHJcblxyXG5cdFx0aWYgKCF3aW5kb3cuTUlESU1lc3NhZ2VFdmVudCkge1xyXG5cdFx0XHR3aW5kb3cuTUlESU1lc3NhZ2VFdmVudCA9IGZ1bmN0aW9uIChuYW1lLCBwYXJhbXMpIHtcclxuXHRcdFx0XHRfdGhpcy5uYW1lID0gbmFtZTtcclxuXHRcdFx0XHRyZXR1cm4gT2JqZWN0LmFzc2lnbihfdGhpcywgcGFyYW1zKTtcclxuXHRcdFx0fTtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gX3RoaXM7XHJcblx0fVxyXG5cclxuXHRjcmVhdGVDbGFzcyhNaXp6eSwgW3tcclxuXHRcdGtleTogXCJpbml0aWFsaXplXCIsXHJcblx0XHR2YWx1ZTogZnVuY3Rpb24gaW5pdGlhbGl6ZSgpIHtcclxuXHRcdFx0dmFyIF90aGlzMiA9IHRoaXM7XHJcblxyXG5cdFx0XHRpZiAodGhpcy5taWRpQWNjZXNzID09PSBudWxsKSB7XHJcblx0XHRcdFx0aWYgKG5hdmlnYXRvci5yZXF1ZXN0TUlESUFjY2Vzcykge1xyXG5cdFx0XHRcdFx0cmV0dXJuIG5hdmlnYXRvci5yZXF1ZXN0TUlESUFjY2Vzcyh7XHJcblx0XHRcdFx0XHRcdHN5c2V4OiBmYWxzZVxyXG5cdFx0XHRcdFx0fSkudGhlbihmdW5jdGlvbiAoZSkge1xyXG5cdFx0XHRcdFx0XHRyZXR1cm4gX3RoaXMyLm9uTUlESVN1Y2Nlc3MoZSk7XHJcblx0XHRcdFx0XHR9LCBmdW5jdGlvbiAoZSkge1xyXG5cdFx0XHRcdFx0XHRyZXR1cm4gX3RoaXMyLm9uTUlESUZhaWx1cmUoZSk7XHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0Y29uc29sZS53YXJuKFwiW01penp5XSBZb3VyIGJyb3dzZXIgZG9lcyBub3Qgc3VwcG9ydCBXZWIgTUlESSBBUEkuIFlvdSBjYW4gc3RpbGwgdXNlIHRoZSBsb2NhbCBsb29wYmFjayBob3dldmVyLlwiKTtcclxuXHRcdFx0XHRcdHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XHJcblx0XHRcdFx0XHRcdHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRcdFx0XHRcdHJlc29sdmUoKTtcclxuXHRcdFx0XHRcdFx0fSwgNTApO1xyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fSwge1xyXG5cdFx0a2V5OiBcInNldEtleVwiLFxyXG5cdFx0dmFsdWU6IGZ1bmN0aW9uIHNldEtleSgpIHtcclxuXHRcdFx0dmFyIGtleWxldHRlciA9IGFyZ3VtZW50cy5sZW5ndGggPiAwICYmIGFyZ3VtZW50c1swXSAhPT0gdW5kZWZpbmVkID8gYXJndW1lbnRzWzBdIDogXCJDXCI7XHJcblxyXG5cdFx0XHR0aGlzLmtleSA9IEVOSEFSTU9OSUNfS0VZU1tFTkhBUk1PTklDX0tFWVMuaW5kZXhPZihrZXlsZXR0ZXIudG9VcHBlckNhc2UoKSldIHx8IFwiQ1wiO1xyXG5cdFx0fVxyXG5cdH0sIHtcclxuXHRcdGtleTogXCJnZXRNaWRpSW5wdXRzXCIsXHJcblx0XHR2YWx1ZTogZnVuY3Rpb24gZ2V0TWlkaUlucHV0cygpIHtcclxuXHRcdFx0aWYgKHRoaXMubWlkaUFjY2VzcyAhPSBudWxsKSB7XHJcblx0XHRcdFx0cmV0dXJuIHRoaXMubWlkaUFjY2Vzcy5pbnB1dHMudmFsdWVzKCk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9LCB7XHJcblx0XHRrZXk6IFwiZ2V0TWlkaU91dHB1dHNcIixcclxuXHRcdHZhbHVlOiBmdW5jdGlvbiBnZXRNaWRpT3V0cHV0cygpIHtcclxuXHRcdFx0aWYgKHRoaXMubWlkaUFjY2VzcyAhPSBudWxsKSB7XHJcblx0XHRcdFx0cmV0dXJuIHRoaXMubWlkaUFjY2Vzcy5vdXRwdXRzLnZhbHVlcygpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fSwge1xyXG5cdFx0a2V5OiBcImJpbmRUb0lucHV0XCIsXHJcblx0XHR2YWx1ZTogZnVuY3Rpb24gYmluZFRvSW5wdXQoaW5wdXQpIHtcclxuXHRcdFx0dmFyIF90aGlzMyA9IHRoaXM7XHJcblxyXG5cdFx0XHR0aGlzLmJvdW5kSW5wdXRzLnB1c2goaW5wdXQpO1xyXG5cdFx0XHRpbnB1dC5vbm1pZGltZXNzYWdlID0gZnVuY3Rpb24gKGUpIHtcclxuXHRcdFx0XHRyZXR1cm4gX3RoaXMzLm9uTUlESU1lc3NhZ2UoZSwgX3RoaXMzLmtleSk7XHJcblx0XHRcdH07XHJcblx0XHR9XHJcblx0fSwge1xyXG5cdFx0a2V5OiBcInVuYmluZElucHV0XCIsXHJcblx0XHR2YWx1ZTogZnVuY3Rpb24gdW5iaW5kSW5wdXQoaW5wdXQpIHtcclxuXHRcdFx0dmFyIGluZGV4ID0gdGhpcy5ib3VuZElucHV0cy5pbmRleE9mKGlucHV0KTtcclxuXHRcdFx0dGhpcy5ib3VuZElucHV0cy5zbGljZSgxLCBpbmRleCk7XHJcblx0XHRcdGlucHV0Lm9ubWlkaW1lc3NhZ2UgPSBudWxsO1xyXG5cdFx0fVxyXG5cdH0sIHtcclxuXHRcdGtleTogXCJiaW5kVG9BbGxJbnB1dHNcIixcclxuXHRcdHZhbHVlOiBmdW5jdGlvbiBiaW5kVG9BbGxJbnB1dHMoKSB7XHJcblx0XHRcdGlmICh0aGlzLm1pZGlBY2Nlc3MgIT0gbnVsbCkge1xyXG5cdFx0XHRcdHZhciBpbnB1dHMgPSB0aGlzLmdldE1pZGlJbnB1dHMoKTtcclxuXHRcdFx0XHRmb3IgKHZhciBpbnB1dCA9IGlucHV0cy5uZXh0KCk7IGlucHV0ICYmICFpbnB1dC5kb25lOyBpbnB1dCA9IGlucHV0cy5uZXh0KCkpIHtcclxuXHRcdFx0XHRcdHRoaXMuYmluZFRvSW5wdXQoaW5wdXQudmFsdWUpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH0sIHtcclxuXHRcdGtleTogXCJ1bmJpbmRBbGxJbnB1dHNcIixcclxuXHRcdHZhbHVlOiBmdW5jdGlvbiB1bmJpbmRBbGxJbnB1dHMoKSB7XHJcblx0XHRcdHRoaXMuYm91bmRJbnB1dHMuZm9yRWFjaCh0aGlzLnVuYmluZElucHV0KTtcclxuXHRcdH1cclxuXHR9LCB7XHJcblx0XHRrZXk6IFwiYmluZFRvT3V0cHV0XCIsXHJcblx0XHR2YWx1ZTogZnVuY3Rpb24gYmluZFRvT3V0cHV0KG91dHB1dCkge1xyXG5cdFx0XHR0aGlzLmJvdW5kT3V0cHV0cy5wdXNoKG91dHB1dCk7XHJcblx0XHR9XHJcblx0fSwge1xyXG5cdFx0a2V5OiBcImJpbmRUb0FsbE91dHB1dHNcIixcclxuXHRcdHZhbHVlOiBmdW5jdGlvbiBiaW5kVG9BbGxPdXRwdXRzKCkge1xyXG5cdFx0XHRpZiAodGhpcy5taWRpQWNjZXNzICE9IG51bGwpIHtcclxuXHRcdFx0XHR2YXIgb3V0cHV0cyA9IHRoaXMuZ2V0TWlkaU91dHB1dHMoKTtcclxuXHRcdFx0XHRmb3IgKHZhciBvdXRwdXQgPSBvdXRwdXRzLm5leHQoKTsgb3V0cHV0ICYmICFvdXRwdXQuZG9uZTsgb3V0cHV0ID0gb3V0cHV0cy5uZXh0KCkpIHtcclxuXHRcdFx0XHRcdHRoaXMuYmluZFRvT3V0cHV0KG91dHB1dC52YWx1ZSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fSwge1xyXG5cdFx0a2V5OiBcIm9uTUlESUZhaWx1cmVcIixcclxuXHRcdHZhbHVlOiBmdW5jdGlvbiBvbk1JRElGYWlsdXJlKGVycm9yKSB7XHJcblx0XHRcdHRocm93IGVycm9yO1xyXG5cdFx0fVxyXG5cdH0sIHtcclxuXHRcdGtleTogXCJvbk1JRElTdWNjZXNzXCIsXHJcblx0XHR2YWx1ZTogZnVuY3Rpb24gb25NSURJU3VjY2VzcyhtaWRpQWNjZXNzT2JqKSB7XHJcblx0XHRcdHRoaXMubWlkaUFjY2VzcyA9IG1pZGlBY2Nlc3NPYmo7XHJcblx0XHR9XHJcblx0fSwge1xyXG5cdFx0a2V5OiBcInNlbmRNaWRpTWVzc2FnZVwiLFxyXG5cdFx0dmFsdWU6IGZ1bmN0aW9uIHNlbmRNaWRpTWVzc2FnZShtZXNzYWdlKSB7XHJcblx0XHRcdHRoaXMuYm91bmRPdXRwdXRzLmZvckVhY2goZnVuY3Rpb24gKG91dHB1dCkge1xyXG5cdFx0XHRcdG91dHB1dC5zZW5kKG1lc3NhZ2UuZGF0YSwgbWVzc2FnZS50aW1lU3RhbXApO1xyXG5cdFx0XHR9KTtcclxuXHRcdFx0aWYgKHRoaXMubG9vcGJhY2spIHtcclxuXHRcdFx0XHR0aGlzLm9uTUlESU1lc3NhZ2UobWVzc2FnZSwgdGhpcy5rZXkpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fSwge1xyXG5cdFx0a2V5OiBcImtleXNcIixcclxuXHRcdGdldDogZnVuY3Rpb24gZ2V0JCQxKCkge1xyXG5cdFx0XHRyZXR1cm4gRU5IQVJNT05JQ19LRVlTO1xyXG5cdFx0fVxyXG5cdH0sIHtcclxuXHRcdGtleTogXCJvdXRwdXREZXZpY2VzXCIsXHJcblx0XHRnZXQ6IGZ1bmN0aW9uIGdldCQkMSgpIHtcclxuXHRcdFx0dmFyIGRldmljZUFycmF5ID0gW107XHJcblx0XHRcdHZhciBkZXZpY2VzID0gdGhpcy5nZXRNaWRpT3V0cHV0cygpO1xyXG5cdFx0XHRmb3IgKHZhciBpbnB1dCA9IGRldmljZXMubmV4dCgpOyBpbnB1dCAmJiAhaW5wdXQuZG9uZTsgaW5wdXQgPSBkZXZpY2VzLm5leHQoKSkge1xyXG5cdFx0XHRcdGRldmljZUFycmF5LnB1c2goaW5wdXQudmFsdWUpO1xyXG5cdFx0XHR9XHJcblx0XHRcdHJldHVybiBkZXZpY2VBcnJheTtcclxuXHRcdH1cclxuXHR9LCB7XHJcblx0XHRrZXk6IFwiaW5wdXREZXZpY2VzXCIsXHJcblx0XHRnZXQ6IGZ1bmN0aW9uIGdldCQkMSgpIHtcclxuXHRcdFx0dmFyIGRldmljZUFycmF5ID0gW107XHJcblx0XHRcdHZhciBkZXZpY2VzID0gdGhpcy5nZXRNaWRpSW5wdXRzKCk7XHJcblx0XHRcdGZvciAodmFyIGlucHV0ID0gZGV2aWNlcy5uZXh0KCk7IGlucHV0ICYmICFpbnB1dC5kb25lOyBpbnB1dCA9IGRldmljZXMubmV4dCgpKSB7XHJcblx0XHRcdFx0ZGV2aWNlQXJyYXkucHVzaChpbnB1dC52YWx1ZSk7XHJcblx0XHRcdH1cclxuXHRcdFx0cmV0dXJuIGRldmljZUFycmF5O1xyXG5cdFx0fVxyXG5cdH1dKTtcclxuXHRyZXR1cm4gTWl6enk7XHJcbn0oTUlESUV2ZW50cyk7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IE1penp5O1xyXG5cclxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9bWl6enkuY2pzLm1hcFxyXG4iLCJleHBvcnQgZGVmYXVsdCBjbGFzcyBBbXBFbnZlbG9wZSB7XHJcblx0Y29uc3RydWN0b3IgKGNvbnRleHQsIGdhaW4gPSAwLjEpIHtcclxuXHRcdHRoaXMuY29udGV4dCA9IGNvbnRleHQ7XHJcblx0XHR0aGlzLm91dHB1dCA9IHRoaXMuY29udGV4dC5jcmVhdGVHYWluKCk7XHJcblx0XHR0aGlzLm91dHB1dC5nYWluLnZhbHVlID0gZ2FpbjtcclxuXHRcdHRoaXMucGFydGlhbHMgPSBbXTtcclxuXHRcdHRoaXMudmVsb2NpdHkgPSAwO1xyXG5cdFx0dGhpcy5nYWluID0gZ2FpbjtcclxuXHRcdHRoaXMuZW52ZWxvcGUgPSB7XHJcblx0XHRcdGE6IDAsXHJcblx0XHRcdGQ6IDAuMSxcclxuXHRcdFx0czogdGhpcy5nYWluLFxyXG5cdFx0XHRyOiAwLjVcclxuXHRcdH07XHJcblx0fVxyXG5cclxuXHRvbiAodmVsb2NpdHkpIHtcclxuXHRcdHRoaXMudmVsb2NpdHkgPSB2ZWxvY2l0eSAvIDEyNztcclxuXHRcdHRoaXMuc3RhcnQodGhpcy5jb250ZXh0LmN1cnJlbnRUaW1lKTtcclxuXHR9XHJcblxyXG5cdG9mZiAoTWlkaUV2ZW50KSB7XHJcblx0XHRyZXR1cm4gdGhpcy5zdG9wKHRoaXMuY29udGV4dC5jdXJyZW50VGltZSk7XHJcblx0fVxyXG5cclxuXHRzdGFydCAodGltZSkge1xyXG5cdFx0dGhpcy5vdXRwdXQuZ2Fpbi52YWx1ZSA9IDA7XHJcblx0XHR0aGlzLm91dHB1dC5nYWluLnNldFZhbHVlQXRUaW1lKDAsIHRpbWUpO1xyXG5cdFx0cmV0dXJuIHRoaXMub3V0cHV0LmdhaW4uc2V0VGFyZ2V0QXRUaW1lKHRoaXMuc3VzdGFpbiAqIHRoaXMudmVsb2NpdHksIHRpbWUgKyB0aGlzLmF0dGFjaywgdGhpcy5kZWNheSArIDAuMDAxKTtcclxuXHR9XHJcblxyXG5cdHN0b3AgKHRpbWUpIHtcclxuXHRcdHRoaXMub3V0cHV0LmdhaW4uY2FuY2VsU2NoZWR1bGVkVmFsdWVzKHRpbWUpO1xyXG5cdFx0dGhpcy5vdXRwdXQuZ2Fpbi5zZXRWYWx1ZUF0VGltZSh0aGlzLnN1c3RhaW4sIHRpbWUpO1xyXG5cdFx0dGhpcy5vdXRwdXQuZ2Fpbi5zZXRUYXJnZXRBdFRpbWUoMCwgdGltZSwgdGhpcy5yZWxlYXNlKTtcclxuXHR9XHJcblxyXG5cdHNldCBhdHRhY2sgKHZhbHVlKSB7XHJcblx0XHR0aGlzLmVudmVsb3BlLmEgPSB2YWx1ZTtcclxuXHR9XHJcblxyXG5cdGdldCBhdHRhY2sgKCkge1xyXG5cdFx0cmV0dXJuIHRoaXMuZW52ZWxvcGUuYTtcclxuXHR9XHJcblxyXG5cdHNldCBkZWNheSAodmFsdWUpIHtcclxuXHRcdHRoaXMuZW52ZWxvcGUuZCA9IHZhbHVlO1xyXG5cdH1cclxuXHJcblx0Z2V0IGRlY2F5ICgpIHtcclxuXHRcdHJldHVybiB0aGlzLmVudmVsb3BlLmQ7XHJcblx0fVxyXG5cclxuXHRzZXQgc3VzdGFpbiAodmFsdWUpIHtcclxuXHRcdHRoaXMuZ2FpbiA9IHZhbHVlO1xyXG5cdFx0dGhpcy5lbnZlbG9wZS5zID0gdmFsdWU7XHJcblx0fVxyXG5cclxuXHRnZXQgc3VzdGFpbiAoKSB7XHJcblx0XHRyZXR1cm4gdGhpcy5nYWluO1xyXG5cdH1cclxuXHJcblx0c2V0IHJlbGVhc2UgKHZhbHVlKSB7XHJcblx0XHR0aGlzLmVudmVsb3BlLnIgPSB2YWx1ZTtcclxuXHR9XHJcblxyXG5cdGdldCByZWxlYXNlICgpIHtcclxuXHRcdHJldHVybiB0aGlzLmVudmVsb3BlLnI7XHJcblx0fVxyXG5cclxuXHRjb25uZWN0IChkZXN0aW5hdGlvbikge1xyXG5cdFx0dGhpcy5vdXRwdXQuY29ubmVjdChkZXN0aW5hdGlvbik7XHJcblx0fVxyXG59IiwiZXhwb3J0IGRlZmF1bHQgY2xhc3MgRmlsdGVyIHtcclxuXHRjb25zdHJ1Y3RvciAoY29udGV4dCwgdHlwZSA9IFwibG93cGFzc1wiLCBjdXRvZmYgPSAxMDAwLCByZXNvbmFuY2UgPSAwLjEpIHtcclxuXHRcdHRoaXMuY29udGV4dCA9IGNvbnRleHQ7XHJcblx0XHR0aGlzLmRlc3RpbmF0aW9uID0gdGhpcy5jb250ZXh0LmNyZWF0ZUJpcXVhZEZpbHRlcigpO1xyXG5cdFx0dGhpcy50eXBlID0gdHlwZTtcclxuXHRcdHRoaXMuY3V0b2ZmID0gY3V0b2ZmO1xyXG5cdFx0dGhpcy5yZXNvbmFuY2UgPSAwLjE7XHJcblx0XHR0aGlzLmVudmVsb3BlQW1vdW50ID0gMTtcclxuXHRcdHRoaXMuZW52ZWxvcGUgPSB7XHJcblx0XHRcdGE6IDAsXHJcblx0XHRcdGQ6IDAuNSxcclxuXHRcdFx0czogdGhpcy5jdXRvZmYsXHJcblx0XHRcdHI6IDAuNVxyXG5cdFx0fTtcclxuXHR9XHJcblxyXG5cdG9uIChNaWRpRXZlbnQpIHtcclxuXHRcdHRoaXMuc3RhcnQodGhpcy5jb250ZXh0LmN1cnJlbnRUaW1lLCBNaWRpRXZlbnQuZnJlcXVlbmN5KTtcclxuXHR9XHJcblxyXG5cdG9mZiAoKSB7XHJcblx0XHRyZXR1cm4gdGhpcy5zdG9wKHRoaXMuY29udGV4dC5jdXJyZW50VGltZSk7XHJcblx0fVxyXG5cclxuXHRzZXQgdHlwZSAodmFsdWUpIHtcclxuXHRcdHRoaXMuZGVzdGluYXRpb24udHlwZSA9IHZhbHVlO1xyXG5cdH1cclxuXHJcblx0Z2V0IHR5cGUgKCkge1xyXG5cdFx0cmV0dXJuIHRoaXMuZGVzdGluYXRpb24udHlwZTtcclxuXHR9XHJcblxyXG5cdHNldCBjdXRvZmYgKHZhbHVlKSB7XHJcblx0XHR0aGlzLmRlc3RpbmF0aW9uLmZyZXF1ZW5jeS52YWx1ZSA9IHZhbHVlO1xyXG5cdH1cclxuXHJcblx0Z2V0IGN1dG9mZiAoKSB7XHJcblx0XHRyZXR1cm4gdGhpcy5kZXN0aW5hdGlvbi5mcmVxdWVuY3kudmFsdWU7XHJcblx0fVxyXG5cclxuXHRzZXQgUSAodmFsdWUpIHtcclxuXHRcdHRoaXMuZGVzdGluYXRpb24uUS52YWx1ZSA9IHZhbHVlO1xyXG5cdH1cclxuXHJcblx0Z2V0IFEgKCkge1xyXG5cdFx0cmV0dXJuIHRoaXMuZGVzdGluYXRpb24uUS52YWx1ZTtcclxuXHR9XHJcblxyXG5cdHN0YXJ0ICh0aW1lKSB7XHJcblx0XHRyZXR1cm4gdGhpcy5kZXN0aW5hdGlvbi5mcmVxdWVuY3kuc2V0VGFyZ2V0QXRUaW1lKHRoaXMuc3VzdGFpbiwgdGltZSArIHRoaXMuYXR0YWNrLCB0aGlzLmRlY2F5ICsgMC4wMDEpO1xyXG5cdH1cclxuXHJcblx0c3RvcCAodGltZSkge1xyXG5cdFx0cmV0dXJuIHRoaXMuZGVzdGluYXRpb24uZnJlcXVlbmN5LnNldFRhcmdldEF0VGltZSh0aGlzLmN1dG9mZiwgdGltZSwgdGhpcy5yZWxlYXNlKTtcclxuXHR9XHJcblxyXG5cdHNldCBhdHRhY2sgKHZhbHVlKSB7XHJcblx0XHR0aGlzLmVudmVsb3BlLmEgPSB2YWx1ZTtcclxuXHR9XHJcblxyXG5cdGdldCBhdHRhY2sgKCkge1xyXG5cdFx0cmV0dXJuIHRoaXMuZW52ZWxvcGUuYTtcclxuXHR9XHJcblxyXG5cdHNldCBkZWNheSAodmFsdWUpIHtcclxuXHRcdHRoaXMuZW52ZWxvcGUuZCA9IHZhbHVlO1xyXG5cdH1cclxuXHJcblx0Z2V0IGRlY2F5ICgpIHtcclxuXHRcdHJldHVybiB0aGlzLmVudmVsb3BlLmQ7XHJcblx0fVxyXG5cclxuXHRzZXQgc3VzdGFpbiAodmFsdWUpIHtcclxuXHRcdHRoaXMuY3V0b2ZmID0gdmFsdWU7XHJcblx0fVxyXG5cclxuXHRnZXQgc3VzdGFpbiAoKSB7XHJcblx0XHRyZXR1cm4gdGhpcy5jdXRvZmY7XHJcblx0fVxyXG5cclxuXHRzZXQgcmVsZWFzZSAodmFsdWUpIHtcclxuXHRcdHRoaXMuZW52ZWxvcGUuciA9IHZhbHVlO1xyXG5cdH1cclxuXHJcblx0Z2V0IHJlbGVhc2UgKCkge1xyXG5cdFx0cmV0dXJuIHRoaXMuZW52ZWxvcGUucjtcclxuXHR9XHJcblxyXG5cdGNvbm5lY3QgKGRlc3RpbmF0aW9uKSB7XHJcblx0XHR0aGlzLmRlc3RpbmF0aW9uLmNvbm5lY3QoZGVzdGluYXRpb24pO1xyXG5cdH1cclxufSIsImltcG9ydCBOb2lzZSBmcm9tIFwiLi4vVm9pY2VzL05vaXNlXCI7XHJcblxyXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBSZXZlcmIge1xyXG5cdGNvbnN0cnVjdG9yIChjb250ZXh0KSB7XHJcblx0XHR0aGlzLmNvbnRleHQgPSBjb250ZXh0O1xyXG5cdFx0dGhpcy5kZXN0aW5hdGlvbiA9IHRoaXMuY29udGV4dC5jcmVhdGVDb252b2x2ZXIoKTtcclxuXHRcdHRoaXMucmV2ZXJiVGltZSA9IDE7XHJcblx0XHR0aGlzLnRhaWxDb250ZXh0ID0gbmV3IE9mZmxpbmVBdWRpb0NvbnRleHQoMiwgNDgwMDAgKiB0aGlzLnJldmVyYlRpbWUsIDQ4MDAwKTtcclxuXHRcdHRoaXMuYnVmZmVyID0gdGhpcy50YWlsQ29udGV4dC5jcmVhdGVCdWZmZXJTb3VyY2UoKTtcclxuXHRcdHRoaXMudGFpbCA9IG5ldyBOb2lzZSh0aGlzLnRhaWxDb250ZXh0KTtcclxuXHRcdHRoaXMudGFpbC5jb25uZWN0KHRoaXMudGFpbENvbnRleHQuZGVzdGluYXRpb24pO1xyXG5cdFx0dGhpcy50YWlsLnRyaWdnZXIoMTAwKTtcclxuXHRcdHRoaXMudGFpbC5vZmYoKTtcclxuXHRcdHRoaXMudGFpbENvbnRleHQuc3RhcnRSZW5kZXJpbmcoKS50aGVuKChidWZmZXIpID0+IHtcclxuXHJcblx0XHRcdHRoaXMuZGVzdGluYXRpb24uYnVmZmVyID0gYnVmZmVyO1xyXG5cdFx0XHQvLyB2YXIgc291cmNlID0gbmV3IEF1ZGlvQnVmZmVyU291cmNlTm9kZSh0aGlzLmNvbnRleHQsIHtcclxuXHRcdFx0Ly8gXHRidWZmZXI6IGJ1ZmZlclxyXG5cdFx0XHQvLyB9KTtcclxuXHRcdFx0Ly9zb3VyY2Uuc3RhcnQoKTtcclxuXHRcdFx0Ly9zb3VyY2UuY29ubmVjdCh0aGlzLmNvbnRleHQuZGVzdGluYXRpb24pO1xyXG5cdFx0XHQvL2NvbnNvbGUubG9nKHNvdXJjZSwgYnVmZmVyLmdldENoYW5uZWxEYXRhKDApLCBidWZmZXIuZ2V0Q2hhbm5lbERhdGEoMSkpO1xyXG5cclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0Y29ubmVjdCAoZGVzdGluYXRpb24pIHtcclxuXHRcdHRoaXMuZGVzdGluYXRpb24uY29ubmVjdChkZXN0aW5hdGlvbik7XHJcblx0fVxyXG59IiwiaW1wb3J0IE1penp5RGV2aWNlIGZyb20gXCIuL01penp5RGV2aWNlXCI7XHJcbmltcG9ydCBNaXp6eSBmcm9tIFwibWl6enlcIjtcclxuaW1wb3J0IFZvaWNlIGZyb20gXCIuL1ZvaWNlcy9Wb2ljZVwiO1xyXG5pbXBvcnQgUGVyY3Vzc2lvblZvaWNlIGZyb20gXCIuL1ZvaWNlcy9QZXJjdXNzaW9uVm9pY2VcIjtcclxuaW1wb3J0IEZpbHRlciBmcm9tIFwiLi9FZmZlY3RzL0ZpbHRlclwiO1xyXG5pbXBvcnQgUmV2ZXJiIGZyb20gXCIuL0VmZmVjdHMvUmV2ZXJiXCI7XHJcblxyXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBWaW5jZW50IGV4dGVuZHMgTWl6enlEZXZpY2Uge1xyXG5cclxuXHRcdGNvbnN0cnVjdG9yKCkge1xyXG5cdFx0XHRzdXBlcigpO1xyXG5cclxuXHRcdFx0dGhpcy5jb250ZXh0ID0gbmV3ICh3aW5kb3cuQXVkaW9Db250ZXh0IHx8IHdpbmRvdy53ZWJraXRBdWRpb0NvbnRleHQpKCk7XHJcblxyXG5cdFx0XHR0aGlzLm9zY2lsbGF0b3JUeXBlID0gXCJzYXd0b290aFwiO1xyXG5cdFx0XHR0aGlzLnZvaWNlcyA9IFtdO1xyXG5cclxuXHRcdFx0dGhpcy5yZXZlcmIgPSBuZXcgUmV2ZXJiKHRoaXMuY29udGV4dCk7XHJcblx0XHRcdHRoaXMucmV2ZXJiLmNvbm5lY3QodGhpcy5jb250ZXh0LmRlc3RpbmF0aW9uKTtcclxuXHJcblx0XHRcdHRoaXMuZmlsdGVyID0gbmV3IEZpbHRlcih0aGlzLmNvbnRleHQpO1xyXG5cdFx0XHR0aGlzLmZpbHRlci5jb25uZWN0KHRoaXMucmV2ZXJiLmRlc3RpbmF0aW9uKTtcclxuXHJcblx0XHR9XHJcblxyXG5cdFx0Tm90ZU9uKE1pZGlFdmVudCkge1xyXG5cdFx0XHRsZXQgdm9pY2UgPSBuZXcgVm9pY2UodGhpcy5jb250ZXh0LCB0aGlzLm9zY2lsbGF0b3JUeXBlKTtcclxuXHRcdFx0dm9pY2UuY29ubmVjdCh0aGlzLmZpbHRlci5kZXN0aW5hdGlvbik7XHJcblx0XHRcdHZvaWNlLm9uKE1pZGlFdmVudCk7XHJcblx0XHRcdHRoaXMudm9pY2VzW01pZGlFdmVudC52YWx1ZV0gPSB2b2ljZTtcclxuXHRcdH1cclxuXHJcblx0XHROb3RlT2ZmKE1pZGlFdmVudCkge1xyXG5cdFx0XHR0aGlzLnZvaWNlc1tNaWRpRXZlbnQudmFsdWVdLm9mZihNaWRpRXZlbnQpO1xyXG5cdFx0fVxyXG5cclxufVxyXG5cclxudmFyIHZpbmNlbnQgPSBuZXcgVmluY2VudCgpO1xyXG5cclxudmFyIG0gPSBuZXcgTWl6enkoKTtcclxubS5pbml0aWFsaXplKCkudGhlbigoKT0+IHtcclxuXHRtLmJpbmRUb0FsbElucHV0cygpO1xyXG5cdG0uYmluZEtleWJvYXJkKCk7XHJcblx0bS5rZXlUb2dnbGUoKGUpPT57XHJcblx0XHR2aW5jZW50Lk5vdGVPbihlKTtcclxuXHR9LCAoZSk9PntcclxuXHRcdHZpbmNlbnQuTm90ZU9mZihlKTtcclxuXHR9KTtcclxuXHJcblx0bS5vbkNDKDEsIChlKSA9PiB1cGRhdGVDQ1ZhbHVlcyhlKSk7XHJcbn0pO1xyXG5cclxuXHJcbndpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwibW91c2Vtb3ZlXCIsIChlKT0+IHtcclxuXHR2YXIgeCA9IE1hdGgucm91bmQoKGUucGFnZVggLyB3aW5kb3cuaW5uZXJXaWR0aCkgKiAxMjcpO1xyXG5cdHZhciB5ID0gTWF0aC5yb3VuZCgoZS5wYWdlWSAvIHdpbmRvdy5pbm5lckhlaWdodCkgKiAxMjcpO1xyXG5cdHZhciB4bWVzc2FnZSA9IE1penp5LkdlbmVyYXRlLkNDRXZlbnQoMSwgeCk7XHJcblx0bS5zZW5kTWlkaU1lc3NhZ2UoeG1lc3NhZ2UpO1xyXG5cdHZhciB5bWVzc2FnZSA9IE1penp5LkdlbmVyYXRlLkNDRXZlbnQoMiwgeSk7XHJcblx0bS5zZW5kTWlkaU1lc3NhZ2UoeW1lc3NhZ2UpO1xyXG59KTtcclxuXHJcbmZ1bmN0aW9uIHVwZGF0ZUNDVmFsdWVzKGUpIHtcclxuXHR2aW5jZW50LmZpbHRlci5jdXRvZmYgPSAxMDAgKyAoZS5yYXRpbyAqIDgwMDApO1xyXG59IiwiZXhwb3J0IGRlZmF1bHQgY2xhc3MgTWl6enlEZXZpY2Uge1xyXG5cdGNvbnN0cnVjdG9yKCkge1xyXG5cclxuXHR9XHJcblxyXG5cdE5vdGVPbihNaWRpRXZlbnQpIHtcclxuXHJcblx0fVxyXG5cclxuXHROb3RlT2ZmKE1pZGlFdmVudCkge1xyXG5cclxuXHR9XHJcblxyXG5cdG9uQ0MgKE1pZGlFdmVudCkge1xyXG5cclxuXHR9XHJcblxyXG59IiwiZXhwb3J0IGRlZmF1bHQgY2xhc3MgTm9pc2Uge1xyXG5cdGNvbnN0cnVjdG9yKGNvbnRleHQsIHR5cGUgPVwic2F3dG9vdGhcIikge1xyXG5cdFx0dGhpcy5jb250ZXh0ID0gY29udGV4dDtcclxuXHRcdHRoaXMudHlwZSA9IHR5cGU7XHJcblx0XHR0aGlzLm91dHB1dCA9IHRoaXMuY29udGV4dC5jcmVhdGVHYWluKCk7XHJcblx0XHR0aGlzLm91dHB1dC5nYWluLnZhbHVlID0gMDtcclxuXHRcdHRoaXMucGFydGlhbHMgPSBbXTtcclxuXHRcdHRoaXMudmFsdWUgPSAtMTtcclxuXHRcdHRoaXMuY2hhbm5lbEdhaW4gPSAwLjE7XHJcblx0XHR0aGlzLmxlbmd0aCA9IDI7XHJcblx0XHR0aGlzLmFtcEVudmVsb3BlID0ge1xyXG5cdFx0XHRhOiAwLFxyXG5cdFx0XHRkOiAwLjEsXHJcblx0XHRcdHM6IHRoaXMuY2hhbm5lbEdhaW4sXHJcblx0XHRcdHI6IDAuNFxyXG5cdFx0fTtcclxuXHJcblxyXG5cdFx0dGhpcy52b2ljZVBhcnRpYWxzKCk7XHJcblx0fVxyXG5cclxuXHR2b2ljZVBhcnRpYWxzKCkge1xyXG5cclxuXHRcdHZhciBsQnVmZmVyID0gbmV3IEZsb2F0MzJBcnJheSh0aGlzLmxlbmd0aCAqIDQ4MDAwKTtcclxuXHRcdHZhciByQnVmZmVyID0gbmV3IEZsb2F0MzJBcnJheSh0aGlzLmxlbmd0aCAqIDQ4MDAwKTtcclxuXHRcdGZvcihsZXQgaSA9IDA7IGkgPCB0aGlzLmxlbmd0aCAqIDQ4MDAwOyBpKyspIHtcclxuXHRcdFx0bEJ1ZmZlcltpXSA9IE1hdGgucmFuZG9tKCk7XHJcblx0XHRcdHJCdWZmZXJbaV0gPSBNYXRoLnJhbmRvbSgpO1xyXG5cdFx0fVxyXG5cdFx0bGV0IGJ1ZmZlcmN0eCA9IG5ldyBBdWRpb0NvbnRleHQoKTtcclxuXHRcdGxldCBidWZmZXIgPSB0aGlzLmNvbnRleHQuY3JlYXRlQnVmZmVyKDIsIHRoaXMubGVuZ3RoICogNDgwMDAsIDQ4MDAwKTtcclxuXHRcdGJ1ZmZlci5jb3B5VG9DaGFubmVsKGxCdWZmZXIsMCk7XHJcblx0XHRidWZmZXIuY29weVRvQ2hhbm5lbChyQnVmZmVyLDEpO1xyXG5cclxuXHRcdGxldCBvc2MgPSBuZXcgQXVkaW9CdWZmZXJTb3VyY2VOb2RlKHRoaXMuY29udGV4dCwge1xyXG5cdFx0XHRidWZmZXI6IGJ1ZmZlcixcclxuXHRcdFx0bG9vcDogdHJ1ZSxcclxuXHRcdFx0bG9vcFN0YXJ0OiAwLFxyXG5cdFx0XHRsb29wRW5kOiAyXHJcblx0XHR9KTtcclxuXHJcblx0XHRcdG9zYy5jb25uZWN0KHRoaXMub3V0cHV0KTtcclxuXHRcdHRoaXMucGFydGlhbHMucHVzaChvc2MpO1xyXG5cdH1cclxuXHJcblx0dHJpZ2dlcih2ZWxvY2l0eSkge1xyXG5cdFx0dGhpcy5wYXJ0aWFscy5mb3JFYWNoKChvc2MpID0+IG9zYy5zdGFydCh0aGlzLmNvbnRleHQuY3VycmVudFRpbWUpKTtcclxuXHRcdHRoaXMuc3RhcnQodGhpcy5jb250ZXh0LmN1cnJlbnRUaW1lKTtcclxuXHRcdGNvbnNvbGUubG9nKFwiVHJpZ2dlclwiLCB0aGlzKTtcclxuXHR9XHJcblxyXG5cdG9mZigpIHtcclxuXHRcdHJldHVybiB0aGlzLnN0b3AodGhpcy5jb250ZXh0LmN1cnJlbnRUaW1lKTtcclxuXHR9XHJcblxyXG5cdHN0YXJ0KHRpbWUpIHtcclxuXHRcdHRoaXMub3V0cHV0LmdhaW4udmFsdWUgPSAxO1xyXG5cdFx0dGhpcy5vdXRwdXQuZ2Fpbi5zZXRWYWx1ZUF0VGltZSgwLCB0aW1lKTtcclxuXHRcdHJldHVybiB0aGlzLm91dHB1dC5nYWluLnNldFRhcmdldEF0VGltZSh0aGlzLnN1c3RhaW4sIHRpbWUgKyB0aGlzLmF0dGFjaywgdGhpcy5kZWNheSArIDAuMDAxKTtcclxuXHR9XHJcblxyXG5cdHN0b3AodGltZSkge1xyXG5cdFx0dGhpcy52YWx1ZSA9IC0xO1xyXG5cdFx0dGhpcy5vdXRwdXQuZ2Fpbi5jYW5jZWxTY2hlZHVsZWRWYWx1ZXModGltZSk7XHJcblx0XHR0aGlzLm91dHB1dC5nYWluLnNldFZhbHVlQXRUaW1lKHRoaXMub3V0cHV0LmdhaW4udmFsdWUsIHRpbWUpO1xyXG5cdFx0dGhpcy5vdXRwdXQuZ2Fpbi5zZXRUYXJnZXRBdFRpbWUoMCwgdGltZSwgdGhpcy5yZWxlYXNlKTtcclxuXHRcdHRoaXMucGFydGlhbHMuZm9yRWFjaCgob3NjKSA9PiB7XHJcblx0XHRcdG9zYy5zdG9wKHRpbWUgKyB0aGlzLnJlbGVhc2UgKiA0KTtcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0c2V0IGF0dGFjayh2YWx1ZSkge1xyXG5cdFx0dGhpcy5hbXBFbnZlbG9wZS5hID0gdmFsdWU7XHJcblx0fVxyXG5cclxuXHRnZXQgYXR0YWNrKCkge1xyXG5cdFx0cmV0dXJuIHRoaXMuYW1wRW52ZWxvcGUuYTtcclxuXHR9XHJcblxyXG5cdHNldCBkZWNheSh2YWx1ZSkge1xyXG5cdFx0dGhpcy5hbXBFbnZlbG9wZS5kID0gdmFsdWU7XHJcblx0fVxyXG5cclxuXHRnZXQgZGVjYXkoKSB7XHJcblx0XHRyZXR1cm4gdGhpcy5hbXBFbnZlbG9wZS5kO1xyXG5cdH1cclxuXHJcblx0c2V0IHN1c3RhaW4odmFsdWUpIHtcclxuXHRcdHRoaXMuYW1wRW52ZWxvcGUucyA9IHZhbHVlO1xyXG5cdH1cclxuXHJcblx0Z2V0IHN1c3RhaW4oKSB7XHJcblx0XHRyZXR1cm4gdGhpcy5hbXBFbnZlbG9wZS5zO1xyXG5cdH1cclxuXHJcblx0c2V0IHJlbGVhc2UodmFsdWUpIHtcclxuXHRcdHRoaXMuYW1wRW52ZWxvcGUuciA9IHZhbHVlO1xyXG5cdH1cclxuXHJcblx0Z2V0IHJlbGVhc2UoKSB7XHJcblx0XHRyZXR1cm4gdGhpcy5hbXBFbnZlbG9wZS5yO1xyXG5cdH1cclxuXHJcblx0Y29ubmVjdChkZXN0aW5hdGlvbikge1xyXG5cdFx0dGhpcy5vdXRwdXQuY29ubmVjdChkZXN0aW5hdGlvbik7XHJcblx0fVxyXG59IiwiZXhwb3J0IGRlZmF1bHQgY2xhc3MgUGVyY3Vzc2lvblZvaWNlIHtcclxuXHRjb25zdHJ1Y3Rvcihjb250ZXh0LCB0eXBlID1cInNhd3Rvb3RoXCIpIHtcclxuXHRcdHRoaXMuY29udGV4dCA9IGNvbnRleHQ7XHJcblx0XHR0aGlzLnR5cGUgPSB0eXBlO1xyXG5cdFx0dGhpcy5vdXRwdXQgPSB0aGlzLmNvbnRleHQuY3JlYXRlR2FpbigpO1xyXG5cdFx0dGhpcy5vdXRwdXQuZ2Fpbi52YWx1ZSA9IDA7XHJcblx0XHR0aGlzLnBhcnRpYWxzID0gW107XHJcblx0XHR0aGlzLnZhbHVlID0gLTE7XHJcblx0XHR0aGlzLmNoYW5uZWxHYWluID0gMC4xO1xyXG5cdFx0dGhpcy5hbXBFbnZlbG9wZSA9IHtcclxuXHRcdFx0YTogMCxcclxuXHRcdFx0ZDogMC4xLFxyXG5cdFx0XHRzOiB0aGlzLmNoYW5uZWxHYWluLFxyXG5cdFx0XHRyOiAwLjVcclxuXHRcdH07XHJcblx0XHR0aGlzLnZvaWNlUGFydGlhbHMoKTtcclxuXHR9XHJcblxyXG5cdHZvaWNlUGFydGlhbHMoKSB7XHJcblx0XHRsZXQgb3NjID0gdGhpcy5jb250ZXh0LmNyZWF0ZU9zY2lsbGF0b3IoKTtcclxuXHRcdG9zYy50eXBlID0gdGhpcy50eXBlO1xyXG5cdFx0b3NjLmNvbm5lY3QodGhpcy5vdXRwdXQpO1xyXG5cdFx0b3NjLnN0YXJ0KHRoaXMuY29udGV4dC5jdXJyZW50VGltZSk7XHJcblx0XHR0aGlzLnBhcnRpYWxzLnB1c2gob3NjKTtcclxuXHR9XHJcblxyXG5cdHRyaWdnZXIodmVsb2NpdHkpIHtcclxuXHRcdHRoaXMuc3RhcnQodGhpcy5jb250ZXh0LmN1cnJlbnRUaW1lKTtcclxuXHRcdGNvbnNvbGUubG9nKFwiVHJpZ2dlclwiLCB0aGlzKTtcclxuXHR9XHJcblxyXG5cdG9mZigpIHtcclxuXHRcdHJldHVybiB0aGlzLnN0b3AodGhpcy5jb250ZXh0LmN1cnJlbnRUaW1lKTtcclxuXHR9XHJcblxyXG5cdHN0YXJ0KHRpbWUpIHtcclxuXHRcdHRoaXMub3V0cHV0LmdhaW4udmFsdWUgPSAxO1xyXG5cdFx0dGhpcy5vdXRwdXQuZ2Fpbi5zZXRWYWx1ZUF0VGltZSgwLCB0aW1lKTtcclxuXHRcdHJldHVybiB0aGlzLm91dHB1dC5nYWluLnNldFRhcmdldEF0VGltZSh0aGlzLnN1c3RhaW4sIHRpbWUgKyB0aGlzLmF0dGFjaywgdGhpcy5kZWNheSArIDAuMDAxKTtcclxuXHR9XHJcblxyXG5cdHN0b3AodGltZSkge1xyXG5cdFx0dGhpcy52YWx1ZSA9IC0xO1xyXG5cdFx0dGhpcy5vdXRwdXQuZ2Fpbi5jYW5jZWxTY2hlZHVsZWRWYWx1ZXModGltZSk7XHJcblx0XHR0aGlzLm91dHB1dC5nYWluLnNldFZhbHVlQXRUaW1lKHRoaXMub3V0cHV0LmdhaW4udmFsdWUsIHRpbWUpO1xyXG5cdFx0dGhpcy5vdXRwdXQuZ2Fpbi5zZXRUYXJnZXRBdFRpbWUoMCwgdGltZSwgdGhpcy5yZWxlYXNlKTtcclxuXHRcdHRoaXMucGFydGlhbHMuZm9yRWFjaCgob3NjKSA9PiB7XHJcblx0XHRcdG9zYy5zdG9wKHRpbWUgKyB0aGlzLnJlbGVhc2UgKiA0KTtcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0c2V0IGF0dGFjayh2YWx1ZSkge1xyXG5cdFx0dGhpcy5hbXBFbnZlbG9wZS5hID0gdmFsdWU7XHJcblx0fVxyXG5cclxuXHRnZXQgYXR0YWNrKCkge1xyXG5cdFx0cmV0dXJuIHRoaXMuYW1wRW52ZWxvcGUuYTtcclxuXHR9XHJcblxyXG5cdHNldCBkZWNheSh2YWx1ZSkge1xyXG5cdFx0dGhpcy5hbXBFbnZlbG9wZS5kID0gdmFsdWU7XHJcblx0fVxyXG5cclxuXHRnZXQgZGVjYXkoKSB7XHJcblx0XHRyZXR1cm4gdGhpcy5hbXBFbnZlbG9wZS5kO1xyXG5cdH1cclxuXHJcblx0c2V0IHN1c3RhaW4odmFsdWUpIHtcclxuXHRcdHRoaXMuYW1wRW52ZWxvcGUucyA9IHZhbHVlO1xyXG5cdH1cclxuXHJcblx0Z2V0IHN1c3RhaW4oKSB7XHJcblx0XHRyZXR1cm4gdGhpcy5hbXBFbnZlbG9wZS5zO1xyXG5cdH1cclxuXHJcblx0c2V0IHJlbGVhc2UodmFsdWUpIHtcclxuXHRcdHRoaXMuYW1wRW52ZWxvcGUuciA9IHZhbHVlO1xyXG5cdH1cclxuXHJcblx0Z2V0IHJlbGVhc2UoKSB7XHJcblx0XHRyZXR1cm4gdGhpcy5hbXBFbnZlbG9wZS5yO1xyXG5cdH1cclxuXHJcblx0Y29ubmVjdChkZXN0aW5hdGlvbikge1xyXG5cdFx0dGhpcy5vdXRwdXQuY29ubmVjdChkZXN0aW5hdGlvbik7XHJcblx0fVxyXG59IiwiaW1wb3J0IEFtcEVudmVsb3BlIGZyb20gXCIuLi9Db21wb25lbnRzL0FtcEVudmVsb3BlXCI7XHJcblxyXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBWb2ljZSB7XHJcblx0Y29uc3RydWN0b3IoY29udGV4dCwgdHlwZSA9XCJzYXd0b290aFwiKSB7XHJcblx0XHR0aGlzLmNvbnRleHQgPSBjb250ZXh0O1xyXG5cdFx0dGhpcy50eXBlID0gdHlwZTtcclxuXHRcdHRoaXMudmFsdWUgPSAtMTtcclxuXHRcdHRoaXMuZ2FpbiA9IDAuMTtcclxuXHRcdHRoaXMub3V0cHV0ID0gdGhpcy5jb250ZXh0LmNyZWF0ZUdhaW4oKTtcclxuXHRcdHRoaXMucGFydGlhbHMgPSBbXTtcclxuXHRcdHRoaXMub3V0cHV0LmdhaW4udmFsdWUgPSB0aGlzLmdhaW47XHJcblx0XHR0aGlzLmFtcEVudmVsb3BlID0gbmV3IEFtcEVudmVsb3BlKHRoaXMuY29udGV4dCk7XHJcblx0XHR0aGlzLmFtcEVudmVsb3BlLmNvbm5lY3QodGhpcy5vdXRwdXQpO1xyXG5cdFx0dGhpcy52b2ljZVBhcnRpYWxzKCk7XHJcblx0fVxyXG5cclxuXHR2b2ljZVBhcnRpYWxzKCkge1xyXG5cdFx0bGV0IG9zYyA9IHRoaXMuY29udGV4dC5jcmVhdGVPc2NpbGxhdG9yKCk7XHJcblx0XHRcdG9zYy50eXBlID0gdGhpcy50eXBlO1xyXG5cdFx0XHRvc2MuY29ubmVjdCh0aGlzLmFtcEVudmVsb3BlLm91dHB1dCk7XHJcblx0XHRcdG9zYy5zdGFydCh0aGlzLmNvbnRleHQuY3VycmVudFRpbWUpO1xyXG5cdFx0dGhpcy5wYXJ0aWFscy5wdXNoKG9zYyk7XHJcblx0fVxyXG5cclxuXHRvbihNaWRpRXZlbnQpIHtcclxuXHRcdHRoaXMudmFsdWUgPSBNaWRpRXZlbnQudmFsdWU7XHJcblx0XHR0aGlzLnBhcnRpYWxzLmZvckVhY2goKG9zYykgPT4ge1xyXG5cdFx0XHRvc2MuZnJlcXVlbmN5LnZhbHVlID0gTWlkaUV2ZW50LmZyZXF1ZW5jeTtcclxuXHRcdH0pO1xyXG5cdFx0dGhpcy5hbXBFbnZlbG9wZS5vbihNaWRpRXZlbnQudmVsb2NpdHkpO1xyXG5cdH1cclxuXHJcblx0b2ZmKE1pZGlFdmVudCkge1xyXG5cdFx0dGhpcy5hbXBFbnZlbG9wZS5vZmYoTWlkaUV2ZW50KTtcclxuXHRcdHRoaXMucGFydGlhbHMuZm9yRWFjaCgob3NjKSA9PiB7XHJcblx0XHRcdG9zYy5zdG9wKHRoaXMuY29udGV4dC5jdXJyZW50VGltZSArIHRoaXMuYW1wRW52ZWxvcGUucmVsZWFzZSAqIDQpO1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHRjb25uZWN0KGRlc3RpbmF0aW9uKSB7XHJcblx0XHR0aGlzLm91dHB1dC5jb25uZWN0KGRlc3RpbmF0aW9uKTtcclxuXHR9XHJcbn0iXX0=
