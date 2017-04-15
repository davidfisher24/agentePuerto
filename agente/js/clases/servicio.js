/* Creates the objects that we will use for our services */


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



// One function for each resource
// Returns an object for each service of service, name, time, wait, flagRetraso, flagArrivingNow

Servicio.prototype.getLineaFromServiciosParadaResource = function (){
    var hour = this.hora;
    var name = this.nombre.split(" - ").pop().trim();
    var flagRetraso = 0;

    if (parseInt(this.retraso) == 0) {
    } else {
        var aux=this.hora.split(":");
        var time = parseInt(aux[0])*60 + parseInt(aux[1]) + parseInt(this.retraso);
        var m =  time % 60;
        var h= ((time - m)/60) % 24;
        var nuevaHora = ("00" + h).slice(-2) + ':' + ("00" + m).slice(-2);
        hour = nuevaHora;
        flagRetraso = 1;
    }

    var wait = this.calculateWait(hour); 
    var flagArrivingNow = this.checkBusesArrivingNow(hour);
    return {
        service: this.codigo.replace("-",""),
        name: name,
        time: hour,
        wait: wait,
        flagRetraso: flagRetraso,
        flagArrivingNow: flagArrivingNow,
    }
};


Servicio.prototype.getLineaFromServiciosDiaResource = function (){
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

// Calculates the minutes wait from the present time

Servicio.prototype.calculateWait = function(testTime){
    var that = this;
    testTime = testTime.split(":");
    var currentDate = new Date();
    var nowTime = [currentDate.getHours(),currentDate.getMinutes()];

    if (parseInt(nowTime[0]) === parseInt(testTime[0])) {
        return parseInt(testTime[1]) - parseInt(nowTime[1]);
    } else {
        var difference = that.calculateDifference(nowTime,testTime);
        difference = difference.split(":");
        return (parseInt(difference[0]) * 60) + parseInt(difference[1]);
    }
};

// Calculates the difference between two times - still a bug here somewhere

Servicio.prototype.calculateDifference = function(now,then){
    var startDate = new Date(0, 0, 0, now[0], now[1], 0);
    var endDate = new Date(0, 0, 0, then[0], then[1], 0);
    var diff = endDate.getTime() - startDate.getTime();
    var hours = Math.floor(diff / 1000 / 60 / 60);
    diff -= hours * 1000 * 60 * 60;
    var minutes = Math.floor(diff / 1000 / 60);

    if (hours < 0)
       hours = hours + 24;

    return (hours <= 9 ? "0" : "") + hours + ":" + (minutes <= 9 ? "0" : "") + minutes;

};

// Helps with servicios-parada by calculating if the time is now and we have zero minutes to wait
Servicio.prototype.checkBusesArrivingNow = function(llegada) {
    var currentDate = new Date();
    var nowTime = currentDate.getHours() + ":" + currentDate.getMinutes();
    return (llegada === nowTime) ? 1 : 0;
}


module.exports=Servicio;