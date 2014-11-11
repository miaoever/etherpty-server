var wsServer = require("./server");
var uuid = require("node-uuid");

exports.mountRouter = function(router) {

  router.mount("/pty/io/master/:token", "etherpty-protocol", function(request) {
    var connection = monkey_patch_wsConnection(request.accept('etherpty-protocol', request.origin));
    connection.type = "io";
    var data = {
            token : request.params.token,
            channel: "io"
    }
    router.addMaster(data, connection);

    connection.on("message", function(message) {
      var message = message.utf8Data; 
      router.broadcast(data, message);
    });
    
  });

  router.mount("/pty/io/client/:token", "etherpty-protocol", function(request) {
    var connection = monkey_patch_wsConnection(request.accept('etherpty-protocol', request.origin));
    connection.type = "io";
    var data = {
            token : request.params.token,
            channel: "io"
    }
    router.addListeners(data, connection);

    connection.on("message", function(data){
    });

  });

  router.mount("pty/meta/:token", "etherpty-protocol", function(request) {
    var connection = monkey_patch_wsConnection(request.accept('etherpty-protocol', request.origin));
    connection.type = "meta";

    connection.on("share", function(data){
      var token = uuid.v1().replace(/-/g, "");
      data.token = token;
      router.addMaster(data, connection); 
      connection.sendMessage({type:"share", token:token});
    });

    connection.on("join", function(data){
      if (!data.token || !router.listeners[data.token].meta) connection.emit("error", "no such shared terminal");

      router.addListeners(data, connection);
      //notify the client to open the io connection.
      connection.sendMessage({type:"join", token:data.token});
    });

    connection.on("error", function(data){
      connection.sendMessage({type:"error", message:data});
      connection.close();
    });

    connection.on("exit", function(data){
      connection.close();
    });
  });

  return router;
}

