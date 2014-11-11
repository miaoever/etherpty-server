var request = require("supertest")
  , expect = require("chai").expect
  , http = require("http")
  , wsClient = require("websocket").client
  , wsServer = require("../lib/server")
  , monkey_patch_wsConnection = require("../lib/monkey_patch_wsConnection");

describe("websocket server should listens on specific port", function() {
  var client;
  var router;

  router = wsServer.createServer(8080);

  router.mount("/echo", "etherpty-protocol", function(request) {
    var connection = monkey_patch_wsConnection(request.accept('etherpty-protocol', request.origin));
    connection.on("message", function(message) {
      connection.send("pong");
    });
  })

  router.mount("/pty/io/:token", "etherpty-protocol", function(request) {
    var connection = monkey_patch_wsConnection(request.accept('etherpty-protocol', request.origin));
    connection.send(request.params.token);
  });

  router.mount("/pty/meta/:token", "etherpty-protocol", function(request) {
    var connection = monkey_patch_wsConnection(request.accept('etherpty-protocol', request.origin));
    connection.type = "meta";
    connection.on("share", function(data) {
      connection.send(data.token);
    });

    connection.on("join", function(data) {
      router.addListener(data, connection);
      if (router.listeners[data.token]["meta"].length === 2) {
        router.broadcast(data, "broadcast message.") ;
      }
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

  it("support express-style path, eg: /pty/io/:token ", function(done) {
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
      connection.send(JSON.stringify({type:"share", token:"mytoken"}))
      connection.on("message", function(message) {
        expect(message.utf8Data).to.equal("mytoken");
        done();
      });

    });
    client.connect('ws://localhost:8080/pty/io/mytoken', 'etherpty-protocol');
  });

  it("listeners could be added to the router, and router should broadcast messages to them.", function(done) {
    var client2 = new wsClient();
    var count = 0;

    client.on("connect", function(connection) {
      connection.send(JSON.stringify({type:"join", token:"room1"}));
      connection.on("message", function(message) {
        expect(message.utf8Data).to.equal("broadcast message.");
        count ++;
        if (count == 2) {
          done();
        }
      });
    });

    client2.on("connect", function(connection) {
      connection.send(JSON.stringify({type:"join", token:"room1"}));
      connection.on("message", function(message) {
        expect(message.utf8Data).to.equal("broadcast message.");
        count ++;
        if (count == 2) {
          done();
        }
      });
    });
    client.connect('ws://localhost:8080/pty/meta/mytoken', 'etherpty-protocol');
    client2.connect('ws://localhost:8080/pty/meta/mytoken', 'etherpty-protocol');

  });

})
