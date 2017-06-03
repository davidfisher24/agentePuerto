var assert = require('assert');
var expect = require('expect');

var AgenteTraits = require('./AgenteTraits'); 
var ApiTraits = require('./ApiTraits');  // Fake AJax data

var Panel = require('../agente/js/clases/panel'); 
var Servicio = require('../agente/js/clases/servicio');  // Services Object


/* Tests the response of the API of the formation of the services that are sent back */

describe('Building a panel structure from an ajax call for information panel', function() {
  this.timeout(15000);
  it('Sends the correct segments to the server', function() {
  	global.param = AgenteTraits.returnGlobalParams();  // Fake global params
  	var panel = new Panel(AgenteTraits.returnFakePanel());  // Fake a panel
    var simulatedData = ApiTraits.serviciosDiaAjaxCall();  // Fake simulated data

    // Test simulated data

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

    // Test our panel data here

    panel.listaServicios = listaServicios;
    panel.calculateServicesInSegments();  // The calculation of the final end of the panel ajax call

    // Test our panel segments here
    // panel.servicios == services
    // panel.segments == segments

    //assert.equal(-1, [1,2,3].indexOf(4));
    //expect(user.fullName).to.equal("Tomas Jakobsen");

  });
});