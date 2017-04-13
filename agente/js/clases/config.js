/**
 * Created by Lola on 11/04/2014.
 */
var fs = require('fs');
var util = require('util');

var config = function() {
    // constructor
}

config.prototype.init = function(file,cb) {
    var self=this;
    fs.readFile(file, function (err, data) {
        if (err) {
            util.log(err);
            cb(-1);
        } else {
            var json = JSON.parse(data);
            for (o in json) {
                self.prototype[o] = json[o];
            }
            cb(0); // no error
        }
    });
}

module.exports = new config();