var http = require("http");
var wsRouter = require("websocket").router;
var wsServer = require("websocket").server;
var router = require("./monkey_patch_wsRouter")(new wsRouter());
var monkey_patch_wsConnection = require("./monkey_patch_wsConnection");

router.addListener = function(data, connection) {
  var token = data.token;
  var channel = data.channel;

  if (!token || !channel) throw new Error("token and channel shouldn't be empty.");

  router.listeners[token] = router.listeners[token] || {meta:[], io:[], master:undefined};
  router.listeners[token][channel].push(connection);
  return router;
}

router.deleteListener = function(data) {
  var token = data.token;
  var channel = data.channel;

  if (!token || !channel) throw new Error("token and channel shouldn't be empty.");

  if (router.listeners[token] && router.listeners[token][channel]) {
    delete router.listeners[token][channel];
  }
  return router;
}

router.deleteAll = function(data) {
  var token = data.token;

  if (router.listeners[token]) delete router.listeners[token];
  return router;
}

router.addMaster = function(data, connection) {
  var token = data.token;
  var channel = data.channel;
  router.listeners[token] = {meta:[], io:[], master:{}};
  router.listeners[token].master[channel] = connection;
  return router;
}

router.broadcast = function(data, message) {
  var token = data.token;
  var channel = data.channel;

  if (!token || !channel) throw new Error("token and channel shouldn't be empty.");

  var listeners = router.listeners[token][channel];
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


