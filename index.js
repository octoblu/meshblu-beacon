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
   
  }
};

var OPTIONS_SCHEMA = {
  type: 'object',
  properties: {
    uuid: {
      title: "UUID: Leave blank to scan for ANY nearby beacon",
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

if (device.options.uuid && device.options.majorId && device.options.minorId){

      Bleacon.startScanning(device.options.uuid, device.options.majorId, device.options.minorId);

}else if(device.options.uuid && device.options.majorId){

      Bleacon.startScanning(device.options.uuid, device.options.majorId);


}else if(device.options.uuid){

      Bleacon.startScanning(device.options.uuid);


}else{

       Bleacon.startScanning();

}


  Bleacon.on('discover', function(bleacon) {
   

    setTimeout(function() {


  if(bleacon.rssi != prevRSSI && bleacon.accuracy != prevACC){
      self.emit('message', {devices: ['*'], payload: bleacon });
 //     console.log(bleacon);

    }

      prevRSSI = bleacon.rssi;
      prevACC = bleacon.accuracy;

}, 200);  //end timeout


    
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
