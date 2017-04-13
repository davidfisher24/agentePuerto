/**
 * Created by Lola on 27/03/2014. Fabricante.js
 *
 * Clase para tratar los mensajes de envio

 */



var debug = require('../utils');
var legacy = require('legacy-encoding');



var Fabricante= function (ipPanel){

	this.encodingType = "windows1252";
	this.startTransmissionKey = "02";
	this.endTransmissionKey = "03";
	this.agenteKey = "B0";
	this.panelKey = "B1";
	this.applicationCode = "20";
};






Fabricante.prototype.trataEnvio= function (datos,callback) {
 /*Funcion que construye las tramas de envio de mensajes al panel*/

 /**
 * @description Trata los datos que devuelve el panel tras una consulta de estado
 * @param datos
 * @return {*|String}
 */
};


Fabricante.prototype.trataConsulta= function (datos) {
    /**
     * Esta funcion decodifica la trama que recibido del panel
     * Los datos vienen en un buffer
     */
};


Fabricante.prototype.tramaSeleccion=function(idpanel) {
    /*envia una trama de seleccion de panel*/
};

Fabricante.prototype.tramaPeticionEstado=function(){
/*
Envia una trama al panel para solicitarle el estado en que se encuentra
*/
};


Fabricante.prototype.tramaPeticionEnvio=function(/*item,*/texto){
	var that = this;

	var encodedText = legacy.encode(texto, this.encodingType, {
	  'mode': 'html'
	});

	var encodedString = [];

	// This is the start of the transmission - five elements
	encodedString.push(this.startTransmissionKey); // Start transmission key
	encodedString.push("AD"); // Mesage order. Needs defining
	encodedString.push(this.agenteKey); // Agente origin
	encodedString.push(this.panelKey); // Panel destination
	encodedString.push(this.applicationCode); // Application code

	// Make the longitude de datos here. Extra elements is encoded as 8 for fijo
	var dataLength = encodedString.length + 8; 
	this.makeHexNumberTwoBytes(dataLength).forEach(function(byte){
		encodedString.push(byte);
	});

	// Extra data
	encodedString.push("11"); // Texto Fijo
	encodedString.push("00"); // Almacena command
	var xStart = 109; // x position
	this.makeHexNumberTwoBytes(xStart).forEach(function(byte){
		encodedString.push(byte);
	});
	var yStart = 10; // y position
	this.makeHexNumberTwoBytes(yStart).forEach(function(byte){
		encodedString.push(byte);
	});
	encodedString.push("11"); //Color - Amber
	encodedString.push("07"); //Altura del texto
	
	// Push each byte of the string here
	encodedText.forEach(function(hex){
		encodedString.push(that.makeHexNumberOneByte(hex));
	});

	// End of data
	encodedString.push(this.endTransmissionKey); // Start transmission key

	// Final string
	var string = encodedString.join(" ");
};

Fabricante.prototype.makeHexNumberOneByte = function(number) {
	hexString = number.toString(16);
    var str = '' + hexString;
    while (str.length < 2) str = '0' + str;
    return str;
};

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




module.exports = Fabricante;