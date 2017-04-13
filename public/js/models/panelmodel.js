
/**
 * Created by Lola on 28/10/2014.
 */

/**
 * Creamos el modelo llamado PanelModel que extiende de Backbone.Model
 */
window.PanelModel=Backbone.Model.extend({

    idAtribute: "id",
    urlRoot: "/paneles",

    defaults : {
        id               : null,
        idpanel         : null,
        panel            : "",
        ip               : "",
        puerto           : 6000,
        luminosidad      : 1,
        forzarluminosidad: false,
        inactivo         : false,
        tipo             : "MARQUESINA",
        lineas           : 4,
        idestado         :0,
        estado           :""
    },

    validate: function (attrs) {
        var ipvalidate=/^(\d\d?)|(1\d\d)|(0\d\d)|(2[0-4]\d)|(2[0-5])\.(\d\d?)|(1\d\d)|(0\d\d)|(2[0-4]\d)|(2[0-5])\.(\d\d?)|(1\d\d)|(0\d\d)|(2[0-4]\d)|(2[0-5])$/;
        var errors = {};
        if (!attrs.id) errors.id= "Debe introducir el id del panel realivo a la plataforma de información.";
        if (!attrs.idpanel) errors.id= "Debe introducir el identificador del panel para el sistema.";
        if (!attrs.panel) errors.panel= "Escriba el nombre del panel.";
        if (!attrs.ip) {
            errors.ip= "Introduzca la IP del panel";
        } else {
          if (!ipvalidate.test (attrs.ip)) errors.ip="Formato de IP invalido";
        }
        if (!attrs.puerto) errors.puerto= "Introduzca el puerto de comunicaciones del panel";
        if (attrs.luminosidad<1 || attrs.luminosidad>11) errors.luminosidad= "Indique un valor de 1 a 10 para la luminosidad";

        if (!_.isEmpty(errors)) {
            return errors;
        }
    }

});
