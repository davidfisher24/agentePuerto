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
    debugmode: 0, // Debug mode yes or no
    serieS : -1,  // Current series for servicios-dia.do. Used for flagging changes 
    serieI : -1,  // Current series for incidencias.do. Used for flagging changes
    refrescoS : 65*1000,  // Default refresh value for servicios-dia.do (Changed by API)
    refrescoP : 65*1000,  // Default refresh value for servicios-parada.do (Changed by API)
    refrescoI : 65*1000,  // Default refresh value for servicios-incidencias.do (Changed by API)   
    refrescoE : 60*1000,     
    numReintentos : 1,  // Default number of retrys to API connect 
    tiempoReintentos : 1,  // Defaukt time between retrys to API connect
    tiempoEspera : 30,  // Default waiting time for a server response
    textos :"",  // Texts used or the panels (JSON config)
    tiempoDeInmediataz: 1,  // Default "arriving now" flag time
    simboloDeInmediataz: ">>" // Default "arriving now" symbol
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
        settingJSON = require('../api/files/config.json'); 
        panelesGlobal = settingJSON.paneles;
        parametros = settingJSON.parametros;
        global.param.debugmode = parametros.debugmode;
        global.param.refrescoE= parametros.tiempoRefresco * 1000;
        global.param.numReintentos =parametros.numeroReintentos;
        global.param.tiempoReintentos = parametros.tiempoEntreReintento * 1000;
        global.param.tiempoEspera = parametros.tiempoEspera * 1000;
        global.param.textos=settingJSON.textos;
        global.param.panelTypes=settingJSON.panelTypes;
        global.param.tiempoDeInmediataz = parametros.tiempoDeInmediataz;
        global.param.simboloDeInmediataz = parametros.simboloDeInmediataz;
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
        setTimeout(enviaServiciosDia(),7000);  
        setInterval(function(){enviaIncidencias ();}, global.param.refrescoI);
        setInterval(function(){enviaServiciosDia();}, global.param.refrescoS);
        setInterval(function(){consultaInformacion();},global.param.refrescoE);

        panelesMarquesina.forEach(function (p) {
            setTimeout(enviaServiciosParada(p),7000);
            setInterval(function(){enviaServiciosParada(p);}, p.refrescoP);
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
                    debug.log(global.param.debugmode,'ERROR CONSULTA ESTADO: ' + err.message);
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
        var flagPanelsOn = false;
        panelesSistema.forEach(function(p){
            p.checkTurnOff();
            if (p.onOffStatus === 1) flagPanelsOn = true;
        });

        if (!flagPanelsOn) {
            return;
        }

        var incidenciasJSON;
        getRecurso(recursoIncidencias, function(err,res){
            if (typeof  err != 'undefined' && err !== null) {
                debug.log(global.param.debugmode,'Error obtaining incidents: ' + err.message);
            } else {
                incidenciasJSON = res;
                
                // Testing incidences
                //incidenciasJSON = JSON.parse('{"informacion":[{"criticidad":0,"paneles":[{"id":14,"tipo":"Salida"}],"texto":"#A very very very very long and extremeley difficult problem#problem2"}],"refresco":30,"serie":0,"total":1}');

                if (typeof incidenciasJSON == 'object'){
                    global.param.refrescoI=incidenciasJSON.refresco *1000;
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


                            panelesSistema.forEach(function (item) {
                                if (item.onOffStatus === 1) {
                                    item.calculateIncidenciaInSegments();
                                    item.enviaIncidencia(function (err, result) {
                                        if (err) {
                                            debug.log(global.param.debugmode, "Error sending incidents to panel " + item.ip + " - " + err.message);
                                        }
                                    });
                                }
                            });
                        }
                    }
                }
                else {
                    debug.log(global.param.debugmode,'Error in the resource of incidents');
                }
            }
        });
    }

//-----------------------------------------------------------------------------------
// Send services function 1 - SERVICIOS-DIA.DO resource // sent to INFORMACION PANELES
// Gets the whole resouces in one chunk and pushes it to the list of services for that panel
// Point 1 - Filtering on services paso, mixto, and salida. Ignoring llegada
// Point 2 - Filtering on normal and en curso. Ignoring Finalizado
//-----------------------------------------------------------------------------------

    function enviaServiciosDia() {
        var flagPanelsOn = false;
        panelesInformacion.forEach(function(p){
            p.checkTurnOff();
            if (p.onOffStatus === 1) flagPanelsOn = true;
        });

        if (!flagPanelsOn) {
            return;
        }

        var listaServiciosJSON;
        var cambioEstado = 0;
        getRecurso(recursoServicios,function(err,res){
            if (typeof  err != 'undefined' && err !== null) {
                debug.log(global.param.debugmode,'Error obtaining services information : ' + err.message);
            } else {
                listaServiciosJSON=res;
                global.param.refrescoS=listaServiciosJSON.refresco * 1000;

                panelesInformacion.forEach(function (el) {
                    if (el.flag ==1) cambioEstado =1;
                });

                if ((listaServiciosJSON.serie !== global.param.serieS) || (cambioEstado == 1)) {
                    global.param.serieS = listaServiciosJSON.serie;
                    if (listaServiciosJSON.total !==0){
                        panelesInformacion.forEach(function (p) {
                            p.listaServicios= [];
                            p.servicios='';
                            p.flag =0;
                        });

                        listaServiciosJSON.informacion.forEach (function(serv){
                            serv.paneles.forEach (function (elem){
                                panelesInformacion.filter(function(panel,ind){
                                    var servicio = new agente.Servicio(serv);
                                    if (panel.id == elem.id && elem.tipo === "Salida" || elem.tipo === "Paso" || elem.tipo === "Mixto") {
                                        if (serv.estado === "Normal" || serv.estado === "En curso" || serv.estado === "Cancelado" || serv.estado === "Retrasado") {
                                            panel.listaServicios.push(servicio.getLineaFromServiciosDiaResource());
                                        }
                                    }
                                });
                            });
                        });

                        panelesInformacion.forEach(function (p) {
                            if (p.onOffStatus === 1) {
                                p.calculateServicesInSegments();
                                p.enviaServicios(function(err,res){
                                    if (err) {
                                        debug.log(global.param.debugmode, "Error enviando servicios al panel " + p.ip + " - " + err.message);
                                    }
                                });
                            }
                        });
                    }
                } 
            }
        });
    }


//-----------------------------------------------------------------------------------
// Send services function 2 - SERVICIOS-PARADA.DO resource // sent to MARQUESINA PANELES
// Gets the resource for each panel in the panels Marquesina array
// Sends them individually to each panel
// Filtering on "normal" services only
//-----------------------------------------------------------------------------------

    function enviaServiciosParada(p) {
        p.checkTurnOff();
        if (p.onOffStatus === 0) return;

        var listaServiciosJSON;
        var cambioEstado = 0;
        var recursoThisParada = {
            hostname: settingJSON.serviciosParada.host,
            port: settingJSON.serviciosParada.puerto,
            path:  settingJSON.serviciosParada.ruta.replace('{id}',p.idpanel).replace('{numero}',p.lineas),
            method: settingJSON.serviciosParada.metodo,
        }
        getRecurso(recursoThisParada,function(err,res){
            console.log(res);
            if (typeof  err != 'undefined' && err !== null) {
                debug.log(global.param.debugmode,'Error obtaining services parada : ' + err.message);
            } else {
                listaServiciosJSON=res;
                p.refrescoP=listaServiciosJSON.refresco * 1000;
                if (p.flag ==1) cambioEstado =1;
                if ((listaServiciosJSON.serie !==p.serieP) || (cambioEstado == 1)) {
                    p.listaServiciosJSONPanel = listaServiciosJSON.serie;
                    p.listaServicios= [];
                    p.servicios='';
                    p.flag =0;
                    listaServiciosJSON.informacion.forEach (function(serv,i){
                        var servicio = new agente.Servicio(serv);
                        if (serv.estado === "Normal" || serv.estado === "Retrasado") {
                            p.listaServicios.push(servicio.getLineaFromServiciosParadaResource());
                        }  
                        
                    });
                    p.calculateServicesInSegments();
                    p.enviaServicios(function(err,res){
                        if (err) {
                            debug.log(global.param.debugmode, "Error enviando servicios al panel " + p.ip + " - " + err.message);
                        }
                    });
                } 
            }
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
        var POSTParamsString = "?id="+item.idpanel+"&estado="+result.estado+"&texto="+result.texto;

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
                    debug.log(global.param.debugmode,"Error actualizando estado para  " + item.ip + " Respuesta API: \"" + (resultObject.data) + "\"");
                }else {
                    debug.log (global.param.debugmode,"Estado actualizado para " + item.ip + " Respuesta API: \"" + (resultObject.data) + "\"");
                }
            });
        });

        req.on('error', function(e) {
            debug.log(global.param.debugmode,"Error en el envio de estado al API para el panel " + item.ip );
        });
        req.write(estadoString);
        req.end();
    }
};


module.exports = agentePaneles;

