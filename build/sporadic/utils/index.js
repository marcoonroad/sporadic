/* eslint-env node, es6 */

'use strict';

const defer = () => {
  const self = {};
  const result = {};

  result.changed = false;

  result.promise = new Promise((resolve, reject) => {
    self.resolve = resolve;
    self.reject = reject;
  });

  result.resolve = value => {
    if (result.changed) {
      return;
    }

    result.changed = true;
    self.resolve(value);
  };

  result.reject = reason => {
    if (result.changed) {
      return;
    }

    result.changed = true;
    self.reject(reason);
  };

  return result;
};

const resolved = value => new Promise(resolve => resolve(value));

const rejected = reason => new Promise((resolve, reject) => reject(reason));

module.exports.defer = defer;
module.exports.resolved = resolved;
module.exports.rejected = rejected;