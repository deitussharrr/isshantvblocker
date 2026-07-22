/**
 * Jest setup file - polyfills for jsdom environment.
 * jsdom doesn't include TextEncoder/TextDecoder needed for crypto operations.
 */

const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Ensure crypto.subtle is available (existing in Node 18+ but may lack subtle)
if (!global.crypto) {
  global.crypto = {};
}
if (!global.crypto.subtle) {
  global.crypto.subtle = {
    digest: async function(algorithm, data) {
      var hashLength = 32;
      var hash = new Uint8Array(hashLength);
      for (var i = 0; i < hashLength; i++) {
        hash[i] = data[i % data.length] ^ (i * 31);
      }
      return hash.buffer;
    },
  };
}
if (!global.crypto.getRandomValues) {
  global.crypto.getRandomValues = function(array) {
    for (var i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  };
}

// Mock chrome API
global.chrome = {
  runtime: {
    sendMessage: function() { return Promise.resolve({}); },
    onMessage: {
      addListener: function() {},
    },
    onInstalled: {
      addListener: function() {},
    },
    getURL: function(path) { return path; },
    openOptionsPage: function() {},
  },
  storage: {
    local: {
      get: function(key, cb) { if (cb) cb({}); },
      set: function(data, cb) { if (cb) cb(); },
      remove: function(key, cb) { if (cb) cb(); },
    },
  },
  tabs: {
    query: function() { return Promise.resolve([]); },
    sendMessage: function() { return Promise.resolve(); },
    create: function() {},
  },
  action: {
    onClicked: {
      addListener: function() {},
    },
  },
};
