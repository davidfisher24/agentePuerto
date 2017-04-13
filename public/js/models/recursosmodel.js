/**
 * Created by Lola on 22/11/2014.
 */
window.RecursosModel=Backbone.Model.extend({

    defaults : {
        id               : null,
        panel            : "",
        ip               : "",
        puerto           : 6000,
        luminosidad      : 1,
        forzarluminosidad: false,
        inactivo         : false,
        lineas           : 4
    }
});


window.RecursosCollection= Backbone.Collection.extend({

    model: RecursosModel,
    url: "/recursos"

});