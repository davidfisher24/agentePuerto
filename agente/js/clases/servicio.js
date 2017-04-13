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
    var text = '';
    var hour = this.checkBusesArrivingNow(this.hora); 
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
        nuveaHora = this.checkBusesArrivingNow(nuevaHora); 
        hour = nuevaHora;
        flagRetraso = 1;
    }

    return {
        service: this.codigo.replace("-",""),
        name: name,
        time: hour,
        flagRetraso: flagRetraso,
    }
};

// Servicio-dia.do: paneles marquesina
Servicio.prototype.getLineaFromServices = function (){
    var wait = this.calculateWait(this.llegada);
    wait = parseInt(wait) === 0 ? ">>" : parseInt(wait);
    var text = '';
    if (parseInt(this.retraso) == 0) {
        return (this.codigo.replace("-","") + ' ' + this.destino + ' ' + wait);
    } else {
        //CALCULO DEL RETRASO
        var aux=this.llegada.split(":");
        var time = parseInt(wait) + parseInt(this.retraso);
        time = parseInt(time) === 0 ? ">>" : parseInt(time);
        return (this.codigo.replace("-","") + ' ' + this.destino + ' RETRASADO ' + time);  
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
    return (llegada === nowTime) ? ">>" : llegada;
}


module.exports=Servicio;