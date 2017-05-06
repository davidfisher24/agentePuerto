/**
 * Created by Lola on 22/11/2014.
 */
window.GeneralModel=Backbone.Model.extend({

    url: "/general",
    defaults : {
        numeroReintentos    : 3,
        tiempoEntreReintento: 10,
        tiempoRefresco      : 85,
        tiempoEspera: 60,
        debugmode : 1,
        tiempoDeInmediataz : 1,
        simboloDeInmediataz : ">>"
    }
});