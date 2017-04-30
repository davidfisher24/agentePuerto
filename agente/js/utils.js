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
    fs.writeFileSync(logPath,'');
    fs.appendFileSync(logPath, "------------- Nueva sesion de log -----------------" + '\r\n');
} else {
    fs.appendFileSync(logPath, "------------- Nueva sesion de log -----------------" + '\r\n');
}

utils = {
    log: function (modedebug,mes) {
        if (modedebug == 1 ) {
            util.log(mes);
            logMes = (new Date()).toLocaleString() + "  " + mes;
            fs.appendFileSync(logPath, logMes + '\r\n');
        }
    },

    createPanelLog (panelId) {
        var panelLog = path.join(__dirname, 'log', 'panel'+panelId+'.log');
        if (!fs.existsSync(panelLog)) {
            fs.writeFileSync(panelLog,'');
        }
    },

    panelLog: function(modeDebug,mes,panelId) {
        if (modeDebug == 1 ) {
            util.log(mes);
            logMes = (new Date()).toLocaleString() + "  " + mes;
            var panelLog = path.join(__dirname, 'log', 'panel'+panelId+'.log');
            fs.appendFileSync(panelLog, logMes + '\r\n');
        }
    },
};

module.exports=utils;