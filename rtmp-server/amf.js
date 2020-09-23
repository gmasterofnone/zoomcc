var amf3dRules = {
  0x00: amf3decUndefined,
  0x01: amf3decNull,
  0x02: amf3decFalse,
  0x03: amf3decTrue,
  0x04: amf3decInteger,
  0x05: amf3decDouble,
  0x06: amf3decString,
  0x07: amf3decXmlDoc,
  0x08: amf3decDate,
  0x09: amf3decArray,
  0x0A: amf3decObject,
  0x0B: amf3decXml,
  0x0C: amf3decByteArray //,
  //    0x0D: amf3decVecInt,
  //    0x0E: amf3decVecUInt,
  //    0x0F: amf3decVecDouble,
  //    0x10: amf3decVecObject,
  //    0x11: amf3decDict // No dictionary support for the moment!
};

var amf3eRules = {
  'string': amf3encString,
  'integer': amf3encInteger,
  'double': amf3encDouble,
  'xml': amf3encXmlDoc,
  'object': amf3encObject,
  'array': amf3encArray,
  'sarray': amf3encArray,
  'binary': amf3encByteArray,
  'true': amf3encTrue,
  'false': amf3encFalse,
  'undefined': amf3encUndefined,
  'null': amf3encNull
};

var amf0dRules = {
  0x00: amf0decNumber,
  0x01: amf0decBool,
  0x02: amf0decString,
  0x03: amf0decObject,
  //    0x04: amf0decMovie, // Reserved
  0x05: amf0decNull,
  0x06: amf0decUndefined,
  0x07: amf0decRef,
  0x08: amf0decArray,
  // 0x09: amf0decObjEnd, // Should never happen normally
  0x0A: amf0decSArray,
  0x0B: amf0decDate,
  0x0C: amf0decLongString,
  //    0x0D: amf0decUnsupported, // Has been never originally implemented by Adobe!
  //    0x0E: amf0decRecSet, // Has been never originally implemented by Adobe!
  0x0F: amf0decXmlDoc,
  0x10: amf0decTypedObj
};

var amf0eRules = {
  'string': amf0encString,
  'integer': amf0encNumber,
  'double': amf0encNumber,
  'xml': amf0encXmlDoc,
  'object': amf0encObject,
  'array': amf0encArray,
  'sarray': amf0encSArray,
  'binary': amf0encString,
  'true': amf0encBool,
  'false': amf0encBool,
  'undefined': amf0encUndefined,
  'null': amf0encNull
};

function amfType(o) {
  var jsType = typeof o;

  if (o === null) return 'null';
  if (jsType == 'undefined') return 'undefined';
  if (jsType == 'number') {
    if (parseInt(o) == o) return 'integer';
    return 'double';
  }
  if (jsType == 'boolean') return o ? 'true' : 'false';
  if (jsType == 'string') return 'string';
  if (jsType == 'object') {
    if (o instanceof Array) {
      if (o.sarray) return 'sarray';
      return 'array';
    }
    return 'object';
  }
  throw new Error('Unsupported type!')
}

// AMF3 implementation

/**
 * AMF3 Decode undefined value
 * @returns {{len: number, value: undefined}}
 */
function amf3decUndefined() {
  return {
    len: 1,
    value: undefined
  }
}

/**
 * AMF3 Encode undefined value
 * @returns {Buffer}
 */
function amf3encUndefined() {
  var buf = Buffer.alloc(1);
  buf.writeUInt8(0x00);
  return buf;
}

/**
 * AMF3 Decode null
 * @returns {{len: number, value: null}}
 */
function amf3decNull() {
  return {
    len: 1,
    value: null
  }
}

/**
 * AMF3 Encode null
 * @returns {Buffer}
 */
function amf3encNull() {
  var buf = Buffer.alloc(1);
  buf.writeUInt8(0x01);
  return buf;
}

/**
 * AMF3 Decode false
 * @returns {{len: number, value: boolean}}
 */
function amf3decFalse() {
  return {
    len: 1,
    value: false
  }
}

/**
 * AMF3 Encode false
 * @returns {Buffer}
 */
function amf3encFalse() {
  var buf = Buffer.alloc(1);
  buf.writeUInt8(0x02);
  return buf;
}

/**
 * AMF3 Decode true
 * @returns {{len: number, value: boolean}}
 */
function amf3decTrue() {
  return {
    len: 1,
    value: true
  }
}

/**
 * AMF3 Encode true
 * @returns {Buffer}
 */
function amf3encTrue() {
  var buf = Buffer.alloc(1);
  buf.writeUInt8(0x03);
  return buf;
}

/**
 * Generic decode of AMF3 UInt29 values
 * @param buf
 * @returns {{len: number, value: number}}
 */
function amf3decUI29(buf) {
  var val = 0;
  var len = 1;
  var b;

  do {
    b = buf.readUInt8(len++);
    val = (val << 7) + (b & 0x7F);
  } while (len < 5 || b > 0x7F);

  if (len == 5) val = val | b; // Preserve the major bit of the last byte

  return {
    len: len,
    value: val
  }
}

/**
 * Generic encode of AMF3 UInt29 value
 * @param num
 * @returns {Buffer}
 */
function amf3encUI29(num) {
  var len = 0;
  if (num < 0x80) len = 1;
  if (num < 0x4000) len = 2;
  if (num < 0x200000) len = 3;
  if (num >= 0x200000) len = 4;
  var buf = Buffer.alloc(len);
  switch (len) {
    case 1:
      buf.writeUInt8(num, 0);
      break;
    case 2:
      buf.writeUInt8(num & 0x7F, 0);
      buf.writeUInt8((num >> 7) | 0x80, 1);
      break;
    case 3:
      buf.writeUInt8(num & 0x7F, 0);
      buf.writeUInt8((num >> 7) & 0x7F, 1);
      buf.writeUInt8((num >> 14) | 0x80, 2);
      break;
    case 4:
      buf.writeUInt8(num & 0xFF, 0);
      buf.writeUInt8((num >> 8) & 0x7F, 1);
      buf.writeUInt8((num >> 15) | 0x7F, 2);
      buf.writeUInt8((num >> 22) | 0x7F, 3);
      break;
  }
  return buf;
}

/**
 * AMF3 Decode an integer
 * @param buf
 * @returns {{len: number, value: number}}
 */
function amf3decInteger(buf) { // Invert the integer
  var resp = amf3decUI29(buf);
  if (resp.value > 0x0FFFFFFF) resp.value = (resp.value & 0x0FFFFFFF) - 0x10000000;
  return resp;
}

/**
 * AMF3 Encode an integer
 * @param num
 * @returns {Buffer}
 */
function amf3encInteger(num) {
  var buf = Buffer.alloc(1);
  buf.writeUInt8(0x4, 0);
  return Buffer.concat([buf, amf3encUI29(num & 0x3FFFFFFF)]); // This AND will auto convert the
                                                              // sign bit!
}

/**
 * AMF3 Decode String
 * @param buf
 * @returns {{len: *, value: (*|String)}}
 */
function amf3decString(buf) {
  var sLen = amf3decUI29(buf);
  var s = sLen & 1;
  sLen = sLen >> 1; // The real length without the lowest bit
  if (s) return {
    len: sLen.value + 5,
    value: buf.slice(5, sLen.value + 5).toString('utf8')
  };
  throw new Error("Error, we have a need to decode a String that is a Reference"); // TODO:
                                                                                   // Implement
                                                                                   // references!
}

/**
 * AMF3 Encode String
 * @param str
 * @returns {Buffer}
 */
function amf3encString(str) {
  var sLen = amf3encUI29(str.length << 1);
  var buf = Buffer.alloc(1);
  buf.writeUInt8(0x6, 0);
  return Buffer.concat([buf, sLen, Buffer.from(str, 'utf8')]);
}

/**
 * AMF3 Decode XMLDoc
 * @param buf
 * @returns {{len: *, value: (*|String)}}
 */
function amf3decXmlDoc(buf) {
  var sLen = amf3decUI29(buf);
  var s = sLen & 1;
  sLen = sLen >> 1; // The real length without the lowest bit
  if (s) return {
    len: sLen.value + 5,
    value: buf.slice(5, sLen.value + 5).toString('utf8')
  };
  throw new Error("Error, we have a need to decode a String that is a Reference"); // TODO:
                                                                                   // Implement
                                                                                   // references!
}

/**
 * AMF3 Encode XMLDoc
 * @param str
 * @returns {Buffer}
 */
function amf3encXmlDoc(str) {
  var sLen = amf3encUI29(str.length << 1);
  var buf = Buffer.alloc(1);
  buf.writeUInt8(0x7, 0);
  return Buffer.concat([buf, sLen, Buffer.from(str, 'utf8')]);
}

/**
 * AMF3 Decode Generic XML
 * @param buf
 * @returns {{len: *, value: (*|String)}}
 */
function amf3decXml(buf) {
  var sLen = amf3decUI29(buf);
  var s = sLen & 1;
  sLen = sLen >> 1; // The real length without the lowest bit
  if (s) return {
    len: sLen.value + 5,
    value: buf.slice(5, sLen.value + 5).toString('utf8')
  };
  throw new Error("Error, we have a need to decode a String that is a Reference"); // TODO:
                                                                                   // Implement
                                                                                   // references!
}

/**
 * AMF3 Encode Generic XML
 * @param str
 * @returns {Buffer}
 */
function amf3encXml(str) {
  var sLen = amf3encUI29(str.length << 1);
  var buf = Buffer.alloc(1);
  buf.writeUInt8(0x0B, 0);
  return Buffer.concat([buf, sLen, Buffer.from(str, 'utf8')]);
}

/**
 * AMF3 Decide Byte Array
 * @param buf
 * @returns {{len: *, value: (Array|string|*|Buffer|Blob)}}
 */
function amf3decByteArray(buf) {
  var sLen = amf3decUI29(buf);
  var s = sLen & 1; // TODO: Check if we follow the same rule!
  sLen = sLen >> 1; // The real length without the lowest bit
  if (s) return {
    len: sLen.value + 5,
    value: buf.slice(5, sLen.value + 5)
  };
  throw new Error("Error, we have a need to decode a String that is a Reference"); // TODO:
                                                                                   // Implement
                                                                                   // references!
}

/**
 * AMF3 Encode Byte Array
 * @param str
 * @returns {Buffer}
 */
function amf3encByteArray(str) {
  var sLen = amf3encUI29(str.length << 1);
  var buf = Buffer.alloc(1);
  buf.writeUInt8(0x0C, 0);
  return Buffer.concat([buf, sLen, (typeof str == 'string') ? Buffer.from(str, 'binary') : str]);
}

/**
 * AMF3 Decode Double
 * @param buf
 * @returns {{len: number, value: (*|Number)}}
 */
function amf3decDouble(buf) {
  return {
    len: 9,
    value: buf.readDoubleBE(1)
  }
}

/**
 * AMF3 Encode Double
 * @param num
 * @returns {Buffer}
 */
function amf3encDouble(num) {
  var buf = Buffer.alloc(9);
  buf.writeUInt8(0x05, 0);
  buf.writeDoubleBE(num, 1);
  return buf;
}

/**
 * AMF3 Decode Date
 * @param buf
 * @returns {{len: *, value: (*|Number)}}
 */
function amf3decDate(buf) { // The UI29 should be 1
  var uTz = amf3decUI29(buf);
  var ts = buf.readDoubleBE(uTz.len);
  return {
    len: uTz.len + 8,
    value: ts
  }
}

/**
 * AMF3 Encode Date
 * @param ts
 * @returns {Buffer}
 */
function amf3encDate(ts) {
  var buf = Buffer.alloc(1);
  buf.writeUInt8(0x8, 0);
  var tsBuf = Buffer.alloc(8);
  tsBuf.writeDoubleBE(ts, 0);
  return Buffer.concat([buf, amf3encUI29(1), tsBuf]); // We always do 1
}

/**
 * AMF3 Decode Array
 * @param buf
 * @returns {{len: *, value: *}}
 */
function amf3decArray(buf) {
  var count = amf3decUI29(buf.slice(1));
  var obj = amf3decObject(buf.slice(count.len));
  if (count.value % 2 == 1) throw new Error("This is a reference to another array, which currently we don't support!");
  return {
    len: count.len + obj.len,
    value: obj.value
  }
}

/**
 * AMF3 Encode Array
 */
function amf3encArray() {
  throw new Error('Encoding arrays is not supported yet!'); // TODO: Implement encoding of arrays
}

/**
 * AMF3 Decode Object
 * @param buf
 */
function amf3decObject(buf) {

}

/**
 * AMF3 Encode Object
 * @param o
 */
function amf3encObject(o) {

}

// AMF0 Implementation

/**
 * AMF0 Decode Number
 * @param buf
 * @returns {{len: number, value: (*|Number)}}
 */
function amf0decNumber(buf) {
  return {
    len: 9,
    value: buf.readDoubleBE(1)
  }
}

/**
 * AMF0 Encode Number
 * @param num
 * @returns {Buffer}
 */
function amf0encNumber(num) {
  var buf = Buffer.alloc(9);
  buf.writeUInt8(0x00, 0);
  buf.writeDoubleBE(num, 1);
  return buf;
}

/**
 * AMF0 Decode Boolean
 * @param buf
 * @returns {{len: number, value: boolean}}
 */
function amf0decBool(buf) {
  return {
    len: 2,
    value: (buf.readUInt8(1) != 0)
  }
}

/**
 * AMF0 Encode Boolean
 * @param num
 * @returns {Buffer}
 */
function amf0encBool(num) {
  var buf = Buffer.alloc(2);
  buf.writeUInt8(0x01, 0);
  buf.writeUInt8((num ? 1 : 0), 1);
  return buf;
}

/**
 * AMF0 Decode Null
 * @returns {{len: number, value: null}}
 */
function amf0decNull() {
  return {
    len: 1,
    value: null
  }
}

/**
 * AMF0 Encode Null
 * @returns {Buffer}
 */
function amf0encNull() {
  var buf = Buffer.alloc(1);
  buf.writeUInt8(0x05, 0);
  return buf;
}

/**
 * AMF0 Decode Undefined
 * @returns {{len: number, value: undefined}}
 */
function amf0decUndefined() {
  return {
    len: 1,
    value: undefined
  }
}

/**
 * AMF0 Encode Undefined
 * @returns {Buffer}
 */
function amf0encUndefined() {
  var buf = Buffer.alloc(1);
  buf.writeUInt8(0x06, 0);
  return buf;
}

/**
 * AMF0 Decode Date
 * @param buf
 * @returns {{len: number, value: (*|Number)}}
 */
function amf0decDate(buf) {
  //    var s16 = buf.readInt16BE(1);
  var ts = buf.readDoubleBE(3);
  return {
    len: 11,
    value: ts
  }
}

/**
 * AMF0 Encode Date
 * @param ts
 * @returns {Buffer}
 */
function amf0encDate(ts) {
  var buf = Buffer.alloc(11);
  buf.writeUInt8(0x0B, 0);
  buf.writeInt16BE(0, 1);
  buf.writeDoubleBE(ts, 3);
  return buf;
}

/**
 * AMF0 Decode Object
 * @param buf
 * @returns {{len: number, value: {}}}
 */
function amf0decObject(buf) { // TODO: Implement references!
  var obj = {};
  var iBuf = buf.slice(1);
  var len = 1;
  //    console.log('ODec',iBuf.readUInt8(0));
  while (iBuf.readUInt8(0) != 0x09) {
    // console.log('Field', iBuf.readUInt8(0), iBuf);
    var prop = amf0decUString(iBuf);
    // console.log('Got field for property', prop);
    len += prop.len;
    if (iBuf.slice(prop.len).readUInt8(0) == 0x09) {
      len++;
      // console.log('Found the end property');
      break;
    } // END Object as value, we shall leave
    if (prop.value == '') break;
    var val = amf0DecodeOne(iBuf.slice(prop.len));
    // console.log('Got field for value', val);
    obj[prop.value] = val.value;
    len += val.len;
    iBuf = iBuf.slice(prop.len + val.len);
  }
  return {
    len: len,
    value: obj
  }
}

/**
 * AMF0 Encode Object
 */
function amf0encObject(o) {
  if (typeof o !== 'object') return;

  var data = Buffer.alloc(1);
  data.writeUInt8(0x03, 0); // Type object
  var k;
  for (k in o) {
    data = Buffer.concat([data, amf0encUString(k), amf0EncodeOne(o[k])]);
  }
  var termCode = Buffer.alloc(1);
  termCode.writeUInt8(0x09, 0);
  return Buffer.concat([data, amf0encUString(''), termCode]);
}

/**
 * AMF0 Decode Reference
 * @param buf
 * @returns {{len: number, value: string}}
 */
function amf0decRef(buf) {
  var index = buf.readUInt16BE(1);
  return {
    len: 3,
    value: 'ref' + index
  }
}

/**
 * AMF0 Encode Reference
 * @param index
 * @returns {Buffer}
 */
function amf0encRef(index) {
  var buf = Buffer.alloc(3);
  buf.writeUInt8(0x07, 0);
  buf.writeUInt16BE(index, 1);
  return buf;
}

/**
 * AMF0 Decode String
 * @param buf
 * @returns {{len: *, value: (*|string|String)}}
 */
function amf0decString(buf) {
  var sLen = buf.readUInt16BE(1);
  return {
    len: 3 + sLen,
    value: buf.toString('utf8', 3, 3 + sLen)
  }
}

/**
 * AMF0 Decode Untyped (without the type byte) String
 * @param buf
 * @returns {{len: *, value: (*|string|String)}}
 */
function amf0decUString(buf) {
  var sLen = buf.readUInt16BE(0);
  return {
    len: 2 + sLen,
    value: buf.toString('utf8', 2, 2 + sLen)
  }
}

/**
 * Do AMD0 Encode of Untyped String
 * @param s
 * @returns {Buffer}
 */
function amf0encUString(s) {
  var data = Buffer.from(s, 'utf8');
  var sLen = Buffer.alloc(2);
  sLen.writeUInt16BE(data.length, 0);
  return Buffer.concat([sLen, data]);
}

/**
 * AMF0 Encode String
 * @param str
 * @returns {Buffer}
 */
function amf0encString(str) {
  var buf = Buffer.alloc(3);
  buf.writeUInt8(0x02, 0);
  buf.writeUInt16BE(str.length, 1);
  return Buffer.concat([buf, Buffer.from(str, 'utf8')]);
}

/**
 * AMF0 Decode Long String
 * @param buf
 * @returns {{len: *, value: (*|string|String)}}
 */
function amf0decLongString(buf) {
  var sLen = buf.readUInt32BE(1);
  return {
    len: 5 + sLen,
    value: buf.toString('utf8', 5, 5 + sLen)
  }
}

/**
 * AMF0 Encode Long String
 * @param str
 * @returns {Buffer}
 */
function amf0encLongString(str) {
  var buf = Buffer.alloc(5);
  buf.writeUInt8(0x0C, 0);
  buf.writeUInt32BE(str.length, 1);
  return Buffer.concat([buf, Buffer.from(str, 'utf8')]);
}

/**
 * AMF0 Decode Array
 * @param buf
 * @returns {{len: *, value: ({}|*)}}
 */
function amf0decArray(buf) {
  //    var count = buf.readUInt32BE(1);
  var obj = amf0decObject(buf.slice(4));
  return {
    len: 5 + obj.len,
    value: obj.value
  }
}

/**
 * AMF0 Encode Array
 */
function amf0encArray(a) {
  var l = 0;
  if (a instanceof Array) l = a.length;
  else l = Object.keys(a).length;
  // console.log('Array encode', l, a);
  var buf = Buffer.alloc(5);
  buf.writeUInt8(8, 0);
  buf.writeUInt32BE(l, 1);
  var data = amf0encObject(a);
  return Buffer.concat([buf, data.slice(1)]);
}

/**
 * AMF0 Encode Binary Array into binary Object
 * @param aData
 * @returns {Buffer}
 */
function amf0cnvArray2Object(aData) {
  var buf = Buffer.alloc(1);
  buf.writeUInt8(0x3, 0); // Object id
  return Buffer.concat([buf, aData.slice(5)]);
}

/**
 * AMF0 Encode Binary Object into binary Array
 * @param oData
 * @returns {Buffer}
 */
function amf0cnvObject2Array(oData) {
  var buf = Buffer.alloc(5);
  var o = amf0decObject(oData);
  var l = Object.keys(o).length;
  buf.writeUInt32BE(l, 1);
  return Buffer.concat([buf, oData.slice(1)]);
}

/**
 * AMF0 Decode XMLDoc
 * @param buf
 * @returns {{len: *, value: (*|string|String)}}
 */
function amf0decXmlDoc(buf) {
  var sLen = buf.readUInt16BE(1);
  return {
    len: 3 + sLen,
    value: buf.toString('utf8', 3, 3 + sLen)
  }
}

/**
 * AMF0 Encode XMLDoc
 * @param str
 * @returns {Buffer}
 */
function amf0encXmlDoc(str) { // Essentially it is the same as string
  var buf = Buffer.alloc(3);
  buf.writeUInt8(0x0F, 0);
  buf.writeUInt16BE(str.length, 1);
  return Buffer.concat([buf, Buffer.alloc(str, 'utf8')]);
}

/**
 * AMF0 Decode Strict Array
 * @param buf
 * @returns {{len: number, value: Array}}
 */
function amf0decSArray(buf) {
  var a = [];
  var len = 5;
  var ret;
  for (var count = buf.readUInt32BE(1); count; count--) {
    ret = amf0DecodeOne(buf.slice(len));
    a.push(ret.value);
    len += ret.len;
  }
  return {
    len: len,
    value: amf0markSArray(a)
  }
}

/**
 * AMF0 Encode Strict Array
 * @param a Array
 */
function amf0encSArray(a) {
  // console.log('Do strict array!');
  var buf = Buffer.alloc(5);
  buf.writeUInt8(0x0A, 0);
  buf.writeUInt32BE(a.length, 1);
  var i;
  for (i = 0; i < a.length; i++) {
    buf = Buffer.concat([buf, amf0EncodeOne(a[i])]);
  }
  return buf;
}

function amf0markSArray(a) {
  Object.defineProperty(a, 'sarray', {
    value: true
  });
  return a;
}

/**
 * AMF0 Decode Typed Object
 * @param buf
 * @returns {{len: number, value: ({}|*)}}
 */
function amf0decTypedObj(buf) {
  var className = amf0decString(buf);
  var obj = amf0decObject(buf.slice(className.len - 1));
  obj.value.__className__ = className.value;
  return {
    len: className.len + obj.len - 1,
    value: obj.value
  }
}

/**
 * AMF0 Encode Typed Object
 */
function amf0encTypedObj() {
  throw new Error("Error: SArray encoding is not yet implemented!"); // TODO: Error
}

/**
 * Decode one value from the Buffer according to the applied rules
 * @param rules
 * @param buffer
 * @returns {*}
 */
function amfXDecodeOne(rules, buffer) {
  if (!rules[buffer.readUInt8(0)]) {
    // console.log('Unknown field', buffer.readUInt8(0));
    throw new Error("Error: Unknown field");
  }
  return rules[buffer.readUInt8(0)](buffer);
}

/**
 * Decode one AMF0 value
 * @param buffer
 * @returns {*}
 */
function amf0DecodeOne(buffer) {
  return amfXDecodeOne(amf0dRules, buffer);
}

/**
 * Decode one AMF3 value
 * @param buffer
 * @returns {*}
 */
function amf3DecodeOne(buffer) {
  return amfXDecodeOne(amf3dRules, buffer);
}

/**
 * Decode a whole buffer of AMF values according to rules and return in array
 * @param rules
 * @param buffer
 * @returns {Array}
 */
function amfXDecode(rules, buffer) {
  // We shall receive clean buffer and will respond with an array of values
  var resp = [];
  var res;
  for (var i = 0; i < buffer.length;) {
    res = amfXDecodeOne(rules, buffer.slice(i));
    i += res.len;
    resp.push(res.value); // Add the response
  }
  return resp;
}

/**
 * Decode a buffer of AMF3 values
 * @param buffer
 * @returns {Array}
 */
function amf3Decode(buffer) {
  return amfXDecode(amf3dRules, buffer);
}

/**
 * Decode a buffer of AMF0 values
 * @param buffer
 * @returns {Array}
 */
function amf0Decode(buffer) {
  return amfXDecode(amf0dRules, buffer);
}

/**
 * Encode one AMF value according to rules
 * @param rules
 * @param o
 * @returns {*}
 */
function amfXEncodeOne(rules, o) {
  //    console.log('amfXEncodeOne type',o,amfType(o),rules[amfType(o)]);
  var f = rules[amfType(o)];
  if (f) return f(o);
  throw new Error('Unsupported type for encoding!');
}

/**
 * Encode one AMF0 value
 * @param o
 * @returns {*}
 */
function amf0EncodeOne(o) {
  return amfXEncodeOne(amf0eRules, o);
}

/**
 * Encode one AMF3 value
 * @param o
 * @returns {*}
 */
function amf3EncodeOne(o) {
  return amfXEncodeOne(amf3eRules, o);
}

/**
 * Encode an array of values into a buffer
 * @param a
 * @returns {Buffer}
 */
function amf3Encode(a) {
  var buf = Buffer.alloc(0);
  a.forEach(function (o) {
    buf = Buffer.concat([buf, amf3EncodeOne(o)]);
  });
  return buf;
}

/**
 * Encode an array of values into a buffer
 * @param a
 * @returns {Buffer}
 */
function amf0Encode(a) {
  var buf = Buffer.alloc(0);
  a.forEach(function (o) {
    buf = Buffer.concat([buf, amf0EncodeOne(o)]);
  });
  return buf;
}


var rtmpCmdDecode = {
  "_result": ["transId", "cmdObj", "info"],
  "_error": ["transId", "cmdObj", "info", "streamId"], // Info / Streamid are optional
  "@setDataFrame": ["method", "cmdObj"],
  "onStatus": ["transId", "cmdObj", "info"],
  "releaseStream": ["transId", "cmdObj", "streamId"],
  "getStreamLength": ["transId", "cmdObj", "streamId"],
  "getMovLen": ["transId", "cmdObj", "streamId"],
  "FCPublish": ["transId", "cmdObj", "streamId"],
  "FCUnpublish": ["transId", "cmdObj", "streamId"],
  "onFCPublish": ["transId", "cmdObj", "info"],
  "connect": ["transId", "cmdObj", "args"],
  "call": ["transId", "cmdObj", "args"],
  "createStream": ["transId", "cmdObj"],
  "close": ["transId", "cmdObj"],
  "play": ["transId", "cmdObj", "streamName", "start", "duration", "reset"],
  "play2": ["transId", "cmdObj", "params"],
  "deleteStream": ["transId", "cmdObj", "streamId"],
  "receiveAudio": ["transId", "cmdObj", "bool"],
  "receiveVideo": ["transId", "cmdObj", "bool"],
  "publish": ["transId", "cmdObj", "streamName", "type"],
  "seek": ["transId", "cmdObj", "ms"],
  "pause": ["transId", "cmdObj", "pause", "ms"],
  "|RtmpSampleAccess": ["bool1", "bool2"],
  "onMetaData": ["cmdObj"]
};

/**
 * Decode a command!
 * @param dbuf
 * @returns {{cmd: (*|string|String|*), value: *}}
 */
function decodeAMF0Cmd(dbuf) {
  var buffer = dbuf;
  var resp = {};

  var cmd = amf0DecodeOne(buffer);
  resp.cmd = cmd.value;
  buffer = buffer.slice(cmd.len);

  if (rtmpCmdDecode[cmd.value]) {
    rtmpCmdDecode[cmd.value].forEach(function (n) {
      if (buffer.length > 0) {
        var r = amf0DecodeOne(buffer);
        buffer = buffer.slice(r.len);
        resp[n] = r.value;
      }
    });
  } else {
    // console.log('Unknown command', resp);
  }
  return resp
}

/**
 * Encode AMF0 Command
 * @param opt
 * @returns {*}
 */
function encodeAMF0Cmd(opt) {
  var data = amf0EncodeOne(opt.cmd);

  if (rtmpCmdDecode[opt.cmd]) {
    rtmpCmdDecode[opt.cmd].forEach(function (n) {
      if (opt.hasOwnProperty(n))
        data = Buffer.concat([data, amf0EncodeOne(opt[n])]);
    });
  } else {
    // console.log('Unknown command', opt);
  }
  // console.log('Encoded as',data.toString('hex'));
  return data
}

/**
 *
 * @param dbuf
 * @returns {{}}
 */
function decodeAMF3Cmd(dbuf) {
  var buffer = dbuf;
  var resp = {};

  var cmd = amf3DecodeOne(buffer);
  resp.cmd = cmd.value;
  buffer = buffer.slice(cmd.len);

  if (rtmpCmdDecode[cmd.value]) {
    rtmpCmdDecode[cmd.value].forEach(function (n) {
      if (buffer.length > 0) {
        var r = amf3DecodeOne(buffer);
        buffer = buffer.slice(r.len);
        resp[n] = r.value;
      }
    });
  } else {
    // console.log('Unknown command', resp);
  }
  return resp
}

/**
 * Encode AMF3 Command
 * @param opt
 * @returns {*}
 */
function encodeAMF3Cmd(opt) {
  var data = amf0EncodeOne(opt.cmd);

  if (rtmpCmdDecode[opt.cmd]) {
    rtmpCmdDecode[opt.cmd].forEach(function (n) {
      if (opt.hasOwnProperty(n))
        data = Buffer.concat([data, amf3EncodeOne(opt[n])]);
    });
  } else {
    // console.log('Unknown command', opt);
  }
  return data
}

module.exports = {
  decodeAmf3Cmd: decodeAMF3Cmd,
  encodeAmf3Cmd: encodeAMF3Cmd,
  decodeAmf0Cmd: decodeAMF0Cmd,
  encodeAmf0Cmd: encodeAMF0Cmd
};