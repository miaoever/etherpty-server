var http = require("http");
var wsRouter = require("websocket").router;
var wsServer = require("websocket").server;

exports.createServer = function(port, address) {
  var router = require("./monkey_patch_wsRouter")(new wsRouter());
  var httpServer = http.createServer(function(req, res) {
    res.statusCode = 200;
    res.end();
  });
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


