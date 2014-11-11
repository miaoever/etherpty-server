var http = require("http");
var wsRouter = require("websocket").router;
var wsServer = require("websocket").server;
var router = require("./monkey_patch_wsRouter")(new wsRouter());
var monkey_patch_wsConnection = require("./monkey_patch_wsConnection");

router.addListener = function(token, type, connection) {
  router.listeners[token] = router.listeners[token] || {meta:[], io:[]};
  router.listeners[token][type].push(connection);
  console.log(router.listeners[token][type].length);
  return router;
}

router.deleteListener = function(token, type) {
  if (router.listeners[token] && router.listener[token][type]) {
    delete router.listeners[token][type];
  }
  return router;
}

router.deleteAll = function(token) {
  if (router.listeners[token]) delete router.listeners[token];
  return router;
}

router.broadcast = function(token, type, message) {
  var listeners = router.listeners[token][type];
  for (var i = 0; i < listeners.length; i++) {
    listeners[i].sendUTF(message);
  }
}

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

  return router;
}

exports.mountRouter = function(router) {
  router.mount("/pty/io/:token", "etherpty-protocol", function(request) {
    var connection = monkey_patch_wsConnection(request.accept('etherpty-protocol', request.origin));

  });

  router.mount("pty/meta/:token", "etherpty-protocol", function(request) {
    var connection = monkey_patch_wsConnection(request.accept('etherpty-protocol', request.origin));

    connection.on("share", function(data){
    });

    connection.on("join", function(data){
      if (!data.token || !router.listeners[data.token]) connection.emit("error");
      router.addListeners(data.token);
    });

    connection.on("error", function(data){
    });

    connection.on("exit", function(data){
    });
  });

  return router;
}

