ServiciosTraits = {

	returnFakeServicio:function(time) {
		return {
			codigo: "T-000",
		    nombre: "Test",
		    estado: "Normal",
		    hora:  time,
		    retraso: 0,
		    origen: "TEST",
		    destino: "TEST",
		    salida: 0,
		    llegada: 0,
		    lugarDestino: "TEST",
		    lugarOrigen: "TEST"
		}
	},

}


module.exports=ServiciosTraits;