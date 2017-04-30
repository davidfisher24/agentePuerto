/**
 * Created by David Fisher
 */
var util = require ('util');
var fs = require('fs');
var path = require('path');

var logDir = path.join(__dirname, 'log');
var logPath = path.join(__dirname, 'log', 'agente.log');

if (!fs.existsSync(logDir)){
    fs.mkdirSync(logDir);
}

if (!fs.existsSync(logPath)) {
	fs.writeFileSync(logPath);
	fs.appendFileSync(logPath, "------------- Nueva sesion de log -----------------" + '\r\n');
} else {
	fs.appendFileSync(logPath, "------------- Nueva sesion de log -----------------" + '\r\n');
}

utils = {
    log: function (modedebug,mes) {
        if (modedebug == 1 ) {
            util.log(mes);
            fs.appendFileSync(logPath, mes + '\r\n');
        }
    }
};

module.exports=utils;