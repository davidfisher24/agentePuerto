
/**
 * Created by Lola on 28/10/2014.
 */

/**
 * Creamos el modelo llamado PanelModel que extiende de Backbone.Model
 */
window.PanelesTiposModel=Backbone.Model.extend({

    idAtribute: "id",
    urlRoot: "/panelesTipos",

    defaults : {
        lineasTotal : null,
        lineasServicios :null,
        numeroUltimosServicios : null,
        alturaDeLinea : null,
        longitudDeLinea : null,
        maxCaracteresNombre : null,
        maxCaractersTotal : null,
        colorTexto : null,
        velocidadTexto : null,
        alturaTexto : null
    },



});
