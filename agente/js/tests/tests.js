Tests = {

	servicios: function () {
		var _this = this;
		var serviciosReturn = {
			informacion: [],
			refresco: 60,
			series: Math.floor((Math.random() * 500) + 1),
			total: 0,
		};
		for (var i=0; i < Math.floor((Math.random() * 100) + 1); i++) {
			// Random depature arriveal time
			var time = _this.getTime();
			// curent time
			var currentDate = new Date();
  			var nowTime = ("0" + currentDate.getHours()).slice(-2);
  			nowTime += ":" + ("0" + currentDate.getMinutes()).slice(-2);
			var estado;
			if (time[0] < nowTime) estado = "Finalizado";
			else if (time[1] > nowTime) estado = "Normal";		
			else estado = "En curso";
			var rand = Math.floor((Math.random() * 10) + 1);
			if (rand === 9) estado = "Cancelado";
			if (rand === 10) estado = "Retrasado";

			//var estado = _this.getEstado(Math.floor((Math.random() * 5)));
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

    getDestino:function(num){
    	var destinosAlmeria = ["ALMERIA","ROQUETAS","BERJA","ADRA","CABO DE GATA","AGUADULCE","RODALQUILER","CARBONERAS",
    	"SAN PEDRO","VILLAFIQUE","MOJACAR","TABERNAS","EL EJIDO","ALBOX","VELEZ RUBIO","CUEVAS DE ALMANZORA","ENIX",
    	"ALHAMA DE ALMERIA","HUERCAL DE ALMERIA","MINI HOLLYWOOD","SORBAS","AGUA AMARGA","LUCIANA DE LAS TORRES",
    	"LOS GALLARDOS","MOJACAR PUEBLO"];
    	return destinosAlmeria[num];
    },


    getTipo: function(num){
    	var tipos = ["Salida","Llegada","Paso","Mixto"];
    	return tipos[num];
    },

    getTime: function(){
    	var numA = Math.floor((Math.random() * 18) + 6);
    	var numB = Math.floor((Math.random() * 18) + 6);

    	var returnArray = [];
    	returnArray[0] = ("0" + Math.min(numA,numB)).slice(-2) +":"+ ("0" + Math.floor(Math.random()*60)).slice(-2);
    	returnArray[1] = ("0" + Math.max(numA,numB)).slice(-2) +":"+ ("0" + Math.floor(Math.random()*60)).slice(-2);

    	return returnArray;
    },

}

module.exports=Tests;