/**
 * Created by Lola on 16/10/2014.
 */

/*-----------------------------------------
Modulos Externos Requeridos
 -----------------------------------------*/
var fs = require('fs');
var path =require('path');
var util= require('util');

/*-----------------------------------------
Fichero JSON
 -----------------------------------------*/
var settingJSON= require ('./files/config.json');
var rutaDatos='./api/files/config.json';

/* =============================================================
 Read and Store the JSON file (in DATA)
 ===============================================================*/
var FICHERO_CONFIG = fs.readFileSync(rutaDatos);     //happens at server startup

module.exports = {

    index: function(req,res){
      res.render("index");
    },

    getConfig: function (req,res){
        res.type('application/json');
         res.send (settingJSON);  // tambien se puede utilizar res.send
    },

    getPaneles: function(req,res){
        res.type('application/json');
        res.send (settingJSON.paneles);
    },

    getGeneral: function(req,res){
        res.type('application/json');
        var obj={ "agente" :  + settingJSON.agente,
                   "parametros" : settingJSON.parametros
        };
        res.send(obj);
    },
    getRecursos: function(req,res){
        res.type('application/json');
        var obj = [settingJSON.servicios, settingJSON.incidencias, settingJSON.estados ];
        res.send(obj);
    },

    getPanelPorId : function(req,res){
        var idpanel=req.params.id;
        var paneles= settingJSON.paneles;
        res.type('application/json');
        var r = paneles.filter(function (value) {
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
