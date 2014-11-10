var express = require("../")
  , request = require("supertest")
  , expect = require("chai").expect
  , http = require("http")
  , wsClient = require("websocket").client
  , wsServer = require("../lib/server");

describe("websocket server should listens on specific port", function() {
  var client;
  var router;

  router = wsServer.createServer(8080);

  router.mount("/echo", "etherpty-protocol", function(request) {
    var connection = require("../lib/monkey_patch_wsConnection")(request.accept('etherpty-protocol', request.origin));
    connection.on("message", function(message) {
      connection.send("pong");
    });
  })

  router.mount("/pty/io/:token", "etherpty-protocol", function(request) {
    var connection = require("../lib/monkey_patch_wsConnection")(request.accept('etherpty-protocol', request.origin));
    connection.send(request.params.token);
  });

  router.mount("/pty/meta/:token", "etherpty-protocol", function(request) {
    var connection = require("../lib/monkey_patch_wsConnection")(request.accept('etherpty-protocol', request.origin));
    connection.on("join", function(data) {
      connection.send(data);
    });
  });

  beforeEach(function() {
    client = new wsClient();
  })

  it("responds with pong.", function(done) {
    client.on("connect", function(connection) {
      connection.send("ping");
      connection.on("message", function(message) {
        expect(message.utf8Data).to.equal("pong");
        done();
      });
    });
    client.connect('ws://localhost:8080/echo', 'etherpty-protocol');
  });

  it("responds /pty/io/:token with token.", function(done) {
    client.on("connect", function(connection) {
      connection.on("message", function(message) {
        expect(message.utf8Data).to.equal("mytoken");
        done();
      });

    });
    client.connect('ws://localhost:8080/pty/io/mytoken', 'etherpty-protocol');
  });

  it("monkey patch for the connection to listening on specific event.", function(done) {
    client.on("connect", function(connection) {
      connection.send(JSON.stringify({type:"join", token:"mytoken"}))
      connection.on("message", function(message) {
        expect(message.utf8Data).to.equal("mytoken");
        done();
      });

    });
    client.connect('ws://localhost:8080/pty/io/mytoken', 'etherpty-protocol');
  });

})
