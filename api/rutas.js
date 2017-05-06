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

    // Index page
    index: function(req,res){
        res.render("index");
    },

    getConfig: function (req,res){
        res.type('application/json');
        res.send (config);  
    },

    

    // Paneles config - We get the array of panels in the panel config file
    getPaneles: function(req,res){
        res.type('application/json');
        res.send (panelsConfig.paneles);
    },

    // General config - We get the main json options
    getGeneral: function(req,res){
        res.type('application/json');
        res.send (generalConfig);  
    },

    // Textos config - we get the textos from the main json
    getTextos: function (req,res){
        res.type('application/json');
        res.send (textosConfig);  
    },

    // Recursos - A text list of recursos. We make an array of the recursos.
    getRecursos: function(req,res){
        res.type('application/json');
        console.log(generalConfig);
        var obj = [
            dbConfig.getData("/servicios"), 
            dbConfig.getData("/serviciosParada"), 
            dbConfig.getData("/incidencias"), 
            dbConfig.getData("/estados")
        ];
        res.send(obj);
    },

    // Individual config - We get a panel by id
    getPanelPorId : function(req,res){
        var idpanel=req.params.id;
        var panels= panelsConfig.paneles;
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
