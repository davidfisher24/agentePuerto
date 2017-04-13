/**
 * Created by Lola on 09/03/2015.
 */
var clienteIO = function (param) {
    var _this = this;
    _this.evento= param.evento;

    _this.conecta = function () {
        _this.socket = io();
        _this.manejoEventos(_this.socket);

    }

    _this.manejoEventos=function(socket){

        //Manejamos los mensajes de estado que llegan del agente de los paneles
        socket.on('consultaestado', function(estado){

            _this.evento.trigger('cargaEstadoPanel',estado);  //Dispara el evento cargaEstadoPanel para recargar el estado de los paneles enviando los datos
        });
    };
}