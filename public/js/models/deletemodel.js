/**
 * Created by Lola on 22/11/2014.
 */
window.DeleteModel=Backbone.Model.extend({

	idAtribute: "id",
    urlRoot: "/delete",

    defaults : {
        id               : null,
        idpanel          : null,
        panel            : "",
        ip               : "",
        puerto           : 0,
        inactivo         : false,
        type             : "MARQUESINA",
        horaEnciendo     : "00:00",
        horaApago        : "23:59",
    },
});


