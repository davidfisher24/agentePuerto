/**
 * Created by Lola on 27/10/2014.
 */

window.TextosView = Backbone.View.extend({

	events: {
        "click button.guardar": "guardaTextos",
    },

    initialize : function (options){
    	this.nuevoTextos = options.model;
    	this.nuevoTextos.bind('invalid',this.muestraErrores,this);
        this.render();
    },

    render : function() {
        this.$el.html(this.template(this.model.toJSON()));
        return this;
    },

    muestraErrores: function (panel, errors) {
        this.$el.find('.error').removeClass('error');
        this.$el.find('.alert').html(_.values(errors).join('<br>')).show();
        _.each(_.keys(errors), _.bind(function (key) {
            this.$el.find('*[name=' + key + ']').parent().addClass('error');
        }, this));
    },

    guardaTextos : function (event) {
        event.stopPropagation();
        event.preventDefault();
        // modificamos el modelo con los datos del formulario
        this.nuevoTextos.set({
            ultimo_servicio: this.$el.find('input[name=ultimo_servicio]').val(),
            ultimos_servicios: this.$el.find('input[name=ultimos_servicios]').val(),
            servicios_finalizados: this.$el.find('input[name=servicios_finalizados]').val(),
            servicioRetrasado: this.$el.find('input[name=servicioRetrasado]').val(),
            servicioCancelado: this.$el.find('input[name=servicioCancelado]').val(),
            simboloRetrasoCancelo: this.$el.find('input[name=simboloRetrasoCancelo]').val(),
        });
        if (this.nuevoTextos.isValid()) {
            this.nuevoTextos.save(null,{type: "POST", success: function(){
                console.log ("valida");
            }, error: function() {
                console.log ("error");
            }});
            window.location.hash = "textos";
            $('.alert-dismissable').show();
        }
    },

});