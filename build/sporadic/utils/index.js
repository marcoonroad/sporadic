/* eslint-env node, es6 */

'use strict';

var defer = function defer() {
  var self = {};

  self.promise = new Promise(function (resolve, reject) {
    self.resolve = resolve;
    self.reject = reject;
  });

  return self;
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

module.exports.defer = defer;
module.exports.resolved = resolved;
module.exports.rejected = rejected;