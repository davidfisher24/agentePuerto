var assert = require('assert');
var expect = require('expect');
var chai = require('chai');

var AgenteTraits = require('./AgenteTraits'); 
var ApiTraits = require('./ApiTraits');  // Fake AJax data

var Panel = require('../agente/js/clases/panel'); 
var Servicio = require('../agente/js/clases/servicio');  


/* Tests the response of the API of the formation of the services that are sent back */

describe('Testing faked ajax data parsing of information panel', function() {
    this.timeout(15000);
  	global.param = AgenteTraits.returnGlobalParams();  // Set up fake global params
  	var panel = new Panel(AgenteTraits.returnFakePanel());  // Set up a fake panel
    var simulatedData = ApiTraits.serviciosDiaAjaxCall();  // Get simulated ajax data

    // Parsing Functions
    var listaServicios = [];
    simulatedData.informacion.forEach (function(serv){
        serv.paneles.forEach (function (elem){
                var servicio = new Servicio(serv);
                if (14 == elem.id){
                    if (elem.tipo === "Salida" || elem.tipo === "Paso" || elem.tipo === "Mixto") {
                        if (serv.estado === "Normal" || serv.estado === "Cancelado" || serv.estado === "Retrasado") {
                            listaServicios.push(servicio.getLineaFromServiciosDiaResource());
                        }
                    }
                } 
        });
    });
    panel.listaServicios = listaServicios;
    panel.calculateServicesInSegments();  
    // simulatedData = ajax call
	// panel.listaServicios = base list of services
	// panel.servicios = base list of segments
	// panel.segments = list of final segments

	it('Has final services in the correct order', function() {
		var services = panel.servicios;
		for (var i=1; i < services.length; i++) {
			chai.expect(services[i - 1].wait).to.be.below(services[i].wait);
		}
	});

});