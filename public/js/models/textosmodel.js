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
    }
});