/**
 * Created by David Fisher
 * Protocol comms agent between CTAL Almeria API and Scezcin Panels, and Backbone Express Web Config Applications.
 * File to launch the nodejs service
 */

'use strict';

var http =require('http');						// Http requests
var express = require('express');               // Express
var morgan  = require('morgan');                // Development log tool
var bodyParser = require('body-parser');        // Parsing information from http requests

var api = require('./api');						// Backbone web application
var ioSocket = require('socket.io');			// Sockets for communication with panels

//------------------------------------------------
// App start up, configuration, and routes
//------------------------------------------------

var app= express();	

app.use(express.static(__dirname + '/public')); // Static resources for backbone application
app.use (morgan('dev')); // Development logs tool
app.use(bodyParser.urlencoded({ extended: false }));  
app.use(bodyParser.json());  

app.set('title','Agente de paneles del CTAL Almeria');  // Title
app.set('puerto', process.env.PORT || 4000);  // Web port

//---------------------
// Backbone http routes
//---------------------

app.get('/', api.rutas.index);
app.get('/config', api.rutas.getConfig);
app.get('/general', api.rutas.getGeneral);
app.get('/recursos', api.rutas.getRecursos);
app.get('/paneles', api.rutas.getPaneles);
app.post('/paneles',api.rutas.addPanel);
app.get('/paneles/:id', api.rutas.getPanelPorId);
app.put('/paneles',api.rutas.updatePanel);
app.delete('/paneles',api.rutas.deletePanel);

//-----------------------------------------------------
// Agente 
//-----------------------------------------------------

var agente = require('./agente/agente');

//-------------------------------------------
//  Server
//-------------------------------------------

var env = process.env.NODE_ENV || 'development';

var server= http.createServer(app);  // Create server
var util= require('util');  // Use utils
global.io =ioSocket.listen(server);  // Listen to sockets


if (!module.parent) {
    server.listen(app.get('puerto'), function() {
        app.serverUp=true;
        var mensIO= JSON.parse('{"mensIO": "Server running on port ' + server.address().port + ', Environment: ' + app.settings.env +  '"}');
        io.emit('sendMess', mensIO);
        // Load in the agent and call the initialize function
        util.log("Server running on port " + server.address().port);
        var agenteP=  new agente({io: global.io});
		agenteP.cargaInicial(function (err){
			if (!err) agenteP.iniciaAgente();
		});
    });
}


if ('development' == env) {
    app.use (morgan('dev')); // Log requests to the console
}


