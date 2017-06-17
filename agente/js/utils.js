/**
 * Created by David Fisher
 */
var util = require ('util');
var fs = require('fs');
var path = require('path');


utils = {
    log: function (modedebug,mes) {
        if (modedebug == 1 ) {
            util.log(mes);
            logMes = (new Date()).toLocaleString() + "  " + mes;
        }
    },
};

module.exports=utils;