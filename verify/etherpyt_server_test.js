var request = require("supertest")
  , expect = require("chai").expect
  , http = require("http")
  , monkey_patch_wsConnection = require("../lib/monkey_patch_wsConnection")
  , wsClient = require("websocket").client
  , wsRouter = require("../").router
  , etherpty = require("../").etherpty;


describe("Implement the etherpty server.", function() {
  var masterMeta;
  var masterIO;
  var clientMeta;
  var clientIO;
  var router;
  var token;

  router = etherpty(wsRouter.createServer(8081));
  
  beforeEach(function() {
    masterMeta = new wsClient();
    masterIO = new wsClient();
    clientMeta = new wsClient();
    clientIO = new wsClient();
  })

  it("responds with the share and join request.", function(done) {
    var count = 0;
    masterMeta.connect('ws://localhost:8081/pty/meta/0', 'etherpty-protocol');
    masterMeta.on("connect", function(connection) {
      var meta = monkey_patch_wsConnection(connection, "meta");
      
      meta.sendMessage({type:"share"});
      meta.on("share", function(data) {
        expect(data).to.have.property("token");
        token = data.token;
        clientMeta.connect('ws://localhost:8081/pty/meta/' + token, 'etherpty-protocol');
        clientMeta.on("connect", function(connection) {
          var meta = monkey_patch_wsConnection(connection, "meta");

          meta.sendMessage({type:"join", token:token});

          meta.on("error", function(data){
          });

          meta.on("join", function(data) {
              expect(data).to.have.property("token");
              expect(data.token).to.be.equal(token);
              count ++;
              if (count === 2) done();

              clientIO.connect('ws://localhost:8081/pty/io/client/' + data.token, 'etherpty-protocol');
              clientIO.on("connect", function(connection) {
              });
          });
        });
      });

      meta.on("start", function(data) {
        //build the io connection
        masterIO.connect('ws://localhost:8081/pty/io/master/' + data.token, 'etherpty-protocol');
        masterIO.on("connect", function(connection) {
          var io = monkey_patch_wsConnection(connection, "io");
          io.send("message from the master."); 
          count ++;
          if (count === 2) done();
        });
      });
    });
  });
  
/*
  it("responds with the join request.", function(done) {
    clientMeta.connect('ws://localhost:8081/pty/meta/' + token, 'etherpty-protocol');
    clientMeta.on("connect", function(connection) {
      var meta = monkey_patch_wsConnection(connection, "meta");
      
      meta.sendMessage({type:"join", token:token});

      meta.on("error", function(data){
      });

      meta.on("join", function(data) {
        expect(data).to.have.property("token");
        expect(data.token).to.be.equal(token);
        clientIO.connect('ws://localhost:8081/pty/io/client/' + data.token, 'etherpty-protocol');
        clientIO.on("connect", function(connection) {
          done()
        });
      });
    });
  });
*/

  it("responds error when join with error token.", function(done) {
    clientMeta.connect('ws://localhost:8081/pty/meta/noToken', 'etherpty-protocol');
    clientMeta.on("connect", function(connection) {
      var meta = monkey_patch_wsConnection(connection, "meta");

      meta.sendMessage({type:"join", token:"noToken"});

      meta.on("error", function(data){
        expect(data).to.have.property("message");
        done();
      });

      meta.on("join", function(data) {
      });
    });
  });

  it("the clients should recive the broadcast message from the master.", function(done) {
    masterMeta.connect('ws://localhost:8081/pty/meta/0', 'etherpty-protocol');
    masterMeta.on("connect", function(connection) {
      var meta = monkey_patch_wsConnection(connection, "meta");
      
      meta.sendMessage({type:"share"});
      meta.on("share", function(data) {
        expect(data).to.have.property("token");
        token = data.token;
        clientMeta.connect('ws://localhost:8081/pty/meta/' + token, 'etherpty-protocol');
        clientMeta.on("connect", function(connection) {
          var meta = monkey_patch_wsConnection(connection, "meta");

          meta.sendMessage({type:"join", token:token});

          meta.on("error", function(data){
          });

          meta.on("join", function(data) {
            expect(data.token).to.be.equal(token);
            clientIO.connect('ws://localhost:8081/pty/io/client/' + data.token, 'etherpty-protocol');
            clientIO.on("connect", function(connection) {
              var io = connection;
              io.on("message", function(data) {
                expect(data.utf8Data).to.be.equal("message from the master.")
                done();
              });
            });
          });
        });
      });

      meta.on("start", function(data) {
        //build the io connection
        masterIO.connect('ws://localhost:8081/pty/io/master/' + data.token, 'etherpty-protocol');
        masterIO.on("connect", function(connection) {
          var io = monkey_patch_wsConnection(connection, "io");
          io.send("message from the master."); 
          //done();
        });
      });
    });
  });
});

