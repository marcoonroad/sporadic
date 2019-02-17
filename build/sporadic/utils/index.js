/* eslint-env node, es6 */

'use strict';

var defer = function defer() {
  var self = {};
  var result = {};

  result.changed = false;

  result.promise = new Promise(function (resolve, reject) {
    self.resolve = resolve;
    self.reject = reject;
  });

  result.resolve = function (value) {
    if (result.changed) {
      return;
    }

    result.changed = true;
    self.resolve(value);
  };

  result.reject = function (reason) {
    if (result.changed) {
      return;
    }

    result.changed = true;
    self.reject(reason);
  };

  return result;
};

var resolved = function resolved(value) {
  return new Promise(function (resolve) {
    return resolve(value);
  });
};

var rejected = function rejected(reason) {
  return new Promise(function (resolve, reject) {
    return reject(reason);
  });
};

var timestamp = function timestamp() {
  return new Date().getTime();
};

module.exports.defer = defer;
module.exports.resolved = resolved;
module.exports.rejected = rejected;
module.exports.timestamp = timestamp;