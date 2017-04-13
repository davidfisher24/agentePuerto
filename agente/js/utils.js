/**
 * Created by David Fisher
 */
var util = require ('util');

utils = {
    log: function (modedebug,mes) {
        if (modedebug == 1 ) {
            util.log(mes);
        }
    }
};

module.exports=utils;