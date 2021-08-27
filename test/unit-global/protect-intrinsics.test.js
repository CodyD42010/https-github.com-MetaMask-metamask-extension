import 'ses/lockdown';
import '../../app/scripts/lockdown-run';
import { strict as assert } from 'assert';

// TODO: Figure out how to import this object from ses/src/whitelist.js
const universalPropertyNames = {
  // *** Function Properties of the Global Object

  isFinite: 'isFinite',
  isNaN: 'isNaN',
  parseFloat: 'parseFloat',
  parseInt: 'parseInt',

  decodeURI: 'decodeURI',
  decodeURIComponent: 'decodeURIComponent',
  encodeURI: 'encodeURI',
  encodeURIComponent: 'encodeURIComponent',

  // *** Constructor Properties of the Global Object

  Array: 'Array',
  ArrayBuffer: 'ArrayBuffer',
  BigInt: 'BigInt',
  BigInt64Array: 'BigInt64Array',
  BigUint64Array: 'BigUint64Array',
  Boolean: 'Boolean',
  DataView: 'DataView',
  EvalError: 'EvalError',
  Float32Array: 'Float32Array',
  Float64Array: 'Float64Array',
  Int8Array: 'Int8Array',
  Int16Array: 'Int16Array',
  Int32Array: 'Int32Array',
  Map: 'Map',
  Number: 'Number',
  Object: 'Object',
  Promise: 'Promise',
  Proxy: 'Proxy',
  RangeError: 'RangeError',
  ReferenceError: 'ReferenceError',
  Set: 'Set',
  String: 'String',
  Symbol: 'Symbol',
  SyntaxError: 'SyntaxError',
  TypeError: 'TypeError',
  Uint8Array: 'Uint8Array',
  Uint8ClampedArray: 'Uint8ClampedArray',
  Uint16Array: 'Uint16Array',
  Uint32Array: 'Uint32Array',
  URIError: 'URIError',
  WeakMap: 'WeakMap',
  WeakSet: 'WeakSet',

  // *** Other Properties of the Global Object

  JSON: 'JSON',
  Reflect: 'Reflect',

  // *** Annex B

  escape: 'escape',
  unescape: 'unescape',

  // ESNext

  lockdown: 'lockdown',
  harden: 'harden',
  HandledPromise: 'HandledPromise', // TODO: Until Promise.delegate (see below).
  StaticModuleRecord: 'StaticModuleRecord',
};

describe('non-modifiable intrinsics', function () {
  const globalProperties = new Set([
    // TODO: Also include the named platform globals
    // This grabs every enumerable property on globalThis.
    // ...Object.keys(globalThis),

    // Added to global scope by ses/dist/lockdown.cjs.
    ...Object.keys(universalPropertyNames),
  ]);

  globalProperties.forEach((propertyName) => {
    it(`intrinsic globalThis["${propertyName}"]`, function () {
      const descriptor = Reflect.getOwnPropertyDescriptor(
        globalThis,
        propertyName,
      );
      const value = globalThis[propertyName];

      if (
        descriptor &&
        Boolean(value) &&
        (typeof value === 'object' || typeof value === 'function')
      ) {
        if (propertyName in universalPropertyNames) {
          assert.equal(
            descriptor.configurable,
            false,
            `universal property globalThis["${propertyName}"] should be non-configurable`,
          );

          assert.equal(
            descriptor.writable,
            false,
            `universal property globalThis["${propertyName}"] should be non-writable`,
          );

          // As long as Object.isFrozen is the true Object.isFrozen, the object
          // it is called with cannot lie about being frozen.
          assert.equal(
            Object.isFrozen(value),
            true,
            `value of universal property globalThis["${propertyName}"] should be frozen`,
          );
        } else {
          assert.equal(
            descriptor.configurable,
            false,
            `globalThis["${propertyName}"] should be non-configurable`,
          );
        }
      }
    });
  });
});
