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
// ENVIAR INCINDENCIAS
***********************************************************************************************/

Panel.prototype.enviaIncidencia= function(callback){

    if (this.inactivo == 1){
        debug.log(global.param.debugmode,"Envio de incidencias a panel " + this.ip + " - Panel Inactivo");
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
        debug.log(global.param.debugmode,"Envio de servicios a panel " + this.ip + " - Panel Inactivo");
        callback (null,null);
    } else {
        if (this.incidencia == ''){
            console.log(this.segments);
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

    // Array of buffers. Delete message, all segments, and sync commands/
    var buffers = [];
    // Parameters for delete message
    var endRight = _that.lineLength;
    var endBottom = _that.lineHeight * _that.totalLines;
    // Add delete message
    console.log(endRight,endBottom);
    buffers.push(panelEnvio.sendDeleteMessage(_that.messageOrder.toString(16),1,1,endRight,endBottom));
    _that.messageOrder = _that.messageOrder === 175 ? 160 : _that.messageOrder + 1; 
    // Add each segment
    mensajes.forEach(function(m,i){
        console.log("Encoding " + m);
        if (m[3] === null ) buffers.push(panelEnvio.sendFixedTextMessage(_that.messageOrder.toString(16),m[0],m[1],m[2]));
        else buffers.push(panelEnvio.sendTextMessageWithEffect(_that.messageOrder.toString(16),m[0],m[1],m[2],m[3],m[4],m[5]));
         _that.messageOrder = _that.messageOrder === 175 ? 160 : _that.messageOrder + 1; 
    });
    // Add sync command
    buffers.push(panelEnvio.sendSyncCommand(_that.messageOrder.toString(16)));
    _that.messageOrder = _that.messageOrder === 175 ? 160 : _that.messageOrder + 1; 

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
        buffers.splice(0,1);
        panelEnvio.trataEnvio(data);
        // Do we need to wait for a response to do something here.

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
    services[3].flagCancelado = 1;
    console.log(services[3].flagCancelado);

    this.calculateScrollSyncronization(this.maxCharactersForName);
    var segments = [];

    var yPosition = 1;
    var ySpacing = this.lineHeight; 


    services.forEach(function(obj){
        segments.push([obj.service,1,yPosition,null]); 
        console.log(obj.flagCancelado);
        if (_this.type === "MARQUESINA") {
           segments.push(_this.calculateServiceNameMarquesina(obj.name,yPosition,ySpacing));
           segments.push(_this.calculateWaitTimeMarquesina(obj.wait,yPosition,ySpacing)); 
        } else if (_this.type === "INFORMACION") {
            segments.push(_this.calculateServiceNameInformacion(obj.name,obj.flagRetraso,obj.flagCancelado,yPosition,ySpacing));
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

Panel.prototype.calculateServiceNameMarquesina = function(name,yPosition,ySpacing){
    if (name.length > this.maxCharactersForName) return [name,31,yPosition,'scroll',103,yPosition + ySpacing];
    else return [name,31,yPosition,null];
}

Panel.prototype.calculateServiceNameInformacion = function(name,flagRetraso,flagCancelado,yPosition,ySpacing){
    var nameText = name; 
    if (flagRetraso > 0) nameText = nameText + global.param.textos.servicioRetrasado;
    if (flagCancelado > 0) nameText = nameText + global.param.textos.servicioCancelado;
    if (name.length > this.maxCharactersForName) return [nameText,31,yPosition,'scroll',174,yPosition + ySpacing];
    else return [nameText,31,yPosition,null];
}

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

Panel.prototype.calculateDepartTimeInformacion = function(time,wait,flagRetraso,flagCancelado,yPosition,ySpacing){
    var timeText = time;
    var action = null;
    var startPosition = 181;

    if (flagRetraso > 0 || flagCancelado > 0) {
        timeText = global.param.textos.simboloRetrasoCancelo+timeText;
        //action = 'blink'; ??
        startPosition = 175;
    }
    if (wait <= global.param.tiempoDeInmediataz) {
        timeText = global.param.simboloDeInmediataz; 
        action = 'blink';
        startPosition = 199;
    }
    // 175 or 181 ??
    if (action === 'blink') return [timeText,startPosition,yPosition,'blink',210,yPosition + ySpacing];
    else return [timeText,startPosition,yPosition,null];
}

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

Panel.prototype.calculateIncidenciaInSegments = function() {
    var _this = this;
    var segments = [];

    // Array of incidencias segments
    var incidenciasArray = this.incidencia.trim().split("#");
    if (incidenciasArray[0].trim() === "") incidenciasArray.splice(0,1);

    // Space of lines needed and the starting line calculation
    var spaceNeeded = _this.lineHeight * incidenciasArray.length;
    var startingLine = Math.floor((_this.lineHeight * _this.totalLines - spaceNeeded) / 2) +1;

   
    var flagScroll = false;
    var textLimit = 0;
    incidenciasArray.forEach(function(el){
        if (el.trim().length > _this.maxCharactersTotal) flagScroll = true;
        if (el.trim().length > textLimit) textLimit = el.trim().length;
    });

     // Trim and push each element
    incidenciasArray.forEach(function(word,ind){
        var space = " ";
        word = flagScroll ? word.trim() + space.repeat(textLimit - word.trim().length) : word.trim();
        var positionY = _this.lineHeight * ind + startingLine;
        if (flagScroll) segments.push([word,1, positionY, 'scroll',_this.maxCharactersTotal * 6,positionY + _this.lineHeight]);
        else segments.push([word,(_this.lineLength - (word.length * 6)) /2 + 1, positionY, null]);
    });
    console.log(segments);
    this.incidenciaSegments = segments;


    /*var _this = this;
    var segments = [];

    if (this.incidencia.length <= this.maxCharactersTotal)  {
       var centrePosition = Math.floor((_this.lineHeight * _this.totalLines / 2));
       segments.push([_this.incidencia, (_this.lineLength - (_this.incidencia.length * 6)) /2 + 1, centrePosition, null]); 
    } else {
        var arrayOfWords = this.incidencia.split(" ");
        var lines = [];
        var i = 0;
        
        arrayOfWords.forEach(function(w){
            if (lines[i] === undefined) {
                lines[i] = w + " ";
            } else if (lines[i].length + w.length < _this.maxCharactersTotal) {
                lines[i] += w + " ";
            } else {
                i++;
                lines[i] = w + " ";
            }
        })

        var panelHeight = _this.lineHeight * _this.totalLines;
        var paddingTop = lines.length < _this.totalLines ? Math.floor((panelHeight - (_this.lineHeight * 2)) / 2 + 1) : 1;

        lines.forEach(function(l,i){
            if (l !== "") {
                l = l.trim();
                var positionY = _this.lineHeight * i + paddingTop;
                segments.push([l,(_this.lineLength - (l.length * 6)) /2 + 1, positionY, null])
            }
        });
    }

    this.incidenciaSegments = segments;*/
}

    

module.exports = Panel;