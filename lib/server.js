var http = require("http");
var wsRouter = require("websocket").router;
var wsServer = require("websocket").server;

exports.createServer = function(port) {
  var router = require("./monkey_patch_wsRouter")(new wsRouter());
  var httpServer = http.createServer(function(req, res) {
    res.statusCode = 200;
    res.end();
  });
  httpServer.listen(port, function() {
    console.log("Listening on " + port + "...");
  });

   var server = new wsServer({
    httpServer: httpServer,
    autoAcceptConnections: false
  });

  router.attachServer(server);

  return router;
}


