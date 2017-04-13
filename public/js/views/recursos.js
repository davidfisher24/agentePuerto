/**
 * Created by Lola on 27/10/2014.
 */

window.RecursosListView = Backbone.View.extend({

    initialize: function () {
        this.model.bind("reset", this.render, this);
        this.render();
    },

    render: function () {
        var recursos= this.model.models;
        var len = recursos.length;
        this.$el.html(this.template);

        for (var i = 0; i < len; i++) {
            $('tbody', this.el).append(new RecursoView({model: recursos[i]}).render().el);
        }
        return this;
    }
});


window.RecursoView=Backbone.View.extend ({

        tagName: "tr",
        className: 'gradeA',

        initialize: function () {
            this.model.bind("change", this.render, this);
            this.model.bind("destroy", this.close, this);
        },

        render: function () {
            this.$el.html(this.template(this.model.toJSON()));
            return this;
        }
    }
);
