/**
 * Created by Lola on 27/10/2014.
 */


window.DeleteView=Backbone.View.extend ({

        tagName: "tbody",
        className: 'gradeA',

        events: {
            "click a.borrar": "borraPanel",
        },

        initialize: function () {
            this.render();
            //this.model.bind("change", this.render, this);
            //this.model.bind("destroy", this.close, this);
        },

        render: function () {
            this.$el.html(this.template(this.model.toJSON()));
            return this;
        },

        borraPanel : function (event) {
            event.stopPropagation();
            event.preventDefault();
            this.model.destroy(null,{type: "POST", success: function(){
                console.log ("valida");
            }, error: function() {
                console.log ("error");
            }});
            window.location.hash = "paneles";
        },
    }
);