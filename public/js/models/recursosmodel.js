/**
 * Created by Lola on 22/11/2014.
 */
window.RecursosModel=Backbone.Model.extend({

    defaults : {
        name             : "",
        host             : "",
        puerto           : "",
        ruta             : "",
        metodo           : "",
    }
});


window.RecursosCollection= Backbone.Collection.extend({

    model: RecursosModel,
    url: "/recursos"

});