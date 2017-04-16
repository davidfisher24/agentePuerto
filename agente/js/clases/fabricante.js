/**
 * Created by Lola on 27/03/2014. Fabricante.js
 *
 * Clase para tratar los mensajes de envio

 */



var debug = require('../utils');
var legacy = require('legacy-encoding');
var xor = require('bitwise-xor');
var fs = require('fs');



var Fabricante= function (ipPanel){

	this.encodingType = "windows1252";
	this.startTransmissionKey = "02";
	this.endTransmissionKey = "03";
	this.agenteKey = "B0";
	this.panelKey = "B1";
	this.applicationCode = "20";
	this.textHeight = "07";
	// commands
	this.deleteCommand = "01";
	this.fixedTestCommand = "11";
	this.textWithEffectsCommand = "13";
	this.syncCommand = "22";
	this.keepAliveCommand = "23";
	// Effects
	this.effects = {
		"scroll" : 00,
		"blink" : 05,
	};
};






Fabricante.prototype.trataEnvio= function (datos,callback) {


	var decodedText = legacy.decode(datos, 'hex', {
		'mode': 'html'
	});
	console.log(decodedText);
	var bits = decodedText.match(/.{2}/g);
	console.log(bits);
	//var order = parseInt(bits[1],16); // order is 160 for example
	//order.toString(16); // turns this back to a0

	var answers = [];
	var indexIncrement = 0;
	while (bits.length > indexIncrement) {
		var nextEndMessage = bits.indexOf('03',0);
		if (nextEndMessage === 9 || nextEndMessage === 10 && bits[nextEndMessage + 1] === '02') {
			answers.push(bits.splice(0,nextEndMessage));
			indexIncrement = 0;
		} else {
			indexIncrement = nextEndMessage + 1;
		}
	}

	



	return decodedText;

	//06 is good, 15 is bad
	// ACK=RX 06  10 digits
	/*02aeb1b0 4 digits 06 = good 00 01 ad 05 03

	// NACK-RX 15 11 digits
	02afb1b0 4 digits /15/ 00 02 ad 3 digits/01/ 15 03
	02a0b1b0 /15/ 00 02 ad /01/ 1a 03
	02a1b1b0 /15/ 00 02 ad /01/ 1b 03
	02a2b1b0 /15/ 00 02 ad /01/ 18 03

	02a4b1b0 /15/ 00 02 ad /01/ 1e 03
	02a5b1b0 /15/ 00 02 ad /01/ 1f 03

	0x00 .- Causa desconocida.
	0x01 .- Error de chk
	0x02 .- Error código nivel de enlace
	0x03 .- Error código nivel de aplicación.
	0x04 .- Error formato aplicación*/
};
                                           


Fabricante.prototype.trataConsulta= function (datos) {
	// Always the same length??
	// If I get one back, is that fine.
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
	// 10-14 are the key bits

    return "ACTIVO";
};


Fabricante.prototype.tramaSeleccion=function(idpanel) {
    /*envia una trama de seleccion de panel*/
};

Fabricante.prototype.tramaPeticionEstado=function(){
/*
Envia una trama al panel para solicitarle el estado en que se encuentra
*/
};

// DAVID

Fabricante.prototype.sendKeepAlive = function(){
	var that = this;
	var encodedString = [];

	encodedString.push("A7"); // Message order. Needs defining
	encodedString.push(this.agenteKey,this.panelKey); // Fixed element
	encodedString.push(this.keepAliveCommand); // Texto Fijo command

	var dataLength = 0;
	this.makeHexNumberTwoBytes(dataLength).forEach(function(byte){
		encodedString.push(byte);
	});

	this.makeChecksum(encodedString).forEach(function(hex){ // Checksum added
		encodedString.push(that.makeHexNumberOneByte(hex));
	});

	encodedString.unshift(this.startTransmissionKey);
	encodedString.push(this.endTransmissionKey);
	return encodedString.join("");
};

Fabricante.prototype.sendSyncCommand = function(){
	var that = this;
	var encodedString = [];

	encodedString.push("AD"); // Message order. Needs defining
	encodedString.push(this.agenteKey,this.panelKey); // Fixed element
	encodedString.push(this.syncCommand); // Texto Fijo command

	var dataLength = 0; // 10 for the delete message
	this.makeHexNumberTwoBytes(dataLength).forEach(function(byte){
		encodedString.push(byte);
	});
	this.makeChecksum(encodedString).forEach(function(hex){ // Checksum added
		encodedString.push(that.makeHexNumberOneByte(hex));
	});

	encodedString.unshift(this.startTransmissionKey);
	encodedString.push(this.endTransmissionKey);
	return encodedString.join("");
	
};


Fabricante.prototype.sendDeleteMessage=function(order,xStart,yStart,xFinish,yFinish){
	var that = this;

	var encodedString = [];

	encodedString.push(order); // Message order. Needs defining
	encodedString.push(this.agenteKey,this.panelKey,this.applicationCode); // Fixed element

	var dataLength = 10; // 10 for the delete message
	this.makeHexNumberTwoBytes(dataLength).forEach(function(byte){
		encodedString.push(byte);
	});

	// Extra data
	encodedString.push(this.deleteCommand); // Texto Fijo command
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
	this.makeChecksum(encodedString).forEach(function(hex){ // Checksum added
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
	encodedString.push("11"); //Color - Amber
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

	var effectCode = this.effects[effect];
	console.log(effect + " " + effectCode);
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
	encodedString.push("11"); //Color - Amber
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