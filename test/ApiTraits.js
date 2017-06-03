ApiTraits = {

	serviciosDiaAjaxCall: function () {
		var _this = this;
		var serviciosReturn = {
			informacion: [],
			refresco: 60,
			serie: Math.floor((Math.random() * 100)),
			total: 0,
		};
		for (var i=0; i < Math.floor((Math.random() * 500) + 1); i++) {
			var time = _this.getTime();
			var currentDate = new Date();
  			var nowTime = ("0" + currentDate.getHours()).slice(-2);
  			nowTime += ":" + ("0" + currentDate.getMinutes()).slice(-2);
			var estado;
			if (time[0] < nowTime) estado = "Finalizado";
			else if (time[1] > nowTime) estado = "Normal";		
			else estado = "En curso";
			var rand = Math.floor((Math.random() * 10) + 1);
			if (rand === 9 && estado === "Normal") estado = "Cancelado";
			if (rand === 10 && (estado === "En Curso" || estado === "Normal")) estado = "Retrasado";


			serviciosReturn.informacion.push({
				codigo: "M-" + Math.floor((Math.random() * 299) + 100),
				destino: _this.getDestino(Math.floor((Math.random() * 25))),
				estado: estado,
				llegada: time[1],
				nombre: _this.getDestino(Math.floor((Math.random() * 25))) + " - " + _this.getDestino(Math.floor((Math.random() * 25))),
				retraso: estado === "retrasado" ? Math.floor((Math.random() * 10) + 1) : 0,
				salida: time[0],
				paneles: [{
					id: 14,
					tipo: _this.getTipo(Math.floor((Math.random() * 4))) 
				}],
			});
		}
		serviciosReturn.total = serviciosReturn.length;
		return serviciosReturn;
    },

    serviciosParadaAjaxCall: function (){
    	var _this = this;
		var serviciosReturn = {
			informacion: [],
			refresco: 30,
			serie: Math.floor((Math.random() * 100)),
			total: 5,
		};
		var currentDate = new Date();
		var nowTime = ("0" + currentDate.getHours()).slice(-2);
		nowTime += ":" + ("0" + currentDate.getMinutes()).slice(-2);
		var serviceTimes = [];
		while (serviceTimes.length < 5) {
			var time = _this.getSingleTime();
			if (time > nowTime && time < "24:00") serviceTimes.push(time);
		}

		for (var i=0; i < 5; i++) {
			var estado = "Normal";
			var rand = Math.floor((Math.random() * 10) + 1);
			if (rand === 9) estado = "Cancelado";
			if (rand === 10) estado = "Retrasado";

			serviciosReturn.informacion.push({
				codigo: "M-" + Math.floor((Math.random() * 299) + 100),
				estado: estado,
				nombre: _this.getDestino(Math.floor((Math.random() * 25))) + " - " + _this.getDestino(Math.floor((Math.random() * 25))),
				retraso: estado === "retrasado" ? Math.floor((Math.random() * 10) + 1) : 0,
				hora: serviceTimes[i],
			});
		}
		return serviciosReturn;
    },

    incidenciasAjaxCall: function(){
    	var _this = this;
		var incidenciasReturn = {
			informacion: [],
			refresco: 60,
			serie: Math.floor((Math.random() * 500) + 1),
			total: 0,
		};
		if (Math.floor((Math.random() * 5) + 1) == 5) {
			incidenciasReturn.informacion.push({
				criticidad: 0,
				texto: _this.getIncidencia(Math.floor((Math.random() * 8))),
				paneles: [{
					id: 14,
					tipo: _this.getTipo(Math.floor((Math.random() * 4))) 
				}],
			});
			incidenciasReturn.total = 1;
		}
		return incidenciasReturn;
    },

    getDestino:function(num){
    	var destinosAlmeria = ["ALMERIA","ROQUETAS","BERJA","ADRA","CABO DE GATA","AGUADULCE","RODALQUILER","CARBONERAS",
    	"SAN PEDRO","VILLAFIQUE","MOJACAR","TABERNAS","EL EJIDO","ALBOX","VELEZ RUBIO","CUEVAS DE ALMANZORA","ENIX",
    	"ALHAMA DE ALMERIA","HUERCAL DE ALMERIA","MINI HOLLYWOOD","SORBAS","AGUA AMARGA","LUCIANA DE LAS TORRES",
    	"LOS GALLARDOS","MOJACAR PUEBLO"];
    	return destinosAlmeria[num];
    },

    getIncidencia:function(num){
    	var incidencias = ["TODAS LAS SALIDAS#EMBARQUE 1","PRÓXIMAS SALIDAS#19:45 A CADIZ#Ultima salida",
    	"PROXIMAS SALIDAS#16:20 A EL PUERTO#17:40 A EL PUERTO#20:30 A EL PUERTO",
    	"Próximas salidas#17:00 A CADIZ#18:20 A CADIZ#ULTIMAS SALIDAS",
    	"BIG BIG PROBLEMS","EVERYTHING HAS DIED","THE MARTIANS ARE INVADING#RUN!!!!!!!",
    	"IT'S 9AM.#ANDALUCIAS IS ASLEEP#GO BACK TO BED"];
    	return incidencias[num];
    },


    getTipo: function(num){
    	var tipos = ["Salida","Llegada","Paso","Mixto"];
    	return tipos[num];
    },

    getTime: function(){
    	var numA = Math.floor((Math.random() * 18) + 6);
    	var numB = Math.floor((Math.random() * 18) + 6);

    	var returnArray = [];
    	returnArray[0] = ("0" + (Math.min(numA,numB))).slice(-2) +":"+ ("0" + Math.floor(Math.random()*60)).slice(-2);
    	returnArray[1] = ("0" + (Math.min(numA,numB))).slice(-2) +":"+ ("0" + Math.floor(Math.random()*60)).slice(-2);
    	return returnArray;
    },

    getSingleTime: function(){
    	var numA = ("0" + (Math.floor(Math.random() * 18) + 6)).slice(-2);
    	var numB = ("0" + Math.floor(Math.random()*60)).slice(-2);
    	return numA + ":" + numB;
    },

}

module.exports=ApiTraits;