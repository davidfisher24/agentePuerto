/**
 * Created by Lola on 27/10/2014.
 */

window.MenuView = Backbone.View.extend({
   initialize : function(){
       this.render();
   },
    render : function(){
        this.$el.html(this.template());
        return this;
    },

    selectMenuItem: function(item){
        $('.navbar .nav li').removeClass('active');
        if (item) {
            $('.' + item).addClass('active');
        }
    },

    selectSubMenuItem: function(item){
        $('.navbar .nav .nav li').removeClass('active');
        if (item) {
            $('.' + item).addClass('active');
        }
    }

});
