/**
 * Created by Lola on 22/11/2014.
 */
window.TextosModel=Backbone.Model.extend({

    url: "/textos",
    defaults : {
        ultimo_servicio : "",
        ultimos_servicios : "",
        servicios_finalizados : "",
        servicioRetrasado : "",
        servicioCancelado : "",
        simboloRetrasoCancelo : ""
    },

    validate: function (attrs) {
    	console.log(attrs);
        var errors = {};
        if (!attrs.ultimo_servicio) errors.id= "Debe introducir un texto de ultimo servicio";
        if (!attrs.ultimos_servicios) errors.id= "Debe introducir un texto de ultimos servicios.";
        if (!attrs.servicios_finalizados) errors.id= "Debe introducir un texto de servicios finalizados.";
        if (!attrs.servicioRetrasado) errors.id= "Debe introducir un texto de servicio retrasado.";
        if (!attrs.servicioCancelado) errors.id= "Debe introducir un texto de servicio cancelado.";
        if (!attrs.simboloRetrasoCancelo) errors.id= "Debe introducir un simbolo de retraso/cancelo.";
        if (attrs.simboloRetrasoCancelo && attrs.simboloRetrasoCancelo.length > 1)
        	errors.id="El simbolo retraso/cancelo solo puede contenir un caracter.";
        if (!_.isEmpty(errors)) {
            return errors;
        }
    }
});