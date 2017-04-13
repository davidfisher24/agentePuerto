'use strict';

//---------------------------------------
// Dependecines
//---------------------------------------

var agente = require('./js/clases');
var debug = require('../agente/js/utils');
var http = require('http');
var Fabricante=require('../agente/js/clases/fabricante.js'); // Testing

//----------------------------------------------------
// Global variables 
//----------------------------------------------------

global.param={
    debugmode: 0,               // Mode debug on or off
    serieS : -1,            // Series value in change of services
    serieI : -1,            // Series value in change of incidents
    refrescoS : 65*1000,         // Refresh time of services (seconds)
    refrescoI : 65*1000,         // Refresh time of incidents (seconds)
    refrescoE : 60*1000,        // Refresh time of status of panels
    numReintentos : 1,     // Number of reconnection attempts to the panels
    tiempoReintentos : 1,  // Time between reconnection attempts to the panels (seconds)
    tiempoEspera : 30,     // Timeout for connection to the panels (seconds)
    textos :""
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
    var panelesSistema =[];  // Array of the panels in the system (used for sending incidents)
    var panelesServiciosParada = []; // Array of objects that holds the panels that call to servicios parada
    var panelesServiciosDia = []; // Array of objects that call to servicios de dia 

//----------------------------------------------------
// Function - initial load of the configuration
//----------------------------------------------------


    _that.cargaInicial =function (callback){
        settingJSON = require('../api/files/config.json'); // JSON configuration of the applications
        panelesGlobal = settingJSON.paneles;
        parametros = settingJSON.parametros;
        global.param.debugmode = parametros.debugmode;
        global.param.refrescoE= parametros.tiempoRefresco * 1000;
        global.param.numReintentos =parametros.numeroReintentos;
        global.param.tiempoReintentos = parametros.tiempoEntreReintento * 1000;
        global.param.tiempoEspera = parametros.tiempoEspera * 1000;
        global.param.textos=settingJSON.textos;
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

        // Panels array
        // paneleSistema - all the panels. Makes calls to incidents and status
        // panelesServiciosDia - Marquesina panels that call to servicios-dia.do
        // panelesServiciosParada - Information panels that call to servicios-parada.do
        panelesGlobal.forEach(function(elem){
            var p = new  agente.Panel(elem);
            panelesSistema.push (p);
            if (p.type === "INFORMACION") panelesServiciosDia.push(p);
            if (p.type === "INFORMACION") panelesServiciosParada.push(p);
        });
        debug.log(1,"Cargando configuracion del agente. MODO DEBUG : " + global.param.debugmode );
        callback (null);
    };

//----------------------------------------------------
// Function - initialize the agent
//----------------------------------------------------

    _that.iniciaAgente = function (){
        enviaIncidencias ();
        setTimeout(enviaServicios(),7000);
        setInterval(function(){enviaIncidencias ();}, global.param.refrescoI);
        setInterval(function(){enviaServicios();}, global.param.refrescoS);
        //setInterval(function(){consultaInformacion();},global.param.refrescoE);

        panelesServiciosParada.forEach(function (p) {
            setTimeout(enviaServiciosParada(p),7000);
            setInterval(function(){enviaServiciosParada(p);}, p.refrescoP);
        });

        debug.log(1,"Agente inciado");
    };

//----------------------------------------------------
// Function - Consult  the status of the panels and post to the API - Not yet working
//----------------------------------------------------

    /*function consultaInformacion(){
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
    }*/

//----------------------------------------------------
// Function - send incidents to the panel
// We get the state of indicents from the API
// If there are changes to the information, we process the information at that point
// Control of incidents is held in the property "series"
//----------------------------------------------------


    function enviaIncidencias(callback) {
        var incidenciasJSON;
        getRecurso(recursoIncidencias, function(err,res){
            if (typeof  err != 'undefined' && err !== null) {
                debug.log(global.param.debugmode,'Error obtaining incidents: ' + err.message);
            } else {
                incidenciasJSON = res;
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
                                            console.log("incidencia: " + texto + " tipo: " + elem.tipo + " panel: " + value.id);
                                            panelesSistema[ind].flag=0;
                                            panelesSistema[ind].incidencia =texto;
                                            panelesSistema[ind].tipo = elem.tipo.toUpperCase();
                                        }
                                    }, {id: elem.id});
                                });
                            });

                            /*panelesSistema.forEach(function (item) {
                                item.enviaIncidencia(function (err, result) {
                                    if (err) {
                                        debug.log(global.param.debugmode, "Error sending incidents to panel " + item.ip + " - " + err.message);
                                    }
                                });
                            });*/
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
// Function - send services to the panels (from the servicios-do complete resources)
//-----------------------------------------------------------------------------------

    function enviaServicios() {
        var listaServiciosJSON;
        var cambioEstado = 0;
        getRecurso(recursoServicios,function(err,res){
            if (typeof  err != 'undefined' && err !== null) {
                debug.log(global.param.debugmode,'Error obtaining services information : ' + err.message);
            } else {
                listaServiciosJSON=res;
                global.param.refrescoS=listaServiciosJSON.refresco * 1000;

                panelesServiciosDia.forEach(function (el) {
                    if (el.flag ==1) cambioEstado =1;
                });

                if ((listaServiciosJSON.serie !== global.param.serieS) || (cambioEstado == 1)) {
                    global.param.serieS = listaServiciosJSON.serie;
                    if (listaServiciosJSON.total !==0){
                        panelesServiciosDia.forEach(function (p) {
                            p.listaServicios= [];
                            p.servicios='';
                            p.flag =0;
                        });

                        listaServiciosJSON.informacion.forEach (function(serv){
                            serv.paneles.forEach (function (elem){
                                panelesServiciosDia.filter(function(panel,ind){
                                    var servicio = new agente.Servicio(serv);
                                    if (panel.id == elem.id && panel.listaServicios.length < panel.lineas) {
                                        if (serv.estado === "En curso") {
                                            panel.listaServicios.push(servicio.getLineaFromServices());
                                        }
                                        if (serv.estado === "Normal") {
                                            panel.listaServicios.push(servicio.getLineaFromServices());
                                        }
                                    }
                                });
                            });
                        });

                        panelesServiciosDia.forEach(function (p) {
                           p.calculaEstadoServicios();
                           //console.log(p.servicios); 
                           
                            /*p.enviaServicios(function(err,res){
                                if (err) {
                                    debug.log(global.param.debugmode, "Error enviando servicios al panel " + p.ip + " - " + err.message);
                                }
                            });*/ 
                        });
                    }
                } 
            }
        });
    }


//----------------------------------------------------------------------------
// Function - send services to the panels (from the servicios-parada resource)
//----------------------------------------------------------------------------
//Paneles marquesina:
// Mostrarán los próximos x servicios tomados de "servicios-parada.do", con el campo "nombre" como destino de la línea.

    function enviaServiciosParada(p) {
        var listaServiciosJSON;
        var cambioEstado = 0;
        var recursoThisParada = {
            hostname: settingJSON.serviciosParada.host,
            port: settingJSON.serviciosParada.puerto,
            path:  settingJSON.serviciosParada.ruta.replace('{id}',p.idpanel).replace('{numero}',p.lineas),
            method: settingJSON.serviciosParada.metodo,
        }
        getRecurso(recursoThisParada,function(err,res){
            if (typeof  err != 'undefined' && err !== null) {
                debug.log(global.param.debugmode,'Error obtaining services parada : ' + err.message);
            } else {
                listaServiciosJSON=res;
                p.refrescoP=listaServiciosJSON.refresco * 1000;
                if (p.flag ==1) cambioEstado =1;
                if ((listaServiciosJSON.serie !==p.serieP) || (cambioEstado == 1)) {
                    p.listaServiciosJSONPanel = listaServiciosJSON.serie;
                    if (listaServiciosJSON.total !==0){
                        p.listaServicios= [];
                        p.servicios='';
                        p.flag =0;
                        listaServiciosJSON.informacion.forEach (function(serv,i){
                            var servicio = new agente.Servicio(serv);
                            if (serv.estado === "Normal") {
                                p.listaServicios.push(servicio.getLineaFromStop());
                            }  
                            
                        });
                        p.calculaEstadoParada();
                        //console.log(p.servicios); 
                        // At this point p.servicios is an array of objects of services for sending
                        // THIS IS A TEST BEFORE SENDING
                        /*var servicesTest = p.servicios.split('#');
                            servicesTest.forEach(function (s) {
                            var consulta = new Fabricante(p.ip);
                            consulta.sendFixedTextMessage(s);
                        });*/


                        /*p.enviaServicios(function(err,res){
                            if (err) {
                                debug.log(global.param.debugmode, "Error enviando servicios al panel " + p.ip + " - " + err.message);
                            }
                        });*/

                    }
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
            // TODO: handle error.
            debug.log(global.param.debugmode,"Error en el envio de estado al API para el panel " + item.ip );
        });
        req.write(estadoString);
        req.end();
    }
};


module.exports = agentePaneles;

