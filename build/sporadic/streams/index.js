/* eslint-env node, es6 */

'use strict';

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

var utils = require('../utils');

var error = function error() {
  return Error('Stream is closed!');
};

// needed to perform asynchronous recursion, see function below
var _create = null;

_create = function create(finalizer) {
  var _utils$defer = utils.defer(),
      promise = _utils$defer.promise,
      resolve = _utils$defer.resolve,
      reject = _utils$defer.reject;

  var broken = false;
  var produced = false;
  var next = promise.then(function () {
    return _create(finalizer);
  });

  var stream = {
    current: promise,
    next: next,
    resolve: resolve,
    reject: reject,
    produced: produced,
    broken: broken,
    finalizer: finalizer
  };

  return stream;
};

// unit -> stream promise
var open = function open(finalizer) {
  return utils.resolved(_create(finalizer));
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
    var point;
    return regeneratorRuntime.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            point = stream;

          case 1:
            if (!(point.produced && !point.broken)) {
              _context2.next = 7;
              break;
            }

            _context2.next = 4;
            return point.next;

          case 4:
            point = _context2.sent;
            _context2.next = 1;
            break;

          case 7:
            return _context2.abrupt('return', { point: point });

          case 8:
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
  var _ref3 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee3(stream, value) {
    var _ref4, point, result;

    return regeneratorRuntime.wrap(function _callee3$(_context3) {
      while (1) {
        switch (_context3.prev = _context3.next) {
          case 0:
            _context3.next = 2;
            return available(stream);

          case 2:
            _ref4 = _context3.sent;
            point = _ref4.point;


            point.resolve(value);
            point.produced = true;

            _context3.next = 8;
            return point.next;

          case 8:
            result = _context3.sent;
            return _context3.abrupt('return', result);

          case 10:
          case 'end':
            return _context3.stop();
        }
      }
    }, _callee3, undefined);
  }));

  return function push(_x3, _x4) {
    return _ref3.apply(this, arguments);
  };
}();

// stream * reason -> void promise
// never returns, throws reason
var close = function () {
  var _ref5 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee4(stream) {
    var _ref6, point;

    return regeneratorRuntime.wrap(function _callee4$(_context4) {
      while (1) {
        switch (_context4.prev = _context4.next) {
          case 0:
            _context4.next = 2;
            return available(stream);

          case 2:
            _ref6 = _context4.sent;
            point = _ref6.point;

            if (!point.broken) {
              _context4.next = 9;
              break;
            }

            _context4.next = 7;
            return point.next;

          case 7:
            _context4.next = 15;
            break;

          case 9:
            point.reject(error());
            point.produced = true;
            point.broken = true;

            try {
              if (point.finalizer) {
                point.finalizer();
              }
            } catch (reason) {
              // shallow/ignore error/reason
            }

            _context4.next = 15;
            return point.next;

          case 15:
          case 'end':
            return _context4.stop();
        }
      }
    }, _callee4, undefined);
  }));

  return function close(_x5) {
    return _ref5.apply(this, arguments);
  };
}();

var protectedClose = function protectedClose(stream) {
  return close(stream).catch(function () {
    // shallow/ignore error/reason
  });
};

var every = function every(interval) {
  var finalizer = null;
  var stream = _create(function () {
    return finalizer();
  });
  var currentStream = stream;

  var intervalId = setInterval(function () {
    push(currentStream, true).then(function (nextStream) {
      currentStream = nextStream;
    }); // .catch() here is never reached :)
  }, interval);

  finalizer = function finalizer() {
    clearInterval(intervalId);
  };

  return utils.resolved(stream);
};

// stream * closure -> boolean promise
var react = function () {
  var _ref7 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee5(stream, procedure) {
    var deferred, currentStream, result, isClosed;
    return regeneratorRuntime.wrap(function _callee5$(_context5) {
      while (1) {
        switch (_context5.prev = _context5.next) {
          case 0:
            deferred = utils.defer();
            currentStream = stream;
            _context5.prev = 2;

          case 3:
            if (!true) {
              _context5.next = 18;
              break;
            }

            _context5.next = 6;
            return pull(currentStream);

          case 6:
            result = _context5.sent;

            currentStream = result.next;

            _context5.prev = 8;

            procedure(result.current);
            _context5.next = 16;
            break;

          case 12:
            _context5.prev = 12;
            _context5.t0 = _context5['catch'](8);

            deferred.reject(_context5.t0);
            throw _context5.t0;

          case 16:
            _context5.next = 3;
            break;

          case 18:
            _context5.next = 23;
            break;

          case 20:
            _context5.prev = 20;
            _context5.t1 = _context5['catch'](2);

            deferred.resolve(true);

          case 23:
            _context5.next = 25;
            return deferred.promise;

          case 25:
            isClosed = _context5.sent;
            return _context5.abrupt('return', isClosed);

          case 27:
          case 'end':
            return _context5.stop();
        }
      }
    }, _callee5, undefined, [[2, 20], [8, 12]]);
  }));

  return function react(_x6, _x7) {
    return _ref7.apply(this, arguments);
  };
}();

// stream * closure -> stream promise
var filter = function () {
  var _ref8 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee6(stream, predicate) {
    var filtered, newStream;
    return regeneratorRuntime.wrap(function _callee6$(_context6) {
      while (1) {
        switch (_context6.prev = _context6.next) {
          case 0:
            filtered = _create();
            newStream = filtered; // alias to allow garbage collection here

            react(stream, function (value) {
              // the call predicate(value) may fail
              try {
                if (predicate(value)) {
                  push(newStream, value).then(function (nextStream) {
                    newStream = nextStream;
                  }).catch(function (reason) {
                    protectedClose(newStream);
                  });
                }
              } catch (reason) {
                protectedClose(newStream);
              }
            }).then(function () {
              protectedClose(newStream);
            }); // .catch() is never reached here :p

            return _context6.abrupt('return', filtered);

          case 4:
          case 'end':
            return _context6.stop();
        }
      }
    }, _callee6, undefined);
  }));

  return function filter(_x8, _x9) {
    return _ref8.apply(this, arguments);
  };
}();

// stream * closure -> stream promise
var map = function () {
  var _ref9 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee7(stream, closure) {
    var transformed, newStream;
    return regeneratorRuntime.wrap(function _callee7$(_context7) {
      while (1) {
        switch (_context7.prev = _context7.next) {
          case 0:
            transformed = _create();
            newStream = transformed; // alias to allow garbage collection here

            react(stream, function (value) {
              try {
                push(newStream, closure(value)).then(function (nextStream) {
                  newStream = nextStream;
                }).catch(function (reason) {
                  protectedClose(newStream);
                });
              } catch (reason) {
                protectedClose(newStream);
              }
            }).then(function () {
              protectedClose(newStream); // closes result stream if origin is closed too
            }); // .catch() here is never reached :)

            return _context7.abrupt('return', transformed);

          case 4:
          case 'end':
            return _context7.stop();
        }
      }
    }, _callee7, undefined);
  }));

  return function map(_x10, _x11) {
    return _ref9.apply(this, arguments);
  };
}();

module.exports.open = open;
module.exports.push = push;
module.exports.pull = pull;
module.exports.close = close;
module.exports.react = react;
module.exports.filter = filter;
module.exports.map = map;
module.exports.every = every;