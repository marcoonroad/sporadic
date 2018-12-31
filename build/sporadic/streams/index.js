/* eslint-env node, es6 */

'use strict';

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

var utils = require('../utils');

// needed to perform asynchronous recursion, see function below
var _create = null;

_create = function create() {
  var _utils$defer = utils.defer(),
      promise = _utils$defer.promise,
      resolve = _utils$defer.resolve,
      reject = _utils$defer.reject;

  var broken = false;
  var produced = false;
  var next = promise.then(_create);

  var stream = {
    current: promise,
    next: next,
    resolve: resolve,
    reject: reject,
    produced: produced,
    broken: broken
  };

  return stream;
};

// unit -> stream promise
var open = function open() {
  return utils.resolved(_create());
};

// stream -> (value * stream) promise
// may throws reason
var pull = function () {
  var _ref = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee(stream) {
    var current, next;
    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            _context.next = 2;
            return stream.current;

          case 2:
            current = _context.sent;
            _context.next = 5;
            return stream.next;

          case 5:
            next = _context.sent;
            return _context.abrupt('return', {
              current: current,
              next: next
            });

          case 7:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, undefined);
  }));

  return function pull(_x) {
    return _ref.apply(this, arguments);
  };
}();

var available = function () {
  var _ref2 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee2(stream) {
    var point, _ref3, next;

    return regeneratorRuntime.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            point = stream;

          case 1:
            if (!(point.produced && !point.broken)) {
              _context2.next = 9;
              break;
            }

            _context2.next = 4;
            return pull(point);

          case 4:
            _ref3 = _context2.sent;
            next = _ref3.next;


            point = next;
            _context2.next = 1;
            break;

          case 9:
            return _context2.abrupt('return', point);

          case 10:
          case 'end':
            return _context2.stop();
        }
      }
    }, _callee2, undefined);
  }));

  return function available(_x2) {
    return _ref2.apply(this, arguments);
  };
}();

// stream * value -> stream promise
var push = function () {
  var _ref4 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee3(stream, value) {
    var point, result;
    return regeneratorRuntime.wrap(function _callee3$(_context3) {
      while (1) {
        switch (_context3.prev = _context3.next) {
          case 0:
            _context3.next = 2;
            return available(stream);

          case 2:
            point = _context3.sent;


            point.resolve(value);
            point.produced = true;

            _context3.next = 7;
            return point.next;

          case 7:
            result = _context3.sent;
            return _context3.abrupt('return', result);

          case 9:
          case 'end':
            return _context3.stop();
        }
      }
    }, _callee3, undefined);
  }));

  return function push(_x3, _x4) {
    return _ref4.apply(this, arguments);
  };
}();

// stream * reason -> void promise
// never returns, throws reason
var close = function () {
  var _ref5 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee4(stream, reason) {
    var point;
    return regeneratorRuntime.wrap(function _callee4$(_context4) {
      while (1) {
        switch (_context4.prev = _context4.next) {
          case 0:
            _context4.next = 2;
            return available(stream);

          case 2:
            point = _context4.sent;

            if (!point.broken) {
              _context4.next = 8;
              break;
            }

            _context4.next = 6;
            return point.next;

          case 6:
            _context4.next = 12;
            break;

          case 8:
            point.reject(reason);
            point.produced = true;
            point.broken = true;

            throw reason;

          case 12:
          case 'end':
            return _context4.stop();
        }
      }
    }, _callee4, undefined);
  }));

  return function close(_x5, _x6) {
    return _ref5.apply(this, arguments);
  };
}();

module.exports.open = open;
module.exports.push = push;
module.exports.pull = pull;
module.exports.close = close;