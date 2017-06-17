 'use strict';

//---------------------------------------
// Dependecines
//---------------------------------------

var agente = require('./js/clases');
var debug = require('../agente/js/utils');
var http = require('http');
var Fabricante=require('../agente/js/clases/fabricante.js'); 

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

//----------------------------------------------------
// Function - initial load of the configuration
//----------------------------------------------------

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

        // Panels array formation 
        panelesGlobal.forEach(function(elem){
            var p = new  agente.Panel(elem);  // Create new panel
            panelesSistema.push (p); // All panels go to panelessistema
            if (p.type === "MARQUESINA") panelesMarquesina.push(p);  // Marquesina panels
            if (p.type === "INFORMACION") panelesInformacion.push(p); // Information panels
        });
        debug.log(1,"Cargando configuracion del agente. MODO DEBUG : " + global.param.debugmode );
        callback (null);
    };

//----------------------------------------------------
// Function - initialize the agent
//----------------------------------------------------

    _that.iniciaAgente = function (){
        consultaInformacion();
        enviaIncidencias ();
        setTimeout(enviaServiciosDia,7000);  
        setInterval(function(){consultaInformacion();},global.param.refrescoE);

        panelesMarquesina.forEach(function (p) {
            setTimeout(enviaServiciosParada,7000,p);
        });

        debug.log(1,"Agente inciado");
    };


//----------------------------------------------------
// Function - Consult the status of the panels and post to the API - Not yet the post
//----------------------------------------------------

    function consultaInformacion(){
        panelesSistema.forEach (function (item,i){
            item.consultaEstado(function (err,result){
                if (typeof  err != 'undefined' && err!= null){
                    debug.log(global.param.debugmode,'Error conuslting estado.do resource : ' + err.message);
                } else {
                    panelesSistema[i].estado=result;
                    _that.io.emit('consultaestado',item.estado);
                    postEstadoAPI(result,item); 
                }
            });
        });
    }

//----------------------------------------------------
// Function - send incidents to the panel
// We get the state of indicents from the API
// If there are changes to the information, we process the information at that point
// Control of incidents is held in the property "series"
//----------------------------------------------------


    function enviaIncidencias(callback) {
        /*panelesSistema.forEach(function(p){
            p.checkTurnOff();
        });*/
        var incidenciasJSON;
        var apiCallStartTime = new Date().getTime();
        getRecurso(recursoIncidencias, function(err,res){
            var apiCallEndTime = new Date().getTime();
            if (typeof  err != 'undefined' && err !== null) {
                global.param.refrescoI = global.param.refrescoI - (apiCallEndTime - apiCallStartTime);
                global.param.failedApiCallsIncidencias = global.param.failedApiCallsIncidencias + 1;
                if (global.param.failedApiCallsIncidencias >= global.param.numeroIntentosSinRecibirDatos) {
                    panelesSistema.forEach(function (item) {
                        item.incidencia = '';
                    });
                }
                debug.log(global.param.debugmode,'Error consulting indcidencias.do resource : ' + err.message);
            } else {
                global.param.failedApiCallsIncidencias = 0;
                incidenciasJSON = res;
                if (typeof incidenciasJSON == 'object'){
                    global.param.refrescoI=incidenciasJSON.refresco * 1000 - (apiCallEndTime - apiCallStartTime);
                    if (incidenciasJSON.serie != global.param.serieI) {
                        global.param.serieI=incidenciasJSON.serie;

                        panelesSistema.forEach(function (item) {
                            if (item.incidencia != '') item.flag =1;
                            item.incidencia = '';
                        });

                        if (incidenciasJSON.total != 0){
                            incidenciasJSON.informacion.forEach(function (incidencia) {
                                var texto = incidencia.texto;
                                incidencia.paneles.forEach(function (elem) {
                                    panelesSistema.filter(function (value, ind) {
                                        if(value.id == this.id) {
                                            panelesSistema[ind].flag=0;
                                            panelesSistema[ind].incidencia =texto;
                                            panelesSistema[ind].tipo = elem.tipo.toUpperCase();
                                        }
                                    }, {id: elem.id});
                                });
                            });


                            /*panelesSistema.forEach(function (item) {
                                if (item.onOffStatus === 1) {
                                    item.calculateIncidenciaInSegments();
                                    item.enviaIncidencia(function (err, result) {
                                        if (err) {
                                            debug.log(global.param.debugmode, "Error sending incidents to panel " + item.ip + " - " + err.message);
                                        }
                                    });
                                }
                            });*/
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

//-----------------------------------------------------------------------------------
// Send services function 1 - SERVICIOS-DIA.DO resource // sent to INFORMACION PANELES
// Gets the whole resouces in one chunk and pushes it to the list of services for that panel
// Point 1 - Filtering on services paso, mixto, and salida. Ignoring llegada
// Point 2 - Filtering on normal and en curso. Ignoring Finalizado
//-----------------------------------------------------------------------------------

    function enviaServiciosDia() {
    	// Check the tunr off for each panel in the array
        /*panelesInformacion.forEach(function(p){
            p.checkTurnOff();
        });*/

        var listaServiciosJSON;
        var cambioEstado = 0;
        var apiCallStartTime = new Date().getTime();
        getRecurso(recursoServicios,function(err,res){
            var apiCallEndTime = new Date().getTime();
            if (typeof  err != 'undefined' && err !== null) {
                global.param.refrescoS=global.param.refrescoS - (apiCallEndTime - apiCallStartTime);
                global.param.failedApiCallsServiciosDia = global.param.failedApiCallsServiciosDia + 1;
                if (global.param.failedApiCallsServiciosDia >= global.param.numeroIntentosSinRecibirDatos) {
                    panelesInformacion.forEach(function (p) {
                        //p.listaServicios= [];
                        //p.servicios='';
                        p.rawServices = [];
                        p.flag =0;
                    });
                }
                debug.log(global.param.debugmode,'Error obtaining servicios-dia.do resource : ' + err.message);
            } else {
                listaServiciosJSON=res;
                global.param.refrescoS=listaServiciosJSON.refresco * 1000 - (apiCallEndTime - apiCallStartTime);

                panelesInformacion.forEach(function (el) {
                    if (el.flag ==1) cambioEstado =1;
                });

                if ((listaServiciosJSON.serie !== global.param.serieS) || (cambioEstado == 1)) {
                    global.param.serieS = listaServiciosJSON.serie;
                    if (listaServiciosJSON.total !==0){
                        panelesInformacion.forEach(function (p) {
                            //p.listaServicios= [];
                            //p.servicios='';
                            p.rawServices = [];
                            p.flag =0;
                        });

                        listaServiciosJSON.informacion.forEach (function(serv){
                            serv.paneles.forEach (function (elem){
                                panelesInformacion.filter(function(panel,ind){
                                    //var servicio = new agente.Servicio(serv);
                                    if (panel.id == elem.id){
                                        if (elem.tipo === "Salida" || elem.tipo === "Paso" || elem.tipo === "Mixto") {
                                            if (serv.estado === "Normal" || serv.estado === "Cancelado" || serv.estado === "Retrasado") {
                                                panel.rawServices.push(serv);
                                                //panel.listaServicios.push(servicio.getLineaFromServiciosDiaResource());
                                            }
                                        }
                                    }
                                });
                            });
                        });

                        

                        // Send results to each panel
                        /*panelesInformacion.forEach(function (p) {
                        	// If we are on, calculate the services
                            if (p.onOffStatus === 1) {
                                p.calculateServicesInSegments();
                            } else {
                            // If we are off send an empty message
                            	p.emptySegmentsForSendingTurnOffMessage();
                            }
                            p.enviaServicios(function(err,res){
                                if (err) {
                                    debug.log(global.param.debugmode, "Error sending services to panel " + p.ip + " - " + err.message);
                                }
                            });
                        });*/
                    }
                } 
            }
            setTimeout(enviaServiciosDia,global.param.refrescoS); 
        });
    }


//-----------------------------------------------------------------------------------
// Send services function 2 - SERVICIOS-PARADA.DO resource // sent to MARQUESINA PANELES
// Gets the resource for each panel in the panels Marquesina array
// Sends them individually to each panel
// Filtering on "normal" services only
//-----------------------------------------------------------------------------------

    function enviaServiciosParada(p) {
    	// Check turn off. If we are off, send an empty array and leave the function
        /*p.checkTurnOff();
        if (p.onOffStatus === 0) {
            p.emptySegmentsForSendingTurnOffMessage();
            p.refrescoP = 60 * 1000;
            p.enviaServicios(function(err,res){
                if (err) {
                    debug.log(global.param.debugmode, "Error sending services to panel " + p.ip + " - " + err.message);
                }
            });
            return;
        }*/
        var listaServiciosJSON;
        var cambioEstado = 0;
        var apiCallStartTime = new Date().getTime();
        var recursoThisParada = {
            hostname: settingJSON.serviciosParada.host,
            port: settingJSON.serviciosParada.puerto,
            path:  settingJSON.serviciosParada.ruta.replace('{id}',p.idParada).replace('{numero}',p.lineas),
            method: settingJSON.serviciosParada.metodo,
        }
        getRecurso(recursoThisParada,function(err,res){
            var apiCallEndTime = new Date().getTime();
            if (typeof  err != 'undefined' && err !== null) {
                p.refrescoP = p.refrescoP - (apiCallEndTime - apiCallStartTime);
                p.failedApiCallsServiciosParada = p.failedApiCallsServiciosParada + 1;
                if (p.failedApiCallsServiciosParada >= global.param.numeroIntentosSinRecibirDatos) {
                    //p.listaServicios= [];
                    //p.servicios='';
                    p.rawServices = [];
                    p.flag =0;
                }
                debug.log(global.param.debugmode,'Error obtaining servicios-parada.do resoruce for panel '+p.id+' : ' + err.message);
            } else {
                p.failedApiCallsServiciosParada = 0;
                listaServiciosJSON=res;
                p.refrescoP=listaServiciosJSON.refresco * 1000 - (apiCallEndTime - apiCallStartTime);
                
                if (p.flag ==1) cambioEstado =1;
                if ((listaServiciosJSON.serie !==p.serieP) || (cambioEstado == 1)) {
                    p.listaServiciosJSONPanel = listaServiciosJSON.serie;
                    //p.listaServicios= [];
                    //p.servicios='';
                    p.rawServices = [];
                    p.flag =0;
                    listaServiciosJSON.informacion.forEach (function(serv,i){
                        //var servicio = new agente.Servicio(serv);
                        if (serv.estado === "Normal" || serv.estado === "Retrasado") {
                            //p.listaServicios.push(servicio.getLineaFromServiciosParadaResource());
                            p.rawServices.push(serv);
                        }
                    });
                    
                    // Calculate services in segments and 
                    /*p.calculateServicesInSegments();
                    p.enviaServicios(function(err,res){
                        if (err) {
                            debug.log(global.param.debugmode, "Error sending services to panel - " + p.ip + " - " + err.message);
                        }
                    });*/
                } 
            }
            setTimeout(enviaServiciosParada,p.refrescoP,p);
        });
    }

//---------------------------------------------------------------
// Function - "get" request to the API to get current information
//---------------------------------------------------------------

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

//---------------------------------------------------------------
// Function - "post" request to the API to post status updates
//---------------------------------------------------------------

    function postEstadoAPI(result, item){
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

