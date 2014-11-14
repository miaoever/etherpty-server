var wsRouter = require("./server");
var uuid = require("node-uuid");
var monkey_patch_wsConnection = require("./monkey_patch_wsConnection");

exports.etherpty = function(router) {

  router.mount("/pty/io/master/:token", "etherpty-protocol", function(request) {
    var io = monkey_patch_wsConnection(request.accept('etherpty-protocol', request.origin), "io");
    var data = {
            token : request.params.token,
            channel: "io"
    }
    router.addMaster(data, io);
    var listener = router.listeners[data.token];

    io.on("message", function(message) {
      var message = message.utf8Data; 
      router.broadcast(data, message);
    });
  });

  router.mount("/pty/io/client/:token", "etherpty-protocol", function(request) {
    var io = monkey_patch_wsConnection(request.accept('etherpty-protocol', request.origin), "io");
    var data = {
            token : request.params.token,
            channel: "io"
    }
    var listener = router.listeners[data.token];
    router.addListener(data, io);
    
    if (listener.io.length === 1) listener.master.meta.sendMessage({type:"start", token:data.token});

    io.on("message", function(data){
    });

  });

  router.mount("/pty/meta/:token", "etherpty-protocol", function(request) {
    var meta = monkey_patch_wsConnection(request.accept('etherpty-protocol', request.origin), "meta");

    meta.on("share", function(data){
      meta.from = "master";
      var token = uuid.v4().replace(/-/g, "");
      data.token = token;
      request.params.token = token;
      router.addMaster(data, meta); 
      meta.sendMessage({type:"share", token:token});
    });

    meta.on("join", function(data){
      if (!data.token || !router.listeners[data.token]) meta.emit("error", "no such shared terminal");

      meta.from = "client";
      router.addListener(data, meta);
      //notify the client to open the io connection.
      meta.sendMessage({type:"join", token:data.token});
    });

    meta.on("error", function(data){
      meta.sendMessage({type:"error", message:data});
      meta.close();
    });

    meta.on("exit", function(data){
      meta.close();
    });

    meta.on("close", function(){
      var data = {
              token : request.params.token,
              channel: "meta"
      }
      switch (meta.from) {
        case "master":
          meta.broadcast(data, JSON.stringify({type:"exit", token:token}));
          meta.close();
          router.deleteAll({token:data.token});
          break;
        case "client":
          meta.close();
      }
    });
  });

  return router;
}

