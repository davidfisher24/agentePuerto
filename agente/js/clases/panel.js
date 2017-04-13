'use strict';

/**
 *
 * 1/3/2016 JMMayo.
 *   1.-  Añadida comprobación que no permita conectar con un panel si tiene una conexión en curso. 
 *        Al tratarse de hilos independientes gestionados por temporizadores se puede dar la circunstancia de que estado y envío concurran.
 * 
 *   2.- Las variables de intentos IntentosEstados e IntentosEnvio no pueden ser globales, sino campos de cada panel, de lo contrario se los reintentos de un panel se suman a los de otro
 * 
 *   3.- Los prototipos son el mismo objeto por lo que se puede hacer uso de "this" y no es necesario pasar el "this" como parámetro
 */


var net= require('net');
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
};

/**
 * Consulta del estado de un panel devolviendo el mensaje
 */
Panel.prototype.consultaEstado = function(callback){
    //Si el panel esta INACTIVO - ESTADO 2
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


Panel.prototype.EstaConectado = function () {
  var Estado = this.conectado || this.conectadoEnv; 
  if (Estado) debug.log(global.param.debugmode,"Conexión ya abierta. Se pospone nueva conexión.");
  return Estado; 
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
        //Selección de panel

        var trama=panelConsulta.tramaSeleccion(_that.id);
        var buff = new Buffer(trama, 'hex');
        panelSocket.write(buff);

        //Enviamos peticion de estado al panel
        var t2 = panelConsulta.tramaPeticionEstado();
        var buff2 = new Buffer(t2, 'hex');
        panelSocket.write(buff2);
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

    //Event Close se emite cuando se produce un error en el socket
    panelSocket.on('close', function (had_error){
        _that.conectado=false;
        if (had_error){
            if ((_that.intentosEstados<global.param.numReintentos) && (_that.intentosEstados!=0)) {
                setTimeout(function(){
                    _that._conexionParaConsulta(callback);
                }, global.param.tiempoReintentos); //Try to reconnect EDITED
            }
        } else {
            _that.intentosEstados =0;
        }
    });

    panelSocket.on('error', function (e){
        if (_that.conectado) {
            panelSocket.destroy();  // cerramos manualmente la conexion
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
            panelSocket.destroy();  // cerramos manualmente la conexion
        }
        setTimeout(function(){
            if (_that.intentosEstados < global.param.numReintentos){
                _that.intentosEstados++;
                _that._conexionParaConsulta(callback);
            }
        }, global.param.tiempoReintentos); //Try to reconnect EDITED
    });
};


/**
 * Envia una incidencia a un panel siempre que no este inactivo
 */
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

/**
 * Envia una incidencia a un panel
 */
Panel.prototype.enviaServicios= function(callback){

    if (this.inactivo == 1){
        debug.log(global.param.debugmode,"Envio de servicios a panel " + this.ip + " - Panel Inactivo");
        callback (null,null);
    } else {
        if (this.incidencia == ''){
            this._conexionParaEnvio(this.servicios, function (err,res) {
                callback(err,res);
            });
        }
    }
};

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


Panel.prototype._conexionParaEnvio=function (mensaje,callback){

    if (this.EstaConectado()) return;

    var ran = Math.floor((Math.random() * 9999) + 1);
    this.proceso=ran;
    this.conectadoEnv=false;
    var panelEnvio = new Fabricante(this.ip);
    var envioSocket = net.connect({host: this.ip, port: this.puerto});

    envioSocket.setTimeout(global.param.tiempoEspera);

    var _that = this;

    envioSocket.on('connect',function(){
        debug.log(global.param.debugmode, _that.proceso +' - Panel conectado para el envio: ' + _that.ip);
        _that.conectadoEnv=true;
        //1: Calculamos la trama de seleccion del panel y la enviamos

         var t1=panelEnvio.tramaSeleccion(_that.id);
         var buff = new Buffer(t1, 'hex');
         envioSocket .write(buff);
        debug.log(global.param.debugmode,_that.proceso + "- Envio trama seleccion -" + _that.ip + " - " + t1.toString());

        //1: Calculamos la trama de peticion de permiso de envio de mensajes y la enviamos al panel
        var t2 = panelEnvio.tramaPeticionEnvio(_that,mensaje);
        var buff2 = new Buffer(t2, 'hex');
        envioSocket.write(buff2);
        debug.log(global.param.debugmode,_that.proceso + " - Envio trama peticion -" + _that.ip + " - " + t2.toString());
    });

    envioSocket.on('data', function (data) {
        if (data.length !== 0) {
            //Si el panel da permiso para el envio  devuelve la trama con el mensaje a enviar y la enviamos
            debug.log (global.param.debugmode,_that.proceso + "- Panel " + _that.ip +". Datos recibidos " + data.toString('hex') + " --> " + data.toString());
            panelEnvio.trataEnvio(data,function(err,mens){

                if (mens!=null) {
                    //Devuelve el mensaje o la finalizacion del envio
                    if (mens=='S') {  // Finalizacion del envio
                        callback(null, "Mensaje enviado correctamente al panel");
                        envioSocket.end();
                    } else if (mens=='N') {
                        callback(new Error(1,'El panel no da permiso para el envio'),null);
                    } else {
                        //2: Enviamos el mensaje al panel que ha dado el permiso de envio
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
        }
    });

    //Si hay error enviado informacion, se realiza un reintento de envio
    envioSocket.on('close', function (had_error){
        _that.conectadoEnv =false;
        if (had_error){
            setTimeout(function(){
                if (_that.intentosEnvio < global.param.numReintentos){
                    _that.intentosEnvio=+1;
                    _that._conexionParaEnvio(mensaje,callback);
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

                _that._conexionParaEnvio(mensaje,callback);
            }
        }, global.param.tiempoReintentos);
    });

};

/* Servicios-dia panel - currently sending hours. Adds up to 3 services */
Panel.prototype.calculaEstadoServicios = function (){
    var services = [];
    // lista servicios needs ordering

    this.listaServicios.forEach(function(s){
        if (services.length < 3) {
            services.push(s);
        }
    });
    this.servicios = services;
}

/* Servicios-parada panel - currently sending services with minutes to wait  Adds up to 3 services*/
Panel.prototype.calculaEstadoParada = function (){
    var services = [];
    // listaservicios needs ordering

    this.listaServicios.forEach(function(s){
        if (services.length < 3) {
            if (s.time >= 0) {
                services.push(s);
            }
        }
    });
    this.servicios = services;
}




module.exports = Panel;