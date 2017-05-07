/**
 * Created by Lola on 22/11/2014.
 */
window.GeneralModel=Backbone.Model.extend({

    url: "/general",
    defaults : {
        numeroReintentos    : 3,
        tiempoEntreReintento: 10,
        tiempoRefresco      : 85,
        tiempoEspera: 60,
        tiempoDeInmediataz : 1,
        simboloDeInmediataz : ">>",
        debugmode : 1,
    },

    validate: function (attrs) {
        var errors = {};
        if (!attrs.numeroReintentos) errors.id= "Debe introducir un numero de reintentos";
        if (!attrs.tiempoEntreReintento) errors.id= "Debe introducir un tiempo entre reintentos.";
        if (!attrs.tiempoRefresco) errors.id= "Debe introducir un tiempo de refresco.";
        if (!attrs.tiempoEspera) errors.id= "Debe introducir un tiempo de espera.";
        if (!attrs.tiempoDeInmediataz) errors.id= "Debe introducir un tiempo de inmediatez.";
        if (!attrs.simboloDeInmediataz) errors.id= "Debe introducir un simbolo de inmediatez.";
        if (isNaN(parseInt(attrs.numeroReintentos))) errors.id= "Numero de reintentos debe ser un numero";
        if (isNaN(parseInt(attrs.tiempoEntreReintento))) errors.id= "Tiempo entre reintentos debe ser un numero.";
        if (isNaN(parseInt(attrs.tiempoRefresco))) errors.id= "Tiempo de refresco debe ser un numero.";
        if (isNaN(parseInt(attrs.tiempoEspera))) errors.id= "Tiempo de espera debe ser un numero.";
        if (isNaN(parseInt(attrs.tiempoDeInmediataz))) errors.id= "Tiempo de inmediatez debe ser un numero.";
        //if (attrs.simboloDeInmediataz.length > 3) errors.id= "Simbolo de inmeidatez debe contenir un maximo de 4 caracters.";


        if (!_.isEmpty(errors)) {
            return errors;
        }
    },


});