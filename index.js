'use strict';
var util         = require('util');
var debug        = require('debug')('meshblu-beacon')
var Bleacon      = require('bleacon');
var EventEmitter = require('events').EventEmitter;
var _            = require('lodash');

var prevRSSI;
var prevACC;

var TIMEOUT=200;
var handling = false;

var MESSAGE_SCHEMA = {
  type: 'object',
  properties: {}
};

var OPTIONS_SCHEMA = {
  type: 'object',
  properties: {
    scanAll: {
      title: "Scan for any nearby beacons",
      type: 'boolean',
      default: true,
      required: true
    },
    uuid: {
      title: "UUID:",
      type: 'string',
      required: false
    },
    majorId: {
      title: "Major Id: Optional",
      type: 'number',
      required: false
    },
    minorId: {
      title: "Minor Id: Optional",
      type: 'number',
      required: false
    }
  }
};

function Plugin(){
  var self = this;
  self.options = { "scanAll": true };
  self.messageSchema = MESSAGE_SCHEMA;
  self.optionsSchema = OPTIONS_SCHEMA;
  return self;
}
util.inherits(Plugin, EventEmitter);

Plugin.prototype.onMessage = function(message){
  var payload = message.payload;
};

Plugin.prototype.onConfig = function(device){
  var self = this;
  self.setOptions(device.options);
  debug('on config');
  if(self.options.scanAll == true){
    Bleacon.startScanning();
  }else{
    Bleacon.startScanning(self.options.uuid, self.options.majorId, self.options.minorId);
  }

  if(!handling){
    self.handleDiscover();
  }
};

Plugin.prototype.handleDiscover = function(){
  var self = this;

  handling = true;
  Bleacon.on('discover', function(bleacon) {
    debug('on discover');
    if(bleacon.rssi == prevRSSI || bleacon.accuracy == prevACC){
      debug('same thing');
    }else{
      // self.emit('message', {devices: ['*'], payload: bleacon });
      throttledEmit(bleacon);
      prevRSSI = bleacon.rssi;
      prevACC = bleacon.accuracy;
      debug('sent message');
    }
  });

  var throttledEmit = _.throttle(function(payload){
    debug('throttled', payload);
    self.emit('message', {"devices": ['*'], "payload": payload});
  }, 500, {'leading': false});
};

Plugin.prototype.setOptions = function(options){
  this.options = options || { "scanAll": true };
  debug('options', this.options);
};

module.exports = {
  messageSchema: MESSAGE_SCHEMA,
  optionsSchema: OPTIONS_SCHEMA,
  Plugin: Plugin
};
