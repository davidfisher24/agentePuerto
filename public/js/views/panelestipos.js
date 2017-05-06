/**
 * Created by Lola on 27/10/2014.
 */

window.PanelesTiposListView = Backbone.View.extend({

    initialize: function () {
        this.model.bind("reset", this.render, this);
        this.render();
    },

    render: function () {
        var panelesTipos= this.model.models;
        var len = panelesTipos.length;
        this.$el.html(this.template);

        for (var i = 0; i < len; i++) {
            $('tbody', this.el).append(new PanelesTiposView({model: panelesTipos[i]}).render().el);
        }
        return this;
    }
});


window.PanelesTiposView=Backbone.View.extend ({

        tagName: "tr",
        className: 'gradeA',

        initialize: function () {
            var color;
            if (this.model.get("colorTexto") == "01") color = "red";
            if (this.model.get("colorTexto") == "11") color = "Amber";
            this.model.set("colorTexto",color);
            this.model.bind("change", this.render, this);
            this.model.bind("destroy", this.close, this);
        },

        render: function () {
            this.$el.html(this.template(this.model.toJSON()));
            return this;
        }
    }
);
