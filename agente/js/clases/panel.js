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
    // If we are debugging this panel, run the construct function.
    this.debug = campos.debug;
    if (this.debug === 1) this.createLogFiles();
};

Panel.prototype.createLogFiles = function (){
    debug.createPanelLog(this.id);
    debug.createPanelServicesLog(this.id);
};

Panel.prototype.EstaConectado = function () {
  var Estado = this.conectado || this.conectadoEnv; 
  if (Estado) debug.panelLog(this.debug,"Connection already open. Postponing new connection",this.id);
  return Estado; 
};



/***********************************************************************************************
// CONSULTATION OF ESTADOS
***********************************************************************************************/

Panel.prototype.consultaEstado = function(callback){
    if (this.inactivo) {
        debug.panelLog(this.debug,"Consult panel status. Panel: " + this.ip + " - Panel Inactivo",this.id);
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
        debug.panelLog(_that.ip,_that.proceso + ' - CONNECT status request - ' + _that.ip,_that.id);
        _that.conectado=true;
        var trama=panelConsulta.sendKeepAlive(_that.messageOrder.toString(16));
        _that.messageOrder = _that.messageOrder === 175 ? 160 : _that.messageOrder + 1; 
        var buff = new Buffer(trama, 'hex');
        panelSocket.write(buff);

    });

    panelSocket.on('data', function (data) {
        if (data.length!==0) {
            var dR=new Buffer(data.toString(),'hex');
            var datos=panelConsulta.trataConsulta(dR);
            if (typeof datos != 'undefined') {
                debug.panelLog(_that.debug,_that.proceso + ' - DATA status request - ' + _that.ip + " - " + datos.toString(),_that.id);
                
                var screenText = "";
                _that.segments.forEach(function(segTxt){
                    screenText += segTxt[0] + "#";
                });
                screenText = screenText.substring(0,screenText.length - 1);

                var obj={id: (_that.id).toString(),
                    estado: "0",
                    //texto: datos.toString()
                    texto: screenText,
                };
                _that.estado = obj;
                panelSocket.end();
                callback(null,obj);
            }
        }
    });

    panelSocket.on('close', function (had_error){
        debug.panelLog(_that.debug,_that.proceso + ' - CLOSE status request - ' + _that.ip,_that.id);
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
        debug.panelLog(_that.debug,_that.proceso + ' - ERROR Status request - ' + _that.ip,_that.id);
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
        debug.panelLog(_that.debug,_that.proceso + ' - END status request. Connection ended with ' + _that.ip,_that.id);
    });


    panelSocket.on('timeout', function(){
        debug.panelLog(_that.debug,_that.proceso + ' - TIMED OUT status request - ' + _that.ip,_that.id);
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
        debug.panelLog(this.debug,"Attempted to send incidences " + this.ip + " - Panel Inactivo",this.id);
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
        debug.panelLog(this.debug,"Attempted to send services " + this.ip + " - Panel Inactivo",this.id);
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
        var buff = new Buffer(buffers[0], 'hex');
        envioSocket.write(buff);
        debug.panelLog(_that.debug,_that.proceso + " - Sent string -" + buffers[0] + " to " + _that.ip + " - ",_that.id);
    });


    envioSocket.on('data', function (data) {
        panelEnvio.trataEnvio(data,function(mens){
            debug.panelLog(_that.debug,_that.proceso + " - Recieved Response -" + _that.ip + " : " + mens,_that.id);
            if (mens === "06") {
                buffers.splice(0,1);
                if (buffers.length > 0) {
                    var buff = new Buffer(buffers[0], 'hex');
                    envioSocket.write(buff);
                     debug.panelLog(_that.debug,_that.proceso + " - Sent string -" + buffers[0] + " to " + _that.ip + " - ",_that.id);
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
                     debug.panelLog(_that.debug,_that.proceso + " - Tried to resend string -" + buffers[0] + " to " + _that.ip + " - ",_that.id);
                } 
            }
            
        });
    });

    envioSocket.on('close', function (had_error){
        debug.panelLog(_that.debug,_that.proceso + ' - Send request CLOSE - ' + _that.ip,_that.id);
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
        debug.panelLog(_that.debug,_that.proceso + ' - Send request ERROR - ' + _that.ip,_that.id);
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
                debug.panelLog(_that.debug,_that.proceso + " - Resent string - " + buffers[0] + " to " + _that.ip + " - ",_that.id);
                callback(e, null);
            }       
        }
    });

    envioSocket.on('end',function(){
        debug.panelLog(_that.debug,_that.proceso + ' - Send request END. Ending connection with ' + _that.ip,_that.id);
    });

    envioSocket.on('timeout', function(){
        debug.panelLog(_that.debug,_that.proceso + ' - Send request TIMEOUT - ' + _that.ip,_that.id);
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
                debug.panelLog(_that.debug,_that.proceso + " - Resent string-" + buffers[0] + " to " + _that.ip + " - ",_that.id);
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
        if (this.onOffStatus === 0)  debug.panelLog(_this.debug, "Triggered turn OFF panel: " + _this.ip,_this.id);
        _this.onOffStatus = 1;
        _this.inactivo = 0;
    } else {
        if (this.onOffStatus === 1) {
            debug.panelLog(_this.debug, "Triggered turn ON panel: " + _this.ip,_this.id);
            _this.inactivo = 1;
            _this.onOffStatus = 0;
            _this._conexionParaEnvio([], function (err,res) {
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
    
    var currentDate = new Date();// Debugging
    debug.panelServicesLog(this.debug,'-- List of services after sorting --',this.id); //Debugging
    debug.panelServicesLog(this.debug,'-- Javascript time now is '+currentDate.getHours() +':'+currentDate.getMinutes()+' --',this.id); //Debugging
    this.listaServicios.forEach(function(s){
        var serMes = s.service +" "+ s.name +" "+ s.time +" "+ s.wait +" "+ s.flagArrivingNow +" "+ s.flagRetraso;  //Debugging
        debug.panelServicesLog(_this.debug,serMes,_this.id);  //Debugging
        if (services.length < _this.servicesLines) {
            if (s.wait >= 0) {
                services.push(s);
            }
        }
    });
    this.servicios = services;

    // Debugging
    debug.panelServicesLog(this.debug,'-- Final services sent to the panel --',this.id);
    this.servicios.forEach(function(se){
        var serMes = se.service +" "+ se.name +" "+ se.time +" "+ se.wait +" "+ se.flagArrivingNow +" "+ se.flagRetraso;
        debug.panelServicesLog(_this.debug,serMes,_this.id);
    });
    // end debugging

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
    var yOffset = yPosition + ySpacing;
    if (yOffset > this.totalLines * this.lineHeight) yOffset = this.totalLines * this.lineHeight;

    if (name.length > this.maxCharactersForName) return [name,31,yPosition,'scroll',103,yOffset];
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

    var yOffset = yPosition + ySpacing;
    if (yOffset > this.totalLines * this.lineHeight) yOffset = this.totalLines * this.lineHeight;

    if (nameText.length > this.maxCharactersForName - reduceCharForAsterix) return [nameText,31,yPosition,'scroll',endPosition,yOffset];
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
*** Now deprecated. Only sent is the time blinking. Everything else remains the same ***
*/

Panel.prototype.calculateDepartTimeInformacion = function(time,wait,flagRetraso,flagCancelado,yPosition,ySpacing){
    var timeText = time; 
    var action = null; 
    var startPosition = 181; 

    if (wait <= global.param.tiempoDeInmediataz) {
        //timeText = global.param.simboloDeInmediataz;  No need to change text to symbol
        action = 'blink';
        ///startPosition = 199; // No need to change start poition of the element
    }

    var yOffset = yPosition + ySpacing;
    if (yOffset > this.totalLines * this.lineHeight) yOffset = this.totalLines * this.lineHeight;

    if (action === 'blink') return [timeText,startPosition,yPosition,'blink',210,yOffset];
    else return [timeText,startPosition,yPosition,null];
}

/* ADDS FLASHING ASTERIX TO INFORMATION PANEL
// Default 1 character in position 175 - 180
*/

Panel.prototype.addFlashingAsterix = function(yPosition,ySpacing){
    var yOffset = yPosition + ySpacing;
    if (yOffset > this.totalLines * this.lineHeight) yOffset = this.totalLines * this.lineHeight;
    return ["*",175,yPosition,'blink',180,yOffset];
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