/**
 * Created by Lola on 27/10/2014.
 */

window.HomeView =  Backbone.View.extend  ({
   initialize : function (opt){
      this.collection = opt.collection;
      this.listenTo (this.collection,'change',this.cargaestado);
      this.render();
   },

    render : function(){
        var _this = this;

        this.collection.fetch({
            success: function (collection) {
                var plantilla = _this.template({items: collection.toJSON()});
                _this.$el.html(plantilla);
            }
        });
        this.$el.html(this.template({items: this.collection.toJSON() }));
        return this;
    },

    cargaestado: function() {
        var estado='';
        for (var i=0;i<this.collection.length; i ++) {
            var itemPanel = this.collection.at(i);
            var estado;
            $('#estado'+itemPanel.get('id')).removeClass("panel-danger panel-warning panel-success");
            if (itemPanel.get('idestado')==0) {
                $('#estado'+itemPanel.get('id')).addClass('panel panel-success');
                estado = "<strong>ESTADO : ACTIVO</strong>";
            } else if (itemPanel.get('idestado')==1){
                $('#estado'+itemPanel.get('id')).addClass('panel panel-danger');
                estado = "<strong>ESTADO : DESCONOCIDO</strong>";
            } else {
                $('#estado'+itemPanel.get('id')).addClass('panel panel-warning');
                estado = "<strong>ESTADO : INACTIVO</strong>";
            }
            var lineasTotal = itemPanel.get('lineas');
            var lineas = lineasTotal.split("#");
            for (var j=0; j <= lineas.length; j++) {
                if(lineas[j] && lineas[j] !== "")
                    estado= estado + '<p>' + lineas[j] + '</p>';
            }
            $('#panel'+ itemPanel.get('id')).html(estado);
        }
    }
});
