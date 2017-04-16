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
};






Fabricante.prototype.trataEnvio= function (datos,callback) {
 /*Funcion que construye las tramas de envio de mensajes al panel*/

 /**
 * @description Trata los datos que devuelve el panel tras una consulta de estado
 * @param datos
 * @return {*|String}
 */
	var decodedText = legacy.decode(datos, 'hex', {
		'mode': 'html'
	});
	console.log("trata envio: " + decodedText);
	return decodedText;

	//06 is good, 15 is bad
	// ACK=RX 06
	/*02aeb1b0 06 00 01 ad 05 03
	02a3b1b0 06 00 01 ad 08 03
	02a6b1b0 06 00 01 ad 0d 03

	02afb1b0 /15/ 00 02 ad /01/ 15 03
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
    /**
     * Esta funcion decodifica la trama que recibido del panel
     * Los datos vienen en un buffer
     */

	 /*02 stx
	 ab orden 
	 b1 b0 panel to API
	 21 mensaje de estado
	 00 0e longitde
	 1100 software
	 00 00 00 00 00 00 warnings
	 ff test mode
	 00 00 3c 00 00 others
	 57
	 03*/
	 // need to parse this somehow - need more info

     var decodedText = legacy.decode(datos, 'hex', {
	  'mode': 'html'
	});
     console.log(decodedText);
    return decodedText;
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

Fabricante.prototype.sendTextMessageWithEffect=function(texto){
	var that = this;

	var encodedText = legacy.encode(texto, this.encodingType, {
	  'mode': 'html'
	});

	var encodedString = [];

	encodedString.push("AD"); // Message order. Needs defining
	encodedString.push(this.agenteKey,this.panelKey,this.applicationCode); // Fixed elements

	// Make the data length here. For effects text this is the string bytes + 14
	var dataLength = encodedString.length + 14; 
	this.makeHexNumberTwoBytes(dataLength).forEach(function(byte){
		encodedString.push(byte);
	});

	encodedString.push(this.textWithEffectsCommand); // Texto with effects command
	encodedString.push("01"); // Almacena command
	encodedString.push("01") // velocidad
	encodedString.push("05") // effecto parpadeo
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