var assert = require('assert');
var expect = require('expect');

var AgenteTraits = require('./AgenteTraits'); 
var ApiTraits = require('./ApiTraits');  // Fake AJax data

var Panel = require('../agente/js/clases/panel'); 
var Servicio = require('../agente/js/clases/servicio');  // Services Object


/* Tests the response of the API of the formation of the services that are sent back */

describe('parse ajax data response', function() {
  this.timeout(15000);
  it('does something', function(done) {
  	global.param = AgenteTraits.returnGlobalParams();
  	var panel = new Panel(AgenteTraits.returnFakePanel());
    var simulatedData = ApiTraits.serviciosDiaAjaxCall();

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
    panel.calculateServicesInSegments();
    
    // Test our panel segments here

    //assert.equal(-1, [1,2,3].indexOf(4));
    //expect(user.fullName).to.equal("Tomas Jakobsen");

  });
});