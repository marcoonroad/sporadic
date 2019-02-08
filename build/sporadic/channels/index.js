/* eslint-env node, es6 */

'use strict';

var utils = require('../utils');

var error = function error() {
  return Error('Channel is closed!');
};

var breakDemands = function breakDemands(channel) {
  // breaks all the pending receive calls
  while (channel.demands.length !== 0) {
    var demand = channel.demands.shift();

    demand.reject(error());
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

var send = function send(channel, message) {
  if (channel.demands.length === 0) {
    // cannot push on closed channel
    if (channel.isClosed) {
      return utils.rejected(error());
    };

    var received = utils.defer();

    channel.supplies.push({ received: received, message: message });

    return received.promise;
  } else {
    // close function will break all available demands,
    // so this path is never reached after close call
    var demand = channel.demands.shift();

    demand.resolve(message);

    return utils.resolved(true);
  }
};

var receive = function receive(channel) {
  // doesn't break on close if not empty
  if (channel.supplies.length === 0) {
    if (channel.isClosed) {
      return utils.rejected(error());
    }

    var demand = utils.defer();

    channel.demands.push(demand);

    return demand.promise;
  } else {
    // closed non-empty streams don't break on receive
    var supply = channel.supplies.shift();

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
module.exports.send = send;
module.exports.receive = receive;
module.exports.close = close;
module.exports.closed = closed;