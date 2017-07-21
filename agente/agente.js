 'use strict';

//---------------------------------------
// Dependencies
//---------------------------------------

var agente = require('./js/clases');
var debug = require('../agente/js/utils');
var http = require('http');

//----------------------------------------------------
// Global variables 
//----------------------------------------------------

global.param={
    debugmode: 0, 
    serieS : -1, 
    serieI : -1, 
    refrescoS : 65*1000,  
    refrescoP : 65*1000,  
    refrescoI : 65*1000, 
    refrescoE : 60*1000, 
    numReintentos : 1, 
    tiempoReintentos : 1, 
    tiempoEspera : 30,  
    numeroIntentosSinRecibirDatos: 15,
    textos :"",  
    simboloDeInmediataz: ">>" 
};

//----------------------------------------------------
// Panels Agent object
//----------------------------------------------------

var agentePaneles = function (params) {
    var _that = this;
    _that.io = params.io;
    _that.ioMensaje={
      texto:''
    };
    var panelesGlobal=[];
    var settingJSON;
    var panelsJSON;
    var parametros;
    var recursoIncidencias={};
    var recursoEstados={};
    var recursoServicios ={};
    var recursoServiciosParada = {}; 
    // Arrays of panels
    var panelesSistema =[]; 
    var panelesMarquesina = [];
    var panelesInformacion = [];

/*----------------------------------------------------
// Function - initial load of the configuration
* Sets all of our config parameters from the config.json file
* Forms three arrays of panels objects, one for marquesina panels
  one for information, and one of all the panels
//---------------------------------------------------*/

    _that.cargaInicial =function (callback){

        settingJSON = require('./api/config.json'); 
        panelsJSON = require('./api/panels.json');
        panelesGlobal = panelsJSON.paneles;
        parametros = settingJSON.parametros;
        global.param.debugmode = parametros.debugmode;
        global.param.refrescoE= parametros.tiempoRefresco * 1000;
        global.param.numReintentos =parametros.numeroReintentos;
        global.param.tiempoReintentos = parametros.tiempoEntreReintento * 1000;
        global.param.tiempoEspera = parametros.tiempoEspera * 1000;
        global.param.textos=settingJSON.textos;
        global.param.panelTypes=settingJSON.panelTypes;
        global.param.simboloDeInmediataz = parametros.simboloDeInmediataz;

        global.param.numeroIntentosSinRecibirDatos = parametros.numeroIntentosSinRecibirDatos;
        global.param.failedApiCallsServiciosDia = 0;
        global.param.failedApiCallsIncidencias = 0;

        recursoIncidencias= {
            hostname: settingJSON.incidencias.host,
            port: settingJSON.incidencias.puerto,
            path: settingJSON.incidencias.ruta,
            method: settingJSON.incidencias.metodo
        };
        recursoEstados= {
            hostname: settingJSON.estados.host,
            port: settingJSON.estados.puerto,
            path: settingJSON.estados.ruta,
            method: settingJSON.estados.metodo,
            headers: {'Content-Type': 'application/json;charset=utf-8'}
        };
        recursoServicios= {
            hostname: settingJSON.servicios.host,
            port: settingJSON.servicios.puerto,
            path: settingJSON.servicios.ruta,
            method: settingJSON.servicios.metodo
        };
        recursoServiciosParada= {
            hostname: settingJSON.serviciosParada.host,
            port: settingJSON.serviciosParada.puerto,
            path: settingJSON.serviciosParada.ruta,
            method: settingJSON.serviciosParada.metodo
        };

        panelesGlobal.forEach(function(elem){
            var p = new  agente.Panel(elem);  
            panelesSistema.push (p); 
            if (p.type === "MARQUESINA") panelesMarquesina.push(p); 
            if (p.type === "INFORMACION") panelesInformacion.push(p); 
        });
        debug.log(1,"Cargando configuracion del agente. MODO DEBUG : " + global.param.debugmode );
        callback (null);
    };

/*----------------------------------------------------
// FUNCTION - initialize the agente
* Calls the first timeout of each function required
* Sets a running interval on the consult information request
//---------------------------------------------------*/

    _that.iniciaAgente = function (){
        //consultaInformacion();
        enviaIncidencias ();
        setTimeout(enviaServiciosDia,7000);  
        setInterval(function(){consultaInformacion();},global.param.refrescoE);

        panelesMarquesina.forEach(function (p) {
            setTimeout(enviaServiciosParada,7000,p);
        });

        debug.log(1,"Agente inciado");
    };


/*----------------------------------------------------
// FUNCTION - Consult Information
* Consults the current status of each panel and triggers the POST to API request
//---------------------------------------------------*/

    function consultaInformacion(){
        panelesSistema.forEach (function (item){
        	postEstadoAPI(item); 
        });
    }

/*----------------------------------------------------
// FUNCTION - Envia Incidencias
//---------------------------------------------------*/

    function enviaIncidencias(callback) {
        var incidenciasJSON;
        var apiCallStartTime = new Date().getTime();
        getRecurso(recursoIncidencias, function(err,res){
            var apiCallEndTime = new Date().getTime();
            if (typeof  err != 'undefined' && err !== null) {
                global.param.refrescoI = global.param.refrescoI - (apiCallEndTime - apiCallStartTime);
                global.param.failedApiCallsIncidencias = global.param.failedApiCallsIncidencias + 1;
                if (global.param.failedApiCallsIncidencias >= global.param.numeroIntentosSinRecibirDatos) {
                    panelesSistema.forEach(function (p) {
	                    p.flagFailedApiIncidencias = 1;
	                });
                }
                debug.log(global.param.debugmode,'Error consulting indcidencias.do resource : ' + err.message);
            } else {
                
                global.param.failedApiCallsIncidencias = 0;
                panelesSistema.forEach(function (p) {
                    p.flagFailedApiIncidencias = 0;
                });
                incidenciasJSON = res;
                if (typeof incidenciasJSON == 'object'){
                    global.param.refrescoI=incidenciasJSON.refresco * 1000 - (apiCallEndTime - apiCallStartTime);
                    if (incidenciasJSON.serie != global.param.serieI) {
                        global.param.serieI=incidenciasJSON.serie;
                        panelesSistema.forEach(function (item) {
                            item.incidencia = '';
                        });

                        if (incidenciasJSON.total != 0){
                            incidenciasJSON.informacion.forEach(function (incidencia) {
                                var texto = incidencia.texto;
                                incidencia.paneles.forEach(function (elem) {
                                    panelesSistema.filter(function (value, ind) {
                                        if(value.id == this.id) {
                                            panelesSistema[ind].incidencia =texto;
                                            panelesSistema[ind].tipo = elem.tipo.toUpperCase();
                                        }
                                    }, {id: elem.id});
                                });
                            });
                        }
                    }
                }
                else {
                    global.param.refrescoI = global.param.refrescoI - (apiCallEndTime - apiCallStartTime);
                }
            }
            setTimeout(enviaIncidencias,global.param.refrescoI);
        });
    }

/*----------------------------------------------------
// FUNCTION - Envia servicios dia (Informacion)
//---------------------------------------------------*/


    function enviaServiciosDia() {

        var listaServiciosJSON;
        var apiCallStartTime = new Date().getTime();
        getRecurso(recursoServicios,function(err,res){
            var apiCallEndTime = new Date().getTime();
            if (typeof  err != 'undefined' && err !== null) {
                global.param.refrescoS=global.param.refrescoS - (apiCallEndTime - apiCallStartTime);
                global.param.failedApiCallsServiciosDia = global.param.failedApiCallsServiciosDia + 1;
                if (global.param.failedApiCallsServiciosDia >= global.param.numeroIntentosSinRecibirDatos) {
                    panelesInformacion.forEach(function (p) {
                        p.flagFailedApiServices = 1;
                    });
                }
                debug.log(global.param.debugmode,'Error obtaining servicios-dia.do resource : ' + err.message);
            } else {
                global.param.failedApiCallsServiciosDia = 0;
                panelesInformacion.forEach(function (p) {
                    p.flagFailedApiServices = 0;
                });
                listaServiciosJSON=res;
                global.param.refrescoS=listaServiciosJSON.refresco * 1000 - (apiCallEndTime - apiCallStartTime);

                
                if ((listaServiciosJSON.serie !== global.param.serieS)) {
                    panelesInformacion.forEach(function (el) {
                        el.rawServices = [];
                    });
                    global.param.serieS = listaServiciosJSON.serie;
                    if (listaServiciosJSON.total !==0){
                        listaServiciosJSON.informacion.forEach (function(serv){
                            serv.paneles.forEach (function (elem){
                                panelesInformacion.filter(function(panel,ind){
                                    if (panel.id == elem.id){
                                        if (elem.tipo === "Salida" || elem.tipo === "Paso" || elem.tipo === "Mixto") {
                                            if (serv.estado === "Normal" || serv.estado === "Cancelado" || serv.estado === "Retrasado") {
                                                panel.rawServices.push(serv);
                                            }
                                        }
                                    }
                                });
                            });
                        });
                    }
                } 
            }
            setTimeout(enviaServiciosDia,global.param.refrescoS); 
        });
    }


/*----------------------------------------------------
// FUNCTION - Envia Servicios Parada (Marqeusina)
//---------------------------------------------------*/


    function enviaServiciosParada(p) {
        var listaServiciosJSON;
        var apiCallStartTime = new Date().getTime();
        var recursoThisParada = {
            hostname: settingJSON.serviciosParada.host,
            port: settingJSON.serviciosParada.puerto,
            path:  settingJSON.serviciosParada.ruta.replace('{id}',p.idParada).replace('{numero}',p.servicesLines + 1),
            method: settingJSON.serviciosParada.metodo,
        }
        getRecurso(recursoThisParada,function(err,res){
            var apiCallEndTime = new Date().getTime();
            if (typeof  err != 'undefined' && err !== null) {
                p.refrescoP = p.refrescoP - (apiCallEndTime - apiCallStartTime);
                p.failedApiCallsServiciosParada = p.failedApiCallsServiciosParada + 1;
                if (p.failedApiCallsServiciosParada >= global.param.numeroIntentosSinRecibirDatos) {
                    p.flagFailedApiServices = 1;
                }
                debug.log(global.param.debugmode,'Error obtaining servicios-parada.do resoruce for panel '+p.id+' : ' + err.message);
            } else {
                
                p.failedApiCallsServiciosParada = 0;
                p.flagFailedApiServices = 0;
                listaServiciosJSON=res;
                p.refrescoP=listaServiciosJSON.refresco * 1000 - (apiCallEndTime - apiCallStartTime);
                
                if ((listaServiciosJSON.serie !== p.serieP)) {
                    p.rawServices = [];
                    p.listaServiciosJSONPanel = listaServiciosJSON.serie;
                    // Update for servicios parade 0 to flag off, and bug when informacion is missing 
                    if (listaServiciosJSON.total === 0) p.autoTriggerTurnOff();
                    if (listaServiciosJSON.total !==0 && listaServiciosJSON.informacion){
                        if (listaServiciosJSON.informacion && (typeof(listaServiciosJSON.informacion) === 'array' || typeof(listaServiciosJSON.informacion) === 'object')) {
                            listaServiciosJSON.informacion.forEach (function(serv,i){
                                if (serv.estado === "Normal" || serv.estado === "Retrasado") {
                                    p.rawServices.push(serv);
                                }
                            });
                        }
                    }
                } 
            }
            setTimeout(enviaServiciosParada,p.refrescoP,p);
        });
    }

/*----------------------------------------------------
// FUNCTION - Api GET request
//---------------------------------------------------*/


    function getRecurso(recurso,done) {
        var respuesta="";
        try {
            var req = http.request(recurso, function(res) {
                res.setEncoding('utf8');
                res.on('data', function (trozo) {
                    if (trozo !== 'undefined')
                        respuesta += trozo;
                });
                res.on('error',function(e){
                    done(e,null);
                })
                res.on ('end', function(){
                    if (res.statusCode == 200) {
                        done(null,JSON.parse(respuesta));
                    }  else {
                        done ("Error al obtener el recurso:" + res.statusCode);
                    }

                })
            });

            req.on('error', function(e) {
                done(e,null);
            });

            req.on ('end',function(){
                done(null,JSON.parse(respuesta));

            });

            req.end();

        } catch  (e)  {
            done(e,null);
        }

    }

/*----------------------------------------------------
// FUNCTION - Api POST request
//---------------------------------------------------*/

    function postEstadoAPI(item){
    	var result = item.estado;
    	var estadoString=  JSON.stringify(result);
        var POSTParamsString = "?id="+item.id+"&estado="+result.estado+"&texto="+result.texto;
        var recursoPOST = {
            hostname: settingJSON.estados.host,
            port: settingJSON.estados.puerto,
            path:  settingJSON.estados.ruta + POSTParamsString,
            method: settingJSON.estados.metodo,
        }

        var req = http.request(recursoEstados, function(res) {
            res.setEncoding('utf8');
            var responseString = '';

            res.on('data', function(data) {
                responseString += data;
            });

            res.on('end', function() {
                var resultObject = JSON.parse(responseString);
                if (!resultObject.success){
                    debug.log(global.param.debugmode,"Error updating status for  " + item.ip + " Response API: \"" + (resultObject.data) + "\"");
                }else {
                    debug.log (global.param.debugmode,"Status updated for " + item.ip + " Response API: \"" + (resultObject.data) + "\"");
                }
            });
        });

        req.on('error', function(e) {
            debug.log(global.param.debugmode,"Error sending status to the API for panel " + item.ip );
        });
        req.write(estadoString);
        req.end();
    }
};


module.exports = agentePaneles;

