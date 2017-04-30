'use strict';


var net= require('net'); 
var debug = require('../utils');
var Fabricante=require('./fabricante.js');

var fecha =require('moment');
fecha().format('MMMM Do YYYY, h:mm:ss a');



var Panel = function(campos){
    // Static parameters passed to the constructor
    this.id=campos.id;
    this.idpanel=campos.idpanel;
    this.ip=  campos.ip;
    this.puerto = campos.puerto;
    this.inactivo = campos.inactivo;
    this.type = campos.type;
    this.horaEnciendo = campos.horaEnciendo;
    this.horaApago = campos.horaApago;
    // Static paramters taken from the panel type configuration
    this.totalLines = global.param.panelTypes[this.type].lineasTotal;
    this.servicesLines = global.param.panelTypes[this.type].lineasServicios;
    this.flagLastServices = global.param.panelTypes[this.type].numeroUltimosServicios;
    this.lineHeight = global.param.panelTypes[this.type].alturaDeLinea;
    this.lineLength = global.param.panelTypes[this.type].longitudDeLinea;
    this.maxCharactersForName = global.param.panelTypes[this.type].maxCaracteresNombre;
    this.maxCharactersTotal = global.param.panelTypes[this.type].maxCaractersTotal
    this.textColor = global.param.panelTypes[this.type].colorTexto;
    this.textSpeed = global.param.panelTypes[this.type].velocidadTexto;
    this.textHeight = global.param.panelTypes[this.type].alturaTexto;
    // Dynamic parameters for the panel
    this.listaServicios =[];
    this.onOffStatus = 1; // 1 by default for testing (how do we turn on).
    this.servicios = '',
    this.estado='',
    this.incidencia='',
    this.flag =0,
    this.proceso=0
    this.conectado=false;
    this.conectadoEnv=false;
    this.intentosEstados = 0;
    this.intentosEnvio = 0;
    this.refrescoP = 65 * 1000;
    this.serieP = -1;
    this.messageOrder = 160; // 160 - 175
    this.segments = []; // Segments to encode
    this.incidenciaSegments = [];
};

Panel.prototype.EstaConectado = function () {
  var Estado = this.conectado || this.conectadoEnv; 
  if (Estado) debug.log(global.param.debugmode,"Connection already open. Postponing new connection");
  return Estado; 
};



/***********************************************************************************************
// CONSULTATION OF ESTADOS
***********************************************************************************************/

Panel.prototype.consultaEstado = function(callback){
    if (this.inactivo) {
        debug.log(global.param.debugmode,"Consult panel status. Panel: " + this.ip + " - Panel Inactivo");
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
        debug.log(global.param.debugmode,_that.proceso + ' - Status request CONNECT - ' + _that.ip);
        _that.conectado=true;
        var trama=panelConsulta.sendKeepAlive(_that.messageOrder.toString(16));
        _that.messageOrder = _that.messageOrder === 175 ? 160 : _that.messageOrder + 1; 
        var buff = new Buffer(trama, 'hex');
        panelSocket.write(buff);

    });

    panelSocket.on('data', function (data) {
        debug.log(global.param.debugmode,_that.proceso + ' - Status request DATA - ' + _that.ip);
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
        debug.log(global.param.debugmode,_that.proceso + ' - Status request CLOSE - ' + _that.ip);
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
        debug.log(global.param.debugmode,_that.proceso + ' - Status request ERROR - ' + _that.ip);
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
        debug.log(global.param.debugmode,_that.proceso + ' - Status request END. Connection ended with ' + _that.ip);
    });


    panelSocket.on('timeout', function(){
        debug.log(global.param.debugmode,_that.proceso + ' - Status request TIMED OUT - ' + _that.ip);
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
// ENVIAR INCINDENCIAS
***********************************************************************************************/

Panel.prototype.enviaIncidencia= function(callback){

    if (this.inactivo == 1){
        debug.log(global.param.debugmode,"Attempted to send incidences " + this.ip + " - Panel Inactivo");
        callback (null,null);
    } else {
        if (this.incidencia != ''){
            this._conexionParaEnvio(this.incidenciaSegments, function (err,res) {
                callback(err,res);
            });
        }
    }
};

/***********************************************************************************************
// ENVIAR SERVICIOS
***********************************************************************************************/

Panel.prototype.enviaServicios= function(callback){
    var that = this;
    if (this.inactivo == 1){
        debug.log(global.param.debugmode,"Attempted to send services " + this.ip + " - Panel Inactivo");
        callback (null,null);
    } else {
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
    var panelEnvio = new Fabricante(this.ip, this.textColor, this.textSpeed, this.textHeight);
    var envioSocket = net.connect({host: this.ip, port: this.puerto});
    envioSocket.setTimeout(global.param.tiempoEspera);

    var buffers = [];
    var endRight = _that.lineLength;
    var endBottom = _that.lineHeight * _that.totalLines;
    buffers.push(panelEnvio.sendDeleteMessage(_that.messageOrder.toString(16),1,1,endRight,endBottom));
    _that.messageOrder = _that.messageOrder === 175 ? 160 : _that.messageOrder + 1; 
    mensajes.forEach(function(m,i){
        if (m[3] === null ) buffers.push(panelEnvio.sendFixedTextMessage(_that.messageOrder.toString(16),m[0],m[1],m[2]));
        else buffers.push(panelEnvio.sendTextMessageWithEffect(_that.messageOrder.toString(16),m[0],m[1],m[2],m[3],m[4],m[5]));
         _that.messageOrder = _that.messageOrder === 175 ? 160 : _that.messageOrder + 1; 
    });
    buffers.push(panelEnvio.sendSyncCommand(_that.messageOrder.toString(16)));
    _that.messageOrder = _that.messageOrder === 175 ? 160 : _that.messageOrder + 1; 


    envioSocket.on('connect',function(){
        _that.conectadoEnv=true;
        debug.log(global.param.debugmode,_that.proceso + ' - Send request CONNECT - ' + _that.ip);
        var buff = new Buffer(buffers[0], 'hex');
        envioSocket.write(buff);
        debug.log(global.param.debugmode,_that.proceso + " - Sent string -" + buffers[0] + " to " + _that.ip + " - ");
    });


    envioSocket.on('data', function (data) {
        panelEnvio.trataEnvio(data,function(mens){
            debug.log(global.param.debugmode,_that.proceso + ' - Send request CONNECT - ' + _that.ip);
            debug.log(global.param.debugmode,_that.proceso + " - Send request DATA -" + _that.ip + " - recieved: " + mens);
            if (mens === "06") {
                buffers.splice(0,1);
                if (buffers.length > 0) {
                    var buff = new Buffer(buffers[0], 'hex');
                    envioSocket.write(buff);
                    debug.log(global.param.debugmode,_that.proceso + " - Sent string -" + buffers[0] + " to " + _that.ip + " - ");
                } else {
                    envioSocket.destroy();
                } 
            } else {
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
                    var buff = new Buffer(buffers[0], 'hex');
                    envioSocket.write(buff);
                    debug.log(global.param.debugmode,_that.proceso + " - Resent string-" + buffers[0] + " to " + _that.ip + " - ");
                    callback(e, null);
                } 
            }
            
        });
    });

    envioSocket.on('close', function (had_error){
        debug.log(global.param.debugmode,_that.proceso + ' - Send request CLOSE - ' + _that.ip);
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
        debug.log(global.param.debugmode,_that.proceso + ' - Send request ERROR - ' + _that.ip);
        if (_that.conectadoEnv) {
            envioSocket.destroy();
        } else {
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
                var buff = new Buffer(buffers[0], 'hex');
                envioSocket.write(buff);
                debug.log(global.param.debugmode,_that.proceso + " - Resent string-" + buffers[0] + " to " + _that.ip + " - ");
                callback(e, null);
            }       
        }
    });

    envioSocket.on('end',function(){
        debug.log(global.param.debugmode,_that.proceso + ' - Send request END. Conexion finalizada con ' + _that.ip);
    });

    envioSocket.on('timeout', function(){
        debug.log(global.param.debugmode,_that.proceso + ' - Send request TIMEOUT - ' + _that.ip);
        if (_that.conectadoEnv) {
            envioSocket.destroy();
        } else {
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
                var buff = new Buffer(buffers[0], 'hex');
                envioSocket.write(buff);
                 debug.log(global.param.debugmode,_that.proceso + " - Resent string-" + buffers[0] + " to " + _that.ip + " - ");
                callback(e, null);
            } 
        }
    });

};

/***********************************************************************************************
// FUNCTION TO CHECK IF THE PANEL IS ON/OFF FROM THE TURN ON AND TURN OFF HOURS
* if a panel is changing from off => on, it automatically sends an empty message array to 
trigger a delete-sync message to blank the panel
***********************************************************************************************/

Panel.prototype.checkTurnOff = function (){
    var _this = this;

    function getMinutes(str) {
        var time = str.split(':');
        return time[0]*60+time[1]*1;
    }
    function getMinutesNow() {
        var timeNow = new Date();
        return timeNow.getHours()*60+timeNow.getMinutes();
    }

    var now = getMinutesNow();
    var start = getMinutes(this.horaEnciendo);
    var end = getMinutes(this.horaApago);
    if (start > end) end += getMinutes('24:00');

    if ((now > start) && (now < end)) {
        this.onOffStatus = 1;
        this.inactivo = 0;
    } else {
        if (this.onOffStatus === 1) {
            this.inactivo = 1;
            this.onOffStatus = 0;
            this._conexionParaEnvio([], function (err,res) {
                callback(err,res);
            });
        } 
    }

    
};



/***********************************************************************************************
// PARSING OF THE CURRENT SERVICES INTO SEGMENTS TO SEND TO THE PANELS
***********************************************************************************************/


Panel.prototype.calculateServicesInSegments = function (){
    var _this = this;
    var services = [];

    this.listaServicios.sort(function(a, b){
        return a.wait-b.wait;
    })

    this.listaServicios.forEach(function(s){
        if (services.length < _this.servicesLines) {
            if (s.wait >= 0) {
                services.push(s);
            }
        }
    });
    this.servicios = services;

    this.calculateScrollSyncronization(this.maxCharactersForName);
    var segments = [];

    var yPosition = 1;
    var ySpacing = this.lineHeight; 


    services.forEach(function(obj){
        segments.push([obj.service,1,yPosition,null]); 
        if (_this.type === "MARQUESINA") {
           segments.push(_this.calculateServiceNameMarquesina(obj.name,yPosition,ySpacing));
           segments.push(_this.calculateWaitTimeMarquesina(obj.wait,yPosition,ySpacing)); 
        } else if (_this.type === "INFORMACION") {
            segments.push(_this.calculateServiceNameInformacion(obj.name,obj.flagRetraso,obj.flagCancelado,yPosition,ySpacing));
            if (obj.flagRetraso > 0) segments.push(_this.addFlashingAsterix(yPosition,ySpacing));
            if (obj.flagCancelado > 0) segments.push(_this.addFlashingAsterix(yPosition,ySpacing));
            segments.push(_this.calculateDepartTimeInformacion(obj.time,obj.wait,obj.flagRetraso,obj.flagCancelado,yPosition,ySpacing));
        }

        yPosition = yPosition + ySpacing;
    });


    var lastLineStart = this.lineHeight * (this.totalLines - 1) + 1;
    if (services.length <= this.flagLastServices && services.length > 1) {
        var text = global.param.textos.ultimos_servicios;
        if (text.length > this.maxCharactersTotal) 
            segments.push([text,1,lastLineStart,'scroll',_this.lineLength,lastLineStart + _this.lineHeight]);
        else 
            segments.push([text,(_this.lineLength - (text.length * 6)) /2 + 1,lastLineStart,null]);
    }
    if (services.length === 1) {
        var text = global.param.textos.ultimo_servicio;
        if (text.length > this.maxCharactersTotal) 
            segments.push([text,1,lastLineStart,'scroll',_this.lineLength,lastLineStart + _this.lineHeight]);
        else 
            segments.push([text,(_this.lineLength - (text.length * 6)) /2 + 1,lastLineStart,null]);
    }
    if (services.length === 0) {
        var text = global.param.textos.servicios_finalizados;
        if (text.length > this.maxCharactersTotal) 
            segments.push([text,1,lastLineStart,'scroll',_this.lineLength,lastLineStart + _this.lineHeight]);
        else 
            segments.push([text,(_this.lineLength - (text.length * 6)) /2 + 1,lastLineStart,null]);
    }
    this.segments = segments;
}

/* MARQEUESINA NAME
// Simple scroll added if we are over the maximum number of characters
*/

Panel.prototype.calculateServiceNameMarquesina = function(name,yPosition,ySpacing){
    if (name.length > this.maxCharactersForName) return [name,31,yPosition,'scroll',103,yPosition + ySpacing];
    else return [name,31,yPosition,null];
}

/* INFORMATION NAME
// Default position 31 - 174
// Compares with maximum text. Paramter reduceCharForAsterix reduces 1 char for asterik space
// Simple scroll added if over the maximum number of characters
*/

Panel.prototype.calculateServiceNameInformacion = function(name,flagRetraso,flagCancelado,yPosition,ySpacing){
    var nameText = name;
    var endPosition = 174;
    var reduceCharForAsterix = 0;

    if (flagRetraso > 0) {
        nameText = nameText + global.param.textos.servicioRetrasado;
        endPosition = 168;
        reduceCharForAsterix = 1;
    }
    if (flagCancelado > 0) {
        nameText = nameText + global.param.textos.servicioCancelado;
        endPosition = 168;
        reduceCharForAsterix = 1;
    }
    if (name.length > this.maxCharactersForName - reduceCharForAsterix) return [nameText,31,yPosition,'scroll',endPosition,yPosition + ySpacing];
    else return [nameText,31,yPosition,null];
}

/* MARQUESINA WAIT TIME
// Changes anything above 100 to 99 for default spacing
// Calculates if an event is needed for blinking immediate event
*/

Panel.prototype.calculateWaitTimeMarquesina = function(wait,yPosition,ySpacing){
    var waitText = wait;
    var waitTime = parseInt(wait);
    if (waitTime > 99) waitText = "99";
    if (waitTime <= global.param.tiempoDeInmediataz) {
        return [global.param.simboloDeInmediataz,109,yPosition,'blink',120,yPosition + ySpacing -1];
    } else {
        var waitSpace = (waitTime >= 10) ? 109 : 115; // One digit or two digit spacing
        return [waitText,waitSpace,yPosition,null];
    }
}

/* PANEL DEPART TIME
// DEfault position is 181 - 210
// Reduce start position to 199 for blinking immediate symbols
*/

Panel.prototype.calculateDepartTimeInformacion = function(time,wait,flagRetraso,flagCancelado,yPosition,ySpacing){
    var timeText = time; 
    var action = null; 
    var startPosition = 181; 

    if (wait <= global.param.tiempoDeInmediataz) {
        timeText = global.param.simboloDeInmediataz; 
        action = 'blink';
        startPosition = 199; // Two characters only. Blinks from 199 to the end
    }
    if (action === 'blink') return [timeText,startPosition,yPosition,'blink',210,yPosition + ySpacing];
    else return [timeText,startPosition,yPosition,null];
}

/* ADDS FLASHING ASTERIX TO INFORMATION PANEL
// Default 1 character in position 175 - 180
*/

Panel.prototype.addFlashingAsterix = function(yPosition,ySpacing){
    return ["*",175,yPosition,'blink',180,yPosition + ySpacing];
}

/* CALCULATE SCROLL SYNC
*/

Panel.prototype.calculateScrollSyncronization = function(textSpace){
    var flagScrollSync = 0;
    var maxStringLength = 0;
    this.servicios.forEach(function(s){
        if (s.name.length > textSpace) flagScrollSync++;
        if (s.name.length > maxStringLength) maxStringLength = s.name.length;
    });
    if (flagScrollSync > 1) {
        var space = " ";
        this.servicios.forEach(function(s){
        if (s.name.length > textSpace && s.name.length < maxStringLength) 
            s.name = s.name + space.repeat(maxStringLength - s.name.length);
        });
    } 
}

/* CALCULATE INCIDENCIAS IN SEGMENTS
// Split the text into lines by # tag, and cut the array to the correct size
// Calculate the space needed and the vertical start
// Push each individual line as a segment
*/


Panel.prototype.calculateIncidenciaInSegments = function() {
    var _this = this;
    var segments = [];

    var incidenciasArray = this.incidencia.trim().split("#");
    if (incidenciasArray[0].trim() === "") incidenciasArray.splice(0,1);
    if (incidenciasArray.length > _this.totalLines) incidenciasArray.splice(_this.totalLines,incidenciasArray.length - 1);

    var spaceNeeded = _this.lineHeight * incidenciasArray.length;
    var startingLine = Math.floor((_this.lineHeight * _this.totalLines - spaceNeeded) / 2) + 1;

    var totalLines = 0;
     // Trim and push each element
    incidenciasArray.forEach(function(word,ind){
        word = word.trim();
        if (word.length > _this.maxCharactersTotal) word = word.substring(0, _this.maxCharactersTotal);
        var positionY = _this.lineHeight * ind + startingLine;
        segments.push([word,(_this.lineLength - (word.length * 6)) /2 + 1, positionY, null]);
    });

    this.incidenciaSegments = segments;

}

    

module.exports = Panel;