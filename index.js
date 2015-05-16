'use strict';
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var debug = require('debug')('meshblu-beacon')
var Bleacon = require('bleacon');

var prevRSSI;
var prevACC;


var MESSAGE_SCHEMA = {
  type: 'object',
  properties: {
    exampleBoolean: {
      type: 'boolean',
      required: true
    },
    exampleString: {
      type: 'string',
      required: true
    }
  }
};

var OPTIONS_SCHEMA = {
  type: 'object',
  properties: {
    firstExampleOption: {
      type: 'string',
      required: true
    }
  }
};

function Plugin(){
  this.options = {};
  this.messageSchema = MESSAGE_SCHEMA;
  this.optionsSchema = OPTIONS_SCHEMA;
  return this;
}
util.inherits(Plugin, EventEmitter);

Plugin.prototype.onMessage = function(message){
  var payload = message.payload;
 
};

Plugin.prototype.onConfig = function(device){
  var self = this;
  this.setOptions(device.options||{});

  Bleacon.startScanning();

  Bleacon.on('discover', function(bleacon) {

    setTimeout(function() {
     


  if(bleacon.rssi != prevRSSI && bleacon.accuracy != prevACC){
      self.emit('message', {devices: ['*'], payload: bleacon });
      console.log(bleacon);

    }

      prevRSSI = bleacon.rssi;
      prevACC = bleacon.accuracy;

}, 200); 

    
});

};

Plugin.prototype.setOptions = function(options){
  this.options = options;
};

module.exports = {
  messageSchema: MESSAGE_SCHEMA,
  optionsSchema: OPTIONS_SCHEMA,
  Plugin: Plugin
};
