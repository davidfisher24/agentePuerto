'use strict';


var net= require('net');  // Web sockets
var debug = require('../utils');
var Fabricante=require('./fabricante.js');

var fecha =require('moment');
fecha().format('MMMM Do YYYY, h:mm:ss a');


/**
 *
 * @param campos
 * @constructor
 */
var Panel = function(campos){;
    this.id=campos.id;
    this.idpanel=campos.idpanel;
    this.ip=  campos.ip;
    this.puerto = campos.puerto;
    this.inactivo = campos.inactivo;
    this.luminosidad = campos.luminosidad;
    this.lineas=campos.lineas;
    this.type = campos.type;
    this.listaServicios =[];
    this.servicios = '',
    this.estado='',
    this.incidencia='',
    this.flag =0,
    this.proceso=0
    this.conectado=false;
    this.conectadoEnv=false;
    this.intentosEstados = 0;
    this.intentosEnvio = 0;
    // Information panels calling to srvicios parada
    this.refrescoP = 65 * 1000;
    this.serieP = -1;
    this.messageOrder = 160; // For secnding the hexes 0-16 for message order
    this.segments = []; // Segments of strings to send
};

Panel.prototype.EstaConectado = function () {
  var Estado = this.conectado || this.conectadoEnv; 
  if (Estado) debug.log(global.param.debugmode,"Conexión ya abierta. Se pospone nueva conexión.");
  return Estado; 
};



/***********************************************************************************************
// CONSULTATION OF ESTADOS
***********************************************************************************************/

Panel.prototype.consultaEstado = function(callback){
    if (this.inactivo) {
        debug.log(global.param.debugmode,"Consulta estado de panel " + this.ip + " - Panel Inactivo");
        var obj={"id": this.id.toString(),
            "estado": "2",
            "texto": "INACTIVO"};
        this.estado = obj;
        callback(null,obj);
    } else {
        this._conexionParaConsulta(callback);
    }
};



Panel.prototype._conexionParaConsulta = function (callback){
    if (this.EstaConectado()) return;

    var ran = Math.floor((Math.random() * 9999) + 1);
    this.proceso=ran;
    var panelConsulta = new Fabricante(this.ip);

    var panelSocket = net.connect({host: this.ip, port: this.puerto});
    panelSocket.setEncoding('hex');
    panelSocket.setTimeout(global.param.tiempoEspera);
    var _that = this;
    
    panelSocket.on('connect', function () {
        debug.log(global.param.debugmode,_that.proceso + " - Consulta estado de panel " + _that.ip);
        _that.conectado=true;

        var trama=panelConsulta.sendKeepAlive(_that.id);
        var buff = new Buffer(trama, 'hex');
        panelSocket.write(buff);

    });

    panelSocket.on('data', function (data) {
        if (data.length!==0) {
            var dR=new Buffer(data.toString(),'hex');
            var datos=panelConsulta.trataConsulta(dR);
            if (typeof datos != 'undefined') {
                var obj={id: (_that.id).toString(),
                    estado: "0",
                    texto: datos.toString()};
                _that.estado = obj;
                panelSocket.end();
                callback(null,obj);
            }
        }
    });

    panelSocket.on('close', function (had_error){
        _that.conectado=false;
        if (had_error){
            if ((_that.intentosEstados<global.param.numReintentos) && (_that.intentosEstados!=0)) {
                setTimeout(function(){
                    _that._conexionParaConsulta(callback);
                }, global.param.tiempoReintentos);
            }
        } else {
            _that.intentosEstados =0;
        }
    });

    panelSocket.on('error', function (e){
        console.log(e);
        if (_that.conectado) {
            panelSocket.destroy(); 
        };

        if (_that.intentosEstados == global.param.numReintentos) {
            var obj={"id": (_that.id).toString(),
                "estado": "1",
                "texto": "DESCONOCIDO"};
            _that.intentosEstados=0;
            _that.estado  = obj;
            callback(null,obj);
        } else{
            _that.intentosEstados++;
            var error=new Error(_that.ip + " - " + e.message + " - Intento " + _that.intentosEstados);
            callback(error,null);
        }
    });

    panelSocket.on('end',function(){
        debug.log(global.param.debugmode,_that.proceso + ' - Peticion de estado terminada. Conexion finalizada con ' + _that.ip);
    });


    panelSocket.on('timeout', function(){
        debug.log(global.param.debugmode,_that.proceso + ' - Peticion de estado TIMEOUT - ' + _that.ip);
        if (_that.conectado) {
            panelSocket.destroy();  
        }
        setTimeout(function(){
            if (_that.intentosEstados < global.param.numReintentos){
                _that.intentosEstados++;
                _that._conexionParaConsulta(callback);
            }
        }, global.param.tiempoReintentos); 
    });
};


/***********************************************************************************************
// INCIDENCES
***********************************************************************************************/

Panel.prototype.enviaIncidencia= function(callback){

    if (this.inactivo == 1){
        debug.log(global.param.debugmode,"Envio de incidencias a panel " + this.ip + " - Panel Inactivo");
        callback (null,null);
    } else {
        if (this.incidencia != ''){
            this._conexionParaEnvio(this.incidencia, function (err,res) {
                callback(err,res);
            });
        }
    }
};

/***********************************************************************************************
// INFORMACTIOn
***********************************************************************************************/


Panel.prototype.enviaInformacion  = function(mensaje,done){

        if (this.inactivo==1){
            done (null,null);
        } else {
            if (this.incidencia != ''){
                this._conexionParaEnvio(mensaje, function (err,res) {
                    done(err,res);
                });
            }
        }
    };


/***********************************************************************************************
// ENVIOS
***********************************************************************************************/

Panel.prototype.enviaServicios= function(callback){
    var that = this;
    if (this.inactivo == 1){
        debug.log(global.param.debugmode,"Envio de servicios a panel " + this.ip + " - Panel Inactivo");
        callback (null,null);
    } else {
        // If there is no incidence, we can send all the segments we currently have
        if (this.incidencia == ''){
            this._conexionParaEnvio(this.segments, function (err,res) {
                callback(err,res);
            });
        }
    }
};

/***********************************************************************************************
// FUNCTION TO SEND INCIDENCES, INFORMATION, AND MESSAGES
***********************************************************************************************/

Panel.prototype._conexionParaEnvio=function (mensajes,callback){
    var _that = this;
    if (this.EstaConectado()) return;

    var ran = Math.floor((Math.random() * 9999) + 1);
    this.proceso=ran;
    this.conectadoEnv=false;
    var panelEnvio = new Fabricante(this.ip);
    var envioSocket = net.connect({host: this.ip, port: this.puerto});

    envioSocket.setTimeout(global.param.tiempoEspera);

    // Make an array of the current segments we have - delete command - 9-15 segments - sync command
    var buffers = [];
    var deleteAreas = [];
    if (this.type === "MARQUESINA") deleteAreas = [120,27];
    else if (this.type === "INFORMACION") deleteAreas = [225,45];
    buffers.push(panelEnvio.sendDeleteMessage(_that.messageOrder.toString(16),1,1,deleteAreas[0],deleteAreas[1]));
    _that.messageOrder = _that.messageOrder === 175 ? 160 : _that.messageOrder + 1; 
    mensajes.forEach(function(m,i){
        if (m[3] === null ) buffers.push(panelEnvio.sendFixedTextMessage(_that.messageOrder.toString(16),m[0],m[1],m[2]));
        else buffers.push(panelEnvio.sendTextMessageWithEffect(_that.messageOrder.toString(16),m[0],m[1],m[2],m[3],m[4],m[5]));
         _that.messageOrder = _that.messageOrder === 175 ? 160 : _that.messageOrder + 1; 
    });
    buffers.push(panelEnvio.sendSyncCommand());

    // Connect - Send the first buffer
    // Commented is the old version that sends all the messages together
    envioSocket.on('connect',function(){
        _that.conectadoEnv=true;
        var buff = new Buffer(buffers[0], 'hex');
        envioSocket.write(buff);
        //debug.log(global.param.debugmode, _that.proceso +' - Panel conectado para el envio: ' + _that.ip);
        //var trama = "";
        //trama += panelEnvio.sendDeleteMessage(_that.messageOrder.toString(16),1,1,120,27);

        //_that.messageOrder = _that.messageOrder === 175 ? 160 : _that.messageOrder + 1; 
        /*mensajes.forEach(function(m,i){
            var t;
            if (m[3] === null ) t = panelEnvio.sendFixedTextMessage(_that.messageOrder.toString(16),m[0],m[1],m[2]);
            else t = panelEnvio.sendTextMessageWithEffect(_that.messageOrder.toString(16),m[0],m[1],m[2],m[3],m[4],m[5]);
            trama += t;
             _that.messageOrder = _that.messageOrder === 175 ? 160 : _that.messageOrder + 1; 
        });*/
        /*var tramaSync = trama + panelEnvio.sendSyncCommand();
        var buffSync = new Buffer(tramaSync, 'hex');
        envioSocket.write(buffSync);
        debug.log(global.param.debugmode,_that.proceso + " - Envio trama de sync -" + _that.ip + " - ");*/
    });

    // When recieve a response, reduce the buffers array by on, and send the next message.
    // Need to handle error messages here.
    envioSocket.on('data', function (data) {
        buffers.splice(0,1); // Reduce the last message
        panelEnvio.trataEnvio(data) // Parse the message that was sent

        if (buffers.length > 0) {
            var buff = new Buffer(buffers[0], 'hex');
            envioSocket.write(buff);
        } else {
            envioSocket.destroy();
        }
        // Deal with errors
        /*if (data.length !== 0) {
            panelEnvio.trataEnvio(data,function(err,mens){
                if (mens!=null) {
                    if (mens=='S') {  
                        callback(null, "Mensaje enviado correctamente al panel");
                        envioSocket.end();
                    } else if (mens=='N') {
                        callback(new Error(1,'El panel no da permiso para el envio'),null);
                    } else {
                        var buff3 = new Buffer(mens, 'hex');
                        envioSocket.write(buff3);
                    }
                    
                } else {
                    if (_that.intentosEnvio == global.param.numReintentos) {
                        var obj = {
                            "id"    : _that.id,
                            "estado": "1",
                            "texto" : "DESCONOCIDO"
                        };
                        _that.estado=obj;
                        envioSocket.destroy();
                        _that.intentosEnvio=0;

                        callback(null,obj)
                    } else {
                        envioSocket.destroy();

                        _that.intentosEnvio= _that.intentosEnvio + 1;
                        callback(err, null);
                    }
                }
            });
        }*/
    });

    //Si hay error enviado informacion, se realiza un reintento de envio
    envioSocket.on('close', function (had_error){
        _that.conectadoEnv =false;
        if (had_error){
            setTimeout(function(){
                if (_that.intentosEnvio < global.param.numReintentos){
                    _that.intentosEnvio=+1;
                    _that._conexionParaEnvio(mensajes,callback);
                }
            }, global.param.tiempoReintentos);
        }
    });


    envioSocket.on('error', function (e){
        if (_that.conectadoEnv) {
            envioSocket.destroy();
        }
        if (_that.intentosEnvio == global.param.numReintentos) {
            var obj = {
                "id"    : _that.id,
                "estado": "1",
                "texto" : "DESCONOCIDO"
            };
            _that.estado=obj;
            _that.intentosEnvio=0;

            callback(null,obj)
        } else {

            _that.intentosEnvio++;
            callback(e, null);
        }

    });

    envioSocket.on('end',function(){

        debug.log(global.param.debugmode,_that.proceso + ' - Envio termiando. Conexion finalizada con ' + _that.ip);
    });

    envioSocket.on('timeout', function(){
        if (_that.conectadoEnv) {
            envioSocket.destroy();
        }
        setTimeout(function(){
            if (_that.intentosEnvio < global.param.numReintentos){
                _that.intentosEnvio++;

                _that._conexionParaEnvio(mensajes,callback);
            }
        }, global.param.tiempoReintentos);
    });

};



/***********************************************************************************************
// FUNCTIONS FOR CALCLUATIONS OF SERVICES SEGMENTS
***********************************************************************************************/

/* Servicios-dia panel - currently sending hours. Adds up to 5 services. Needs completion */
Panel.prototype.calculaEstadoServicios = function (){
    var services = [];
    this.listaServicios.sort(function(a, b){
        return a.wait-b.wait;
    })

    // Here we have the time issues to solve. Minus and Minutes and thousands of minutes
    this.listaServicios.forEach(function(s){
        if (services.length < 3) { // Left as three for the moment. Will be five in the end
            if (s.wait >= 0) {
                services.push(s);
            }
        }
    });
    this.servicios = services;

    var segments = [];
    var yPosition = 1;
    var ySpacing = 9; // Spacing between lines on information.? // X positions are 1,31,181

    services.forEach(function(obj){
        segments.push([obj.service,1,yPosition,null]);  
        var nameText = (obj.flagRetraso > 0) ? obj.name + "-RETRESADO" : obj.name; // Don't have cancelled
        segments.push([nameText,31,yPosition,nameText.length > 24 ? 'scroll' : null]); // Desintation with possible scroll
        
        var timeText = obj.time;
        if (obj.flagRetraso > 0) timeText = "*"+timeText;
        if (obj.wait <= global.param.tiempoDeInmediataz) timeText = global.param.simboloDeInmediataz;  // Possible change for arrows
        
        segments.push([timeText,181,yPosition,timeText == global.param.simboloDeInmediataz ? 'blink' : null]);
        yPosition = yPosition + ySpacing;
    });
    if (services.length === 2) segments.push([global.param.textos.ultimos_servicios, 1, 37, null]); 
    if (services.length === 1) segments.push([global.param.textos.ultimo_servicio, 1, 37, null]);
    if (services.length === 0) segments.push([global.param.textos.servicios_finalizados, 1, 37, null]);

    this.segments = segments;
}


/* Servicios-parada panel - currently sending services with minutes to wait  Adds up to 3 services*/
Panel.prototype.calculaEstadoParada = function (){
    var services = [];
    this.listaServicios.sort(function(a, b){
        return a.wait-b.wait;
    })

    // Calculate waits
    this.listaServicios.forEach(function(s){
        if (services.length < 3) {
            if (s.wait >= 0) {
                services.push(s);
            }
        }
    });
    this.servicios = services;

    // SCROLL SYNC CALCULATION
    var flagScrollSync = 0;
    var maxStringLength = 0;
    // Calculate scrolls that need to be in sync
    this.servicios.forEach(function(s){
        if (s.name.length > 12) flagScrollSync++;
        if (s.name.length > maxStringLength) maxStringLength = s.name.length;
    });
    // If more than one have scroll, edit the lengths
    if (flagScrollSync > 1) {
        var space = " ";
        this.servicios.forEach(function(s){
            if (s.name.length > 12 && s.name.length < maxStringLength) 
                s.name = s.name + space.repeat(maxStringLength - s.name.length);
        });
    }
    
    var segments = [];

    // Spacing between lines on marquesina. x 1,30,96 and y 1,10,19
    var yPosition = 1;
    var ySpacing = 9; 
    services.forEach(function(obj){
        // Service number. No events possible
        segments.push([obj.service,1,yPosition,null]);  

        // Service destination. Possible scroll. effect if greater than 12 charcters
        if (obj.name.length > 12) segments.push([obj.name,31,yPosition,'scroll',103,yPosition + ySpacing]);
        else segments.push([obj.name,31,yPosition,null]);

        // Service wait. 
        // Change to two arrows if arriving soon.
        // Reduce the buses more than 100 minutes away to 99
        var waitText = obj.wait;
        var waitTime = parseInt(obj.wait);
        if (waitTime > 99) waitText = "99";

        if (waitTime <= global.param.tiempoDeInmediataz) {
            segments.push([global.param.simboloDeInmediataz,109,yPosition,'blink',120,yPosition + ySpacing -1]);
        } else {
            var waitSpace = (waitTime >= 10) ? 109 : 115; // One digit or two digit spacing
            segments.push([waitText,waitSpace,yPosition,null]);
        }

        yPosition = yPosition + ySpacing;
    });

    // Final messages. These go at the end.
    // Calculation to centre - 120 - t*6 (total length - 6px x text length) / 2 (half on each side) and add 1
    // Should I add scrolling events
    if (services.length === 2) {
        var text = global.param.textos.ultimos_servicios;
        segments.push([text, (120 - (text.length * 6)) /2 + 1, 19, null]); 
    }
    if (services.length === 1) {
        
        var text = global.param.textos.ultimo_servicio;
        segments.push([text, (120 - (text.length * 6)) /2 + 1, 19, null]);
    }
    if (services.length === 0) {
        var text = global.param.textos.servicios_finalizados;
        segments.push([text, (120 - (text.length * 6)) /2 + 1, 19, null]);
    }

    this.segments = segments;
}


module.exports = Panel;