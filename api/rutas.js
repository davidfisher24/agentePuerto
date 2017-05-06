/**
 * Created by Lola on 16/10/2014.
 */

/*-----------------------------------------
Modulos Externos Requeridos
 -----------------------------------------*/
var fs = require('fs');
var path =require('path');
var util= require('util');
var JsonDB = require('node-json-db');

/*-----------------------------------------
Fichero JSON
 -----------------------------------------*/
//var settingJSON= require ('../agente/api/config.json');
//var rutaDatos='./agente/api/config.json';
var dbConfig = new JsonDB('./agente/api/config.json', true, false);
var dbPanels = new JsonDB('./agente/api/panels.json', true, false);
var generalConfig = dbConfig.getData("/parametros");
var panelTypesConfig = dbConfig.getData("/panelTypes");
var textosConfig = dbConfig.getData("/textos");
var panelsConfig = dbPanels.getData("/");


/* =============================================================
 Read and Store the JSON file (in DATA)
 ===============================================================*/


module.exports = {

    index: function(req,res){
        console.log("Going to the index");
      res.render("index");
    },

    getConfig: function (req,res){
        console.log("lokking for config");
        res.type('application/json');
        console.log(config);
        res.send (config);  
    },

    getPaneles: function(req,res){
        console.log("Going to the panels");
        res.type('application/json');
        res.send (panels);
    },

    // General config - We get the main json options
    getGeneral: function(req,res){
        res.type('application/json');
        res.send (generalConfig);  
    },

    getRecursos: function(req,res){
        res.type('application/json');
        var obj = [config.servicios, config.incidencias, config.estados ];
        console.log(obj);
        res.send(obj);
    },

    getPanelPorId : function(req,res){
        var idpanel=req.params.id;
        var paneles= config.paneles;
        res.type('application/json');
        var r = panels.filter(function (value) {
            return (value.id == this.id);
        }, {id: idpanel});
        (r.length==0) ? res.send({}) : res.send(r[0]);
    },

    addPanel : function(req,res){
        var panel=req.body;
        util.log('Añadiendo Panel:' + JSON.stringify(panel));

    },

    updatePanel : function(req,res){
        var id = req.params.id;
        var panel = req.body;
        util.log('Modificando panel: ' + id);
        util.log(JSON.stringify(panel));

    },

    deletePanel : function(req,res){
        var id = req.params.id;
        console.log('Borrando panel: ' + id);

    }

}
