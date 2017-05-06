/**
 * Created by Lola on 27/10/2014.
 */

window.TextosView = Backbone.View.extend({

    initialize : function (options){
        this.render();
    },

    render : function() {
        this.$el.html(this.template(this.model.toJSON()));
        return this;
    }

});