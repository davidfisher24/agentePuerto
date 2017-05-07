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
            console.log(itemPanel);
            //var texto = itemPanel.get('estado').split('#');
            var texto
             ='ACTIVO';
            $('#estado'+itemPanel.get('id')).removeClass("panel-danger panel-warning panel-success");
            if (itemPanel.get('idestado')==0) {
                $('#estado'+itemPanel.get('id')).addClass('panel panel-success');
            } else if (itemPanel.get('idestado')==1){
                $('#estado'+itemPanel.get('id')).addClass('panel panel-danger');
            } else {
                $('#estado'+itemPanel.get('id')).addClass('panel panel-warning');
            }

            for (var j=1; j <= parseInt(itemPanel.get('lineas')); j++) {
                if (j <= texto.length) {
                    estado= estado + '<p>' + texto[j-1] + '</p>';

                } else{
                    estado = estado +  '<p>' + ' ' + '</p>';
                }
            }
            $('#panel'+ itemPanel.get('id')).html(estado);
        }
    }
});
