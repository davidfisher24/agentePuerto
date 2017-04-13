/**
 * Created by Lola on 27/10/2014.
 */

window.PanelesListView = Backbone.View.extend({

   initialize: function () {
//        this.model.bind("reset", this.render, this);
 //       this.model.bind("change", this.render,this);
        this.render();
    },

    render: function () {
        var listapaneles = this.model.models;
        var len = listapaneles .length;
        this.$el.html(this.template);

        for (var i = 0; i < len; i++) {
            $('tbody', this.el).append(new PanelesListItemView({model: listapaneles[i]}).render().el);
        }
        return this;
    }
});


window.PanelesListItemView=Backbone.View.extend ({

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

window.PanelView =Backbone.View.extend ({

    events: {
        "click button.guardar": "guardaPanel"
    },

    initialize: function (options) {
        this.paneles=options.paneles;
        this.nuevoPanel=options.model;
        this.nuevoPanel.bind('invalid',this.muestraErrores,this);
        this.render();

    },

    render: function () {
        this.$el.html(this.template(this.nuevoPanel.toJSON()));
        return this;
    },
    muestraErrores: function (panel, errors) {
        this.$el.find('.error').removeClass('error');
        this.$el.find('.alert').html(_.values(errors).join('<br>')).show();
        // highlight the fields with errors
        _.each(_.keys(errors), _.bind(function (key) {
            this.$el.find('*[name=' + key + ']').parent().addClass('error');
        }, this));
    },
    guardaPanel : function (event) {
        event.stopPropagation();
        event.preventDefault();
        // modificamos el modelo con los datos del formulario
        this.nuevoPanel.set({
            id: this.$el.find('input[name=id]').val(),
            idpanel: this.$el.find('input[name=idpanel]').val(),
            panel: this.$el.find('input[name=panel]').val(),
            ip: this.$el.find('input[name=ip]').val(),
            puerto: this.$el.find('input[name=puerto]').val(),
            luminosidad: this.$el.find('input[name=luminosidad]').val(),
            forzarluminosidad: this.$el.find('input[name=forzarluminosidad]').val(),
            inactivo: this.$el.find('input[name=inactivo]').val()
        });
        if (this.nuevoPanel.isValid()) {
            //this.paneles.add(this.nuevoPanel);
            this.nuevoPanel.save(null,{type: "POST", success: function(){
                console.log ("valida");
            }, error: function() {
                console.log ("error");
            }});
            window.location.hash = "paneles";
        }
    }
});
