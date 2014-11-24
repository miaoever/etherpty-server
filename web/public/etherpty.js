var etherpty = function(channel) {
  this.channel = channel;
  this.events = {};
}

etherpty.prototype.connect = function(url, protocol) {
  var ws_ctor = window['MozWebSocket'] ? window['MozWebSocket'] : window['WebSocket'];
  this.socket = new ws_ctor(url, protocol);
  this.socket.onmessage = this.channel === "meta" ? this.onMetaMessage.bind(this)
                                                   : this.onIOMessage.bind(this);
  this.socket.onopen = this.onOpen.bind(this); 
  this.socket.onclose = this.onClose.bind(this);
  this.socket.onerror = this.onError.bind(this);
}

etherpty.prototype.onOpen = function() {
  this.emit("connect", this);
}

etherpty.prototype.onError = function(err) {
  this.emit("error", err);
}

etherpty.prototype.onClose = function() {
  this.emit("close");
}

etherpty.prototype.onMetaMessage = function(data) {
  try {
    data = JSON.parse(data.data);
  } catch (_err) {
    return console.log(_err.message);
  }
  if (!data) return;
  msgType = data.type;
  delete data.type; 
  this.emit(msgType, data);
  this.emit("message", data);
}

etherpty.prototype.onIOMessage = function(data) {
  this.emit("message", data);
}

etherpty.prototype.on = function(event, cb) {
  this.events[event] = cb;
}

etherpty.prototype.close = function(opt) {
  this.socket.close();
}

etherpty.prototype.emit = function(event, data) {
  if (typeof this.events[event] === "function")
    this.events[event].call(this, data);
}

etherpty.prototype.send = function(data) {
  this.socket.send(data);
}

etherpty.prototype.sendMessage = function(data) {
  this.socket.send(JSON.stringify(data));
}
