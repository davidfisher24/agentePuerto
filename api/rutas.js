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
        var obj = [
            dbConfig.getData("/servicios"), 
            dbConfig.getData("/serviciosParada"), 
            dbConfig.getData("/incidencias"), 
            dbConfig.getData("/estados")
        ];
        res.send(obj);
    },

    // Panel Types - A text list of the types of panels
    getPanelesTipos: function(req,res){
        res.type('application/json');
        var obj = [
            panelTypesConfig.MARQUESINA, 
            panelTypesConfig.INFORMACION, 
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

    /// ROUTES FOR DB UPDATES

    // Update a panel currently in the databae or adds a new panel
    updatePanel : function(req,res){
        var id = req.params.id;
        var panel = req.body;
        util.log('Modificando panel: ' + id);
        util.log(JSON.stringify(panel));

        var thesePanels = dbPanels.getData("/paneles"); // Full array
        var thisPanelIndex = null; // Index of the panel we need
        var thisPanel = thesePanels.filter(function(p,i){
            if (p.id == id) thisPanelIndex = i; // Index of the panel when we find it
            return p.id == id; // Get the full panel
        });
        if (thisPanel.length === 0) {
            dbPanels.push("/paneles[]",panel);
        } else {
            // Delete the old panel and add a new one
            dbPanels.delete("/paneles["+thisPanelIndex+"]");
            dbPanels.push("/paneles[]",panel);
        }  
    },

    // Update the textos window
    updateTextos:function(req,res){
        console.log("Preparing to update textos");
        var textos = req.body;
        util.log('Modificando textos');
        util.log(JSON.stringify(textos));
        console.log(textos);
    },

    updateConfig:function(req,res){
        console.log("Preparing to update config");
        var config = req.body;
        util.log('Modificando config');
        util.log(JSON.stringify(config));
        console.log(config);
    },

    // Delete a pannel currently in the database
    deletePanel : function(req,res){
        console.log("in the delete function");
        var id = req.params.id;
        console.log('Borrando panel: ' + id);

    }

}
