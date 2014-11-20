var wsRouter = require("./lib/server.js");
var etherpty = require("./lib/etherpty.js").etherpty;
var config = require("./config/config.json");

exports.etherpty = etherpty;
exports.router = wsRouter;

var argv = require('minimist')(process.argv.slice(2));

var port = argv.p || config.server.port;
var address = argv.a || "0.0.0.0";
var router = etherpty(wsRouter.createServer(port, address));

