var http = require("http");
var wsRouter = require("websocket").router;
var wsServer = require("websocket").server;
var router = require("./monkey_patch_wsRouter")(new wsRouter());

exports.createServer = function(port) {
  var httpServer = http.createServer(function(req, res) {
    res.statusCode = 200;
    res.end();
  });
  httpServer.listen(port, function() {
    console.log("Listening on " + port + "...");
  });

  wsServer = new wsServer({
    httpServer: httpServer,
    autoAcceptConnections: false
  });

  router.attachServer(wsServer);

  /* 
  router.mount("/pty/io/:token", "etherpty-protocol", function(request) {
    var connection = request.accept('etherpty-protocol', request.origin);

  });
  */
  /*
  router.mount("pty/meta/:token", "etherpty-protocol", function(request) {
    var connection = require("monkey_patch_wsConnection")(request.accept('etherpty-protocol', request.origin));

    connection.on("share", function(connection){
    });

    connection.on("join", function(connection){
    });

    connection.on("exit", function(connection){
    });
  });
  */
  return router;
}

