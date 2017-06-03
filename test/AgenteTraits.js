AgenteTraits = {

	returnFakePanel:function() {
		return {
			"id"               : 14,
			"idpanel"          : 78,
			"panel"            : "APEADERO BERJA",
			"ip"               : "10.250.16.103",
			"puerto"           : 4001,
			"inactivo"         : false,
			"type"             : "INFORMACION",
			"horaEnciendo"     : "06:00",
			"horaApago"        : "23:59",
			"debug"            : 0
		}
	},

	returnGlobalParams:function() {
		return {
			"agente"    : 1,
		    "parametros": {
		        "numeroReintentos"    : 3,
		        "tiempoEntreReintento": 10,
		        "tiempoRefresco"      : 85,
		        "tiempoEspera": 60,
		        "debugmode" : 1,
		        "tiempoDeInmediataz" : 1,
		        "simboloDeInmediataz" : ">>"
		    },
		    "panelTypes" : {
		        "MARQUESINA" : {
		            "lineasTotal" : 3,
		            "lineasServicios" : 3,
		            "numeroUltimosServicios" : 2,
		            "alturaDeLinea" : 9,
		            "longitudDeLinea" : 120,
		            "maxCaracteresNombre" : 12,
		            "maxCaractersTotal" : 20,
		            "colorTexto" : "01",
		            "velocidadTexto" : "04",
		            "alturaTexto" : "07"
		        },
		        "INFORMACION" : {
		            "lineasTotal" : 5,
		            "lineasServicios" : 5,
		            "numeroUltimosServicios" : 4,
		            "alturaDeLinea" : 9,
		            "longitudDeLinea" : 210,
		            "maxCaracteresNombre" : 24,
		            "maxCaractersTotal" : 35,
		            "colorTexto" : "11",
		            "velocidadTexto" : "04",
		            "alturaTexto" : "07"
		        }
		    },

		    "servicios"     : {"name": "servicios", "host" : "10.249.0.64", "puerto":8080 , "ruta": "/laharpe/rest/servicios-dia.do", "metodo": "GET"},
		    "serviciosParada" : {"name": "serviciosParada", "host" : "10.249.0.64", "puerto":8080 , "ruta": "/laharpe/rest/servicios-parada.do?id={id}&numeroElementos{numero}", "metodo": "GET"},
		    "incidencias"   :  {"name": "incidencias",  "host" : "10.249.0.64", "puerto":8080 , "ruta": "/laharpe/rest/incidencias.do", "metodo": "GET"},
		    "estados"       :  {"name": "estados", "host" : "10.249.0.64", "puerto":8080 , "ruta": "/laharpe/rest/estado.do", "metodo": "POST"} ,

		    "textos" : {
		        "ultimo_servicio" : "ULTIMO SERVICIO",
		        "ultimos_servicios" : "ULTIMOS SERVICIOS",
		        "servicios_finalizados" : "SERVICIOS FINALIZADOS POR HOY",
		        "servicioRetrasado" : "-RETRESADO",
		        "servicioCancelado" : "-CANCELADO",
		        "simboloRetrasoCancelo" : "*"
		    }
		}
	}
}

module.exports=AgenteTraits;