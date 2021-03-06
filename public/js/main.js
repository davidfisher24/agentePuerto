/**
 * Created by Lola on 27/10/2014.
 */


var AppAgente= Backbone.Router.extend({
    routes :{
        "" : "cargaVisor",
        "general" : "cargaGeneral",
        "textos" : "cargaTextos",
        "paneles" : "cargaPaneles",
        "recursos" : "cargaRecursos",
        "panelesTipos" : "cargaPanelesTipos",
        "paneles/add" : "addPanel",
        "paneles/:id" : "detallePanel",
        "delete/:id" : "deletePanel",
    },


    initialize : function(res) {
        //Captura los eventos de la aplicacion
        this.eventosApp = _.extend({},Backbone.Events);
        this.eventosView = _.extend({},Backbone.Events);
        this.csIO= new  clienteIO ({evento: this.eventosApp});
        this.csIO.conecta();

        this.menuView = new  MenuView();
        this.panelesCol= new PanelCollection();
        $('body').html(this.menuView.el);
        this.$content = $("#content");
    },

    cargaVisor : function (){
        var _this=this;
        this.eventosApp.on('cargaEstadoPanel',function(datos){
            var itemPanel=_this.panelesCol.get(datos.id);

            itemPanel.set({
                idestado: datos.estado, 
                lineas: datos.texto,
            });
        });
       this.homeView = new HomeView ({collection: _this.panelesCol, evento: _this.eventosView});
       this.$content.html(this.homeView.el);
       this.menuView.selectMenuItem('home-menu');
    },

    cargaGeneral : function(){
        var confGeneral = new GeneralModel();
        confGeneral.fetch({success: function(){
            $("#content").html(new  GeneralView({model: confGeneral}).el);
        }});

        this.menuView.selectSubMenuItem('general-menu');
    },

    cargaTextos : function(){
        var confTextos = new TextosModel();
        confTextos.fetch({success: function(){
            $("#content").html(new  TextosView({model: confTextos}).el);
        }});

        this.menuView.selectSubMenuItem('textos-menu');
    },

    cargaPaneles: function(){
        var listaPaneles= this.panelesCol;
        listaPaneles.fetch({ success: function(){
            $('#content').html(new PanelesListView({model: listaPaneles}).el);
        }});
        this.menuView.selectSubMenuItem('paneles-menu');

    },

    cargaRecursos: function(){
        var listaRecursos= new RecursosCollection();
        listaRecursos.fetch({ success: function(){
            $('#content').html(new RecursosListView({model: listaRecursos}).el);
        }});
        this.menuView.selectSubMenuItem('recursos-menu');
    },

    cargaPanelesTipos: function(){
        var listaTiposPaneles = new PanelesTiposCollection();
        listaTiposPaneles.fetch({ success: function(){
            $('#content').html(new PanelesTiposListView({model: listaTiposPaneles}).el);
        }});
        this.menuView.selectSubMenuItem('paneles-tipos-menu');
    },

    addPanel : function() {
        $('#content').html(new PanelAddView({paneles: this.panelesCol ,model: new PanelModel()}).el);
        this.menuView.selectSubMenuItem();
    },

    detallePanel : function(id) {
        var panel = this.panelesCol.get(id);
        panel.fetch({success: function(){
            $('#content').html(new PanelView({model: panel}).el);
        }});
        this.menuView.selectSubMenuItem();
    },

    deletePanel : function(id){
        var panel = this.panelesCol.get(id);
        panel.fetch({success: function(){
            $('#content').html(new DeleteView({model: panel}).el);
        }});
    },

});

utils.loadTemplate(['HomeView', 'MenuView','GeneralView','TextosView','RecursosListView','RecursoView',
    'PanelesTiposView','PanelesTiposListView','PanelesListView','PanelesListItemView','PanelView','PanelAddView',
    'DeleteView'], function() {
    var app = new AppAgente();
    Backbone.history.start();
});