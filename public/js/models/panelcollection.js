/**
 * Created by Lola on 09/03/2015.
 */

/**
 * Creamos la coleccion PanelCollection
 */
window.PanelCollection= Backbone.Collection.extend({
    model: PanelModel,
    url: "/paneles"


});