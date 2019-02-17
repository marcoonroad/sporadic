/* eslint-env node, es6 */

'use strict';

var utils = require('../utils');

var closeError = function closeError() {
  return Error('Channel is closed!');
};

var timeoutError = function timeoutError() {
  return Error('Timeout while listening channel!');
};

var breakDemands = function breakDemands(channel) {
  // breaks all the pending receive calls
  while (channel.demands.length !== 0) {
    var demand = channel.demands.shift();

    demand.reject(closeError()); // no-op if demand defer is changed
  }
};

var create = function create() {
  var channel = {};

  channel.demands = [];
  channel.supplies = [];
  channel.closed = utils.defer();
  channel.isClosed = false;

  return channel;
};

var open = function open() {
  return utils.resolved(create());
};

var _send = null;
_send = function send(channel, message, expiration) {
  if (channel.demands.length === 0) {
    // cannot push on closed channel
    if (channel.isClosed) {
      return utils.rejected(closeError());
    };

    var received = utils.defer();

    if (expiration !== undefined && expiration !== null && typeof expiration === 'number' && expiration >= 1) {
      setTimeout(function () {
        received.resolve(false);
      }, Math.floor(expiration));
    }

    channel.supplies.push({ received: received, message: message });

    return received.promise;
  } else {
    // close function will break all available demands,
    // so this path is never reached after close call
    var demand = channel.demands.shift();

    while (channel.demands.length > 0 && demand.changed) {
      demand = channel.demands.shift();
    }

    if (demand.changed) {
      return _send(channel, message); // recursion me
    }

    demand.resolve(message);

    return utils.resolved(true);
  }
};

var _receive = null;
_receive = function receive(channel, timeout) {
  // doesn't break on close if not empty
  if (channel.supplies.length === 0) {
    if (channel.isClosed) {
      return utils.rejected(closeError());
    }

    var demand = utils.defer();

    channel.demands.push(demand);

    if (timeout !== undefined && timeout !== null && typeof timeout === 'number' && timeout >= 0) {
      setTimeout(function () {
        demand.reject(timeoutError());
      }, Math.floor(timeout));
    }

    return demand.promise;
  } else {
    // closed non-empty streams don't break on receive
    var supply = channel.supplies.shift();

    while (channel.supplies.length > 0 && supply.received.changed) {
      supply = channel.supplies.shift();
    }

    if (supply.received.changed) {
      return _receive(channel, timeout); // recursion me
    }

    supply.received.resolve(true);

    return utils.resolved(supply.message);
  }
};

var close = function close(channel) {
  if (channel.isClosed) {
    return utils.resolved(false);
  }

  channel.isClosed = true;

  breakDemands(channel);

  channel.closed.resolve(true);
  return utils.resolved(true);
};

var closed = function closed(channel) {
  return channel.closed.promise;
};

module.exports.open = open;
module.exports.send = _send;
module.exports.receive = _receive;
module.exports.close = close;
module.exports.closed = closed;