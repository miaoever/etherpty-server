var wsRouter = require("./lib/server.js");
var etherpty = require("./lib/etherpty.js").etherpty;

exports.etherpty = etherpty;
exports.router = wsRouter;

var argv = require('minimist')(process.argv.slice(2));
var port = argv.p || "8080";
var address = argv.a || "0.0.0.0";
var router = etherpty(wsRouter.createServer(port, address));

