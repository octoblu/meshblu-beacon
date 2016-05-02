'use strict';
var util         = require('util');
var debug        = require('debug')('meshblu-beacon')
var Bleacon      = require('bleacon');
var EventEmitter = require('events').EventEmitter;
var _            = require('lodash');

var previousProximities = {};

var TIMEOUT=200;
var handling = false;

var MESSAGE_SCHEMA = {
  type: 'object',
  properties: {action: {
      title: 'Action',
      type: 'string',
      required: false,
      default: ''
    },  
    uuid: {
       title: 'UUID',
       type: 'string',
       required: true,
       default: "00000000-0000-0000-0000-000000000000"
    },
    major: {
      title: 'Major (0 - 65535)',
      type: 'integer',
      required: true,
      default: 0
    },
    minor: {
      title: 'Minor (0 - 65535)',
      type: 'integer',
      required: true,
      default: 0
    },
    measuredPower: {
      title: 'measuredPower (-59 -128 -127 - measured RSSI at 1 meter)',
      type: 'integer',
      required: true,
      default: -59
    }
  }
};


var ACTION_MAP = [
  {
    'value': 'enableBeacon',
    'name': 'Enable iBeacon'
  }, 
  {
    'value': 'disableBeacon',
    'name': 'Disable iBeacon'
  }
]

var MESSAGE_FORM_SCHEMA = [
  {
    'key': 'action',
    'type': 'select',
    'titleMap': ACTION_MAP,
  },
  {
    'key': 'uuid',
    'condition': "model.action == 'enableBeacon'"
  },
  {
    'key': 'major',
    'condition': "model.action == 'enableBeacon'"
  },
  {
    'key': 'minor',
    'condition': "model.action == 'enableBeacon'"
  },
  {
    'key': 'measuredPower',
    'condition': "model.action == 'enableBeacon'"
  }
]



var OPTIONS_SCHEMA = {
  type: 'object',
  properties: {
    timeout: {
      title: "Timeout in seconds (to detect beacon is out of range)",
      type: 'number',
      default: 3,
      required: false
    }, 
    rangedBm: {
      title: "Range in dBm to update (lower is more frequent)",
      type: 'number',
      default: 3,
      required: false
    }, 
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
  self.messageFormSchema = MESSAGE_FORM_SCHEMA;
  self.optionsSchema = OPTIONS_SCHEMA;
  return self;
}
util.inherits(Plugin, EventEmitter);

Plugin.prototype.onMessage = function(message){
  var self = this;
  var payload = message.payload;

  console.log(payload.action);
  switch  (payload.action) {
     case 'enableBeacon':  Bleacon.startAdvertising(payload.uuid, payload.major, payload.minor, payload.measuredPower);    
                           break;
     case 'disableBeacon': Bleacon.stopAdvertising();
                           break;
     default: 
  }

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
    var octoBleacon = bleacon;
    var proximityId = bleacon.uuid + ':' + bleacon.major + ':' + bleacon.minor;
    var previousProximity = previousProximities[proximityId];
    

    debug('Discovered: ', proximityId, bleacon.rssi);
    // Only send beacon when rssi is changed +/- 3 dBm
    if ((previousProximity &&  previousProximity.rssi - self.options.rangedBm) < bleacon.rssi && (previousProximity && previousProximity.rssi + self.options.rangedBm) > bleacon.rssi){
      debug('Proximity has already been sent');
      previousProximities[proximityId].lastseen = Date.now();; //But store the last time the beacon was seen
      return;
    }

    if (!previousProximity) {
      previousProximities[proximityId] = {emitBleacon: _.throttle(_.bind(self.emitBleacon, self), 500)}
      previousProximities[proximityId].uuid     = bleacon.uuid;
      previousProximities[proximityId].major    = bleacon.major;
      previousProximities[proximityId].minor    = bleacon.minor;
    } 
    

    previousProximities[proximityId].emitBleacon(bleacon);
    previousProximities[proximityId].rssi     = bleacon.rssi;
    previousProximities[proximityId].lastseen = Date.now();;
  });

  setInterval(function() {
     //Iterate through known beacons every 250ms
     for (var proximityId in previousProximities) {

        //Determine if the beacon was seen the last x-seconds
        if (Date.now() - previousProximities[proximityId].lastseen > (self.options.timeout * 1000)) {
           console.log("Beacon " + proximityId + " is GONE");
           var bleacon = {};
               bleacon.uuid          = previousProximities[proximityId].uuid;
               bleacon.major         = previousProximities[proximityId].major;
               bleacon.minor         = previousProximities[proximityId].minor;
               bleacon.measuredPower = 0;
               bleacon.rssi          = 0;
               bleacon.accuracy      = 0 ;
               bleacon.proximity     = "gone";
           
           //Inform meshblu
           previousProximities[proximityId].emitBleacon(bleacon);
           
           //Remove from known beacons list
           delete previousProximities[proximityId];
        }
     }
  }, 250);


};

Plugin.prototype.emitBleacon = function(payload) {
  debug('emitBleacon');
  this.emit('message', {"devices": ['*'], "payload": payload});
};

Plugin.prototype.setOptions = function(options){
  this.options = options || { "scanAll": true };
  debug('options', this.options);
};

module.exports = {
  messageSchema: MESSAGE_SCHEMA,
  messageFormSchema: MESSAGE_FORM_SCHEMA,
  optionsSchema: OPTIONS_SCHEMA,
  Plugin: Plugin
};
