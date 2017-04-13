/**
 * Created by Lola on 03/12/2014.
 */


var Servicio= function(atributos){
    this.codigo= atributos.codigo,
    this.nombre=atributos.nombre,
    this.estado = atributos.estado,
    this.hora = atributos.hora,
    this.retraso = atributos.retraso,
    this.origen = atributos.origen,
    this.destino = atributos.destino,
    this.salida = atributos.salida,
    this.llegada= atributos.llegada,
    this.lugarDestino= atributos.lugarDestino,
    this.lugarOrigen= atributos.lugarOrigen
}



// Servicio-parada.do: works on the number of minutes to wait
// FINISHED - returns an object with the service with the minutes left to wait
Servicio.prototype.getLineaFromStop = function (){
    var hour = this.hora;
    var name = this.nombre.split(" - ").pop().trim();
    var flagRetraso = 0;

    if (parseInt(this.retraso) == 0) {
    } else {
        //CALCULO DEL RETRASO
        var aux=this.hora.split(":");
        var time = parseInt(aux[0])*60 + parseInt(aux[1]) + parseInt(this.retraso);
        var m =  time % 60;
        var h= ((time - m)/60) % 24;
        var nuevaHora = ("00" + h).slice(-2) + ':' + ("00" + m).slice(-2);
        hour = nuevaHora;
        flagRetraso = 1;
    }

    wait = this.calculateWait(hour); 
    flagArrivingNow = this.checkBusesArrivingNow(hour);
    return {
        service: this.codigo.replace("-",""),
        name: name,
        time: hour,
        wait: wait,
        flagRetraso: flagRetraso,
        flagArrivingNow: flagArrivingNow,
    }
};

// Servicio-dia.do: works on the time of leaving
// Works - works on the time of leaving
//Paneles información:
Servicio.prototype.getLineaFromServices = function (){
    var hour = this.salida; 
    var name = this.destino;
    var flagRetraso = 0;
    if (parseInt(this.retraso) == 0) {
    } else {
        //CALCULO DEL RETRASO
        var aux=this.hora.split(":");
        var time = parseInt(aux[0])*60 + parseInt(aux[1]) + parseInt(this.retraso);
        var m =  time % 60;
        var h= ((time - m)/60) % 24;
        var nuevaHora = ("00" + h).slice(-2) + ':' + ("00" + m).slice(-2);
        hour = nuevaHora;
        flagRetraso = 1;
    }

    wait = this.calculateWait(hour); 
    flagArrivingNow = this.checkBusesArrivingNow(hour);
    return {
        service: this.codigo.replace("-",""),
        name: this.destino,
        time: hour,
        wait: wait,
        flagRetraso: flagRetraso,
        flagArrivingNow: flagArrivingNow,
    }
};

// Helps with servicios-dia by calculating the minutes between an arrival and the current time
Servicio.prototype.calculateWait = function(llegada){
    llegada = llegada.split(":");
    var currentDate = new Date();
    var nowTime = [currentDate.getHours(),currentDate.getMinutes()];

    if (parseInt(nowTime[0]) === parseInt(llegada[0])) {
        return parseInt(llegada[1]) - parseInt(nowTime[1]);
    } else {
        return parseInt(llegada[1]) + ((parseInt(llegada[0]) - parseInt(nowTime[0]) - 1) * 60) + (60 - parseInt(nowTime[1]));
    }
};

// Helps with servicios-parada by calculating if the time is now and we have zero minutes to wait
Servicio.prototype.checkBusesArrivingNow = function(llegada) {
    var currentDate = new Date();
    var nowTime = currentDate.getHours() + ":" + currentDate.getMinutes();
    return (llegada === nowTime) ? 1 : 0;
}


module.exports=Servicio;