/**
 * Created by Lola on 09/03/2015.
 */

/**
 * Creamos la coleccion PanelCollection
 */
window.PanelesTiposCollection= Backbone.Collection.extend({
    model: PanelesTiposModel,
    url: "/panelesTipos"


});