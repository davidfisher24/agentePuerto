/**
 * Created by Lola on 27/10/2014.
 */

window.GeneralView = Backbone.View.extend({

	events: {
        "click button.guardar": "guardaConfig",
    },

    initialize : function (options){
    	this.nuevoConfig = options.model;
    	this.nuevoConfig.bind('invalid',this.muestraErrores,this);
        this.render();
    },

    render : function() {
        this.$el.html(this.template(this.model.toJSON()));
        return this;
    },

    muestraErrores: function (panel, errors) {

    },

    guardaConfig : function (event) {
        event.stopPropagation();
        event.preventDefault();
        // modificamos el modelo con los datos del formulario
        this.nuevoConfig.set({
            numeroReintentos: this.$el.find('input[name=numeroReintentos]').val(),
            tiempoEntreReintento: this.$el.find('input[name=tiempoEntreReintento]').val(),
            tiempoRefresco: this.$el.find('input[name=tiempoRefresco]').val(),
            tiempoEspera: this.$el.find('input[name=tiempoEspera]').val(),
            tiempoDeInmediataz : this.$el.find('input[name=tiempoDeInmediataz ]').val(),
            simboloDeInmediataz: this.$el.find('input[name=simboloDeInmediataz]').val(),
        });
        if (this.nuevoConfig.isValid()) {
            this.nuevoConfig.save(null,{type: "POST", success: function(){
                console.log ("valida");
            }, error: function() {
                console.log ("error");
            }});
            window.location.hash = "general";
        }
    },

});