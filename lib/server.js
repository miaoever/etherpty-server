var http = require("http");
var express = require('express');
var wsRouter = require("websocket").router;
var wsServer = require("websocket").server;
var config = require('../config/config.json');

var app = express();
app.set ('views', './web/views');
app.set ('view engine', 'ejs');
app.use('/js', express.static('./web/public'));

app.get(function(req, res) {
  res.end();
});
app.get('/:token', function(req, res){
  var proto = config.server.protocol;
  var host = config.server.host;
  var port = config.server.port;
  var url = proto + "://" + host + ":" + port;

  res.render('index.ejs',{"token":req.params.token, "url":url});
});

exports.createServer = function(port, address) {
  var router = require("./monkey_patch_wsRouter")(new wsRouter());
  var httpServer = http.createServer(app);
  address = address || "0.0.0.0";

  httpServer.listen(port, address, function() {
    console.log("Eherpty server is listening on " + address + ":" + port + "...");
  });

  var server = new wsServer({
    httpServer: httpServer,
    autoAcceptConnections: false
  });

  router.attachServer(server);

  return router;
}


