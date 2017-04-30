/**
 * Created by Lola on 27/03/2014. Fabricante.js
 *
 * Clase para tratar los mensajes de envio

 */



var debug = require('../utils');
var legacy = require('legacy-encoding');
var xor = require('bitwise-xor');
var fs = require('fs');



var Fabricante= function (ipPanel,textColor,textSpeed, textHeight){

	this.encodingType = "windows1252";
	this.startTransmissionKey = "02";
	this.endTransmissionKey = "03";
	this.agenteKey = "B0";
	this.panelKey = "B1";
	this.applicationCode = "20";
	this.textHeight = textHeight;
	this.textColor = textColor;
	this.textSpeed = textSpeed;
	// commands
	this.deleteCommand = "01";
	this.fixedTestCommand = "11";
	this.textWithEffectsCommand = "13";
	this.syncCommand = "22";
	this.keepAliveCommand = "23";
	// Effects
	this.effects = {
		"scroll" : "00",
		"blink" : "05",
	};
	// Response
	this.ack_rx = "06";
	this.nack_rx = "15";
	this.nack_rx_errors = {
		"00" : "Causa desconocida",
		"01" : "Error de chk",
		"02" : "Error código nivel de enlace",
		"03" : "Error código nivel de aplicación",
		"04" : "Error formato aplicación"
	}
};



Fabricante.prototype.trataEnvio= function (datos,callback) {
	var decodedText = legacy.decode(datos, 'hex', {
		'mode': 'html'
	});
	var bits = decodedText.match(/.{2}/g);
	var message_response = bits[4];

	callback(message_response);
};
                                           


Fabricante.prototype.trataConsulta= function (datos) {
	// 02 ab b1 b0 21 - stx,orden,panel,API,mensaje estado
	// 00 0e longitude
	// 11 00 software
	// 00 00 00 00 00 errors 
	// ff test mode
	// 00 00 3c 00 00 others. Dont know about these
	// 57 03 checksum

	var decodedText = legacy.decode(datos, 'hex', {
		'mode': 'html'
	});
	var bits = decodedText.match(/.{2}/g);

	var status;
	if (bits[9] === "00" && bits[10] === "00" && bits[11] === "00" && bits[12] === "00") {
		status = "NORMAL";
		//status = "ACTIVO";
	} else {
		status = "DESCONOCIDO";
		/*status = [];
		if (bits[9] !== "00") status.push("Alamra de batería.");
		if (bits[10] !== "00" && parseInt(bits[10] % 2 === 0)) status.push("Algún LED Mal");
		if (bits[10] !== "00" && parseInt(bits[10] % 2 !== 0)) status.push("Ningún LED Mal");
		if (bits[11] !== "00") status.push("Alarma de puerta abierta.");
		if (bits[12] !== "00") status.push("Alarma de vibración");*/
	}

    return status;
};



Fabricante.prototype.sendKeepAlive = function(order){
	var that = this;
	var encodedString = [];

	encodedString.push(order); // Message order. 
	encodedString.push(this.agenteKey,this.panelKey); // Communication format
	encodedString.push(this.keepAliveCommand); // Keep Alive Command

	var dataLength = 0;
	this.makeHexNumberTwoBytes(dataLength).forEach(function(byte){
		encodedString.push(byte); // Data Length
	});

	this.makeChecksum(encodedString).forEach(function(hex){ 
		encodedString.push(that.makeHexNumberOneByte(hex));  // Checksum
	});

	encodedString.unshift(this.startTransmissionKey); // Start key
	encodedString.push(this.endTransmissionKey); // End key
	return encodedString.join("");
};

Fabricante.prototype.sendSyncCommand = function(order){
	var that = this;
	var encodedString = [];

	encodedString.push(order); // Message order. 
	encodedString.push(this.agenteKey,this.panelKey); // Communication format
	encodedString.push(this.syncCommand); // Sync command

	var dataLength = 0; 
	this.makeHexNumberTwoBytes(dataLength).forEach(function(byte){
		encodedString.push(byte); // Data Length
	});
	this.makeChecksum(encodedString).forEach(function(hex){ // Checksum
		encodedString.push(that.makeHexNumberOneByte(hex));
	});

	encodedString.unshift(this.startTransmissionKey); // Start key
	encodedString.push(this.endTransmissionKey); // End key
	return encodedString.join("");
	
};


Fabricante.prototype.sendDeleteMessage=function(order,xStart,yStart,xFinish,yFinish){
	var that = this;

	var encodedString = [];

	encodedString.push(order); // Message order
	encodedString.push(this.agenteKey,this.panelKey,this.applicationCode); // Communication format, and app code

	var dataLength = 10; 
	this.makeHexNumberTwoBytes(dataLength).forEach(function(byte){
		encodedString.push(byte);  // Data Length - 10 for delete message
	});

	encodedString.push(this.deleteCommand); // Deletecommand
	encodedString.push("00"); // Almacena command
	
	this.makeHexNumberTwoBytes(xStart).forEach(function(byte){
		encodedString.push(byte); // xstart
	});
	this.makeHexNumberTwoBytes(yStart).forEach(function(byte){
		encodedString.push(byte); // ystart
	});
	this.makeHexNumberTwoBytes(xFinish).forEach(function(byte){
		encodedString.push(byte); // xfinish
	});
	this.makeHexNumberTwoBytes(yFinish).forEach(function(byte){
		encodedString.push(byte); // yfinish
	});
	this.makeChecksum(encodedString).forEach(function(hex){ // Checksum 
		encodedString.push(that.makeHexNumberOneByte(hex));
	})
	
	encodedString.unshift(this.startTransmissionKey);
	encodedString.push(this.endTransmissionKey);
	return encodedString.join("");
};


Fabricante.prototype.sendFixedTextMessage=function(order,texto,xStart,yStart){
	var that = this;

	var encodedText = legacy.encode(texto, this.encodingType, {
	  'mode': 'html'
	});

	var encodedString = [];

	encodedString.push(order); // Message order. Needs defining
	encodedString.push(this.agenteKey,this.panelKey,this.applicationCode); // Fixed elements

	// Make the data length here. For fixed text this is the string bytes + 8
	var dataLength = encodedText.length + 8; 
	this.makeHexNumberTwoBytes(dataLength).forEach(function(byte){
		encodedString.push(byte);
	});

	encodedString.push(this.fixedTestCommand); // Texto Fijo command
	encodedString.push("00"); // Almacena command
	this.makeHexNumberTwoBytes(xStart).forEach(function(byte){ //x start needs defining
		encodedString.push(byte);
	});
	this.makeHexNumberTwoBytes(yStart).forEach(function(byte){ //y start needs defining
		encodedString.push(byte);
	});
	encodedString.push(this.textColor); //Color - Amber
	encodedString.push(this.textHeight); //Altura del texto
	
	encodedText.forEach(function(hex){ // The hexes of the string
		encodedString.push(that.makeHexNumberOneByte(hex));
	});
	
	this.makeChecksum(encodedString).forEach(function(hex){ // Checksum added
		encodedString.push(that.makeHexNumberOneByte(hex));
	})
	
	encodedString.unshift(this.startTransmissionKey);
	encodedString.push(this.endTransmissionKey);
	return encodedString.join("");
	
};

Fabricante.prototype.sendTextMessageWithEffect=function(order,texto,xStart,yStart,effect,xFinish,yFinish){
	var that = this;

	var encodedText = legacy.encode(texto, this.encodingType, {
	  'mode': 'html'
	});

	var encodedString = [];

	encodedString.push(order); // Message order. Needs defining
	encodedString.push(this.agenteKey,this.panelKey,this.applicationCode); // Fixed elements

	// Make the data length here. For effects text this is the string bytes + 14
	var dataLength = encodedText.length + 14; 
	this.makeHexNumberTwoBytes(dataLength).forEach(function(byte){
		encodedString.push(byte);
	});

	encodedString.push(this.textWithEffectsCommand); 
	encodedString.push("00"); // Almacena command
	encodedString.push(this.textSpeed); // Velocity

	var effectCode = this.effects[effect];
	encodedString.push(effectCode);

	this.makeHexNumberTwoBytes(xStart).forEach(function(byte){
		encodedString.push(byte);
	});
	this.makeHexNumberTwoBytes(yStart).forEach(function(byte){ 
		encodedString.push(byte);
	});
	this.makeHexNumberTwoBytes(xFinish).forEach(function(byte){
		encodedString.push(byte);
	});
	this.makeHexNumberTwoBytes(yFinish).forEach(function(byte){ 
		encodedString.push(byte);
	});
	encodedString.push(this.textColor); //Color - Amber
	encodedString.push(this.textHeight); //Altura del texto
	
	encodedText.forEach(function(hex){ // The hexes of the string
		encodedString.push(that.makeHexNumberOneByte(hex));
	});
	
	this.makeChecksum(encodedString).forEach(function(hex){ // Checksum added
		encodedString.push(that.makeHexNumberOneByte(hex));
	})
	
	encodedString.unshift(this.startTransmissionKey);
	encodedString.push(this.endTransmissionKey);
	return encodedString.join("");
};

// HELPERS

// Returns a hex code of one byte (typically for a ascii letter)
Fabricante.prototype.makeHexNumberOneByte = function(number) {
	hexString = number.toString(16);
    var str = '' + hexString;
    while (str.length < 2) str = '0' + str;
    return str;
};

// Returns a hex code of two byres typically for a number
Fabricante.prototype.makeHexNumberTwoBytes = function(number) {
	hexString = number.toString(16);
    var str = '' + hexString;

    if (str.length <= 2) {
    	while (str.length < 2) str = '0' + str;
    	return ["00",str];
    } else {
    	byte1 = str.substring(0, str.length - 2);
    	byte2 = str.substr(-2);
    	while (byte1.length < 2) byte1 = '0' + byte1;
    	return [byte1,byte2];
    }
}

Fabricante.prototype.makeChecksum = function(array) {
	var that = this;
	var current = array[0];
	for (var x = 1; x < array.length; x++) {
		current = xor(new Buffer(current, 'hex'),new Buffer(array[x], 'hex'));
	}

	return current;
}





module.exports = Fabricante;