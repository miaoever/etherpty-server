var wsRouter = require("websocket").router;
var p2re = require("path-to-regexp");
var WebSocketRouterRequest = require('../node_modules/websocket/lib/WebSocketRouterRequest');


var patch = {};

patch.handleRequest = function(request) {
  var requestedProtocols = request.requestedProtocols;
  if (requestedProtocols.length === 0) {
    requestedProtocols = ['____no_protocol____'];
  }

  // Find a handler with the first requested protocol first
  for (var i=0; i < requestedProtocols.length; i++) {
    var requestedProtocol = requestedProtocols[i].toLocaleLowerCase();

    // find the first handler that can process this request 
    for (var j=0, len=this.handlers.length; j < len; j++) {
      var handler = this.handlers[j];
      var url = request.resourceURL.pathname;
      url = url[0] === '/' ? url.substr(1, url.length -1) : url;
      if (handler.path.test(url)) {
        if (requestedProtocol === handler.protocol ||
            handler.protocol === '*')
          {
            var routerRequest = new WebSocketRouterRequest(request, requestedProtocol);
            var m = handler.path.exec(url);
            var params = this.params4path[handler.pathString];
            routerRequest.params = {};
            for (var i = 0; i <params.length ; i++) {
              routerRequest.params[params[i].name] = m[1+i];
            }

            handler.callback(routerRequest);
            return;
          }
      }
    }
  }   
  // If we get here we were unable to find a suitable handler.
  request.reject(404, "No handler is available for the given request.");
}

//support express-style path
patch.pathToRegExp = function(path) {
    if (typeof(path) === 'string') {
        if (path === '*') {
            path = /^.*$/;
        }
        else {
          var paramNames = [];
          path = path[0] === '/' ? path.substr(1, path.length -1) : path;
          var path = p2re(path, paramNames, {end: false}); // end : false - prefix matching, true - not prefix mathcing
          this.params4path  = this.params4path || {};
          this.params4path[path.toString()] = paramNames;
        }
    }
    return path;
};

module.exports = function (router) {
  var proto = router.__proto__;
  patch.__proto__ = proto;
  router.__proto__ = patch;
  router._requestHandler = router.handleRequest.bind(router);

  return router;
 }

