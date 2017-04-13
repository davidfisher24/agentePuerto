/**
 * Created by Lola on 22/11/2014.
 */
window.GeneralModel=Backbone.Model.extend({

    url: "/general",
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