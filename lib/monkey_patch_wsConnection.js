var Validation = require('../node_modules/websocket/lib/Validation').Validation;

var patch = {};

patch.processFrame = function(frame) {
  var i;
  var message;

  // Any non-control opcode besides 0x00 (continuation) received in the
  // middle of a fragmented message is illegal.
  if (this.frameQueue.length !== 0 && (frame.opcode > 0x00 && frame.opcode < 0x08)) {
    this.drop(WebSocketConnection.CLOSE_REASON_PROTOCOL_ERROR,
              "Illegal frame opcode 0x" + frame.opcode.toString(16) + " " +
                "received in middle of fragmented message.");
              return;
  }

  switch(frame.opcode) {
    case 0x02: // WebSocketFrame.BINARY_FRAME
      if (this.assembleFragments) {
      if (frame.fin) {
        // Complete single-frame message received
        this.emit('message', {
          type: 'binary',
          binaryData: frame.binaryPayload
        });
      }
      else {
        // beginning of a fragmented message
        this.frameQueue.push(frame);
        this.fragmentationSize = frame.length;
      }
    }
    break;
    case 0x01: // WebSocketFrame.TEXT_FRAME
      if (this.assembleFragments) {
      if (frame.fin) {
        if (!Validation.isValidUTF8(frame.binaryPayload)) {
          this.drop(WebSocketConnection.CLOSE_REASON_INVALID_DATA,
                    "Invalid UTF-8 Data Received");
                    return;
        }
        // Complete single-frame message received
        this.emit('message', {
          type: 'utf8',
          utf8Data: frame.binaryPayload.toString('utf8')
        });
      }
      else {
        // beginning of a fragmented message
        this.frameQueue.push(frame);
        this.fragmentationSize = frame.length;
      }
    }
    break;
    case 0x00: // WebSocketFrame.CONTINUATION
      if (this.assembleFragments) {
      if (this.frameQueue.length === 0) {
        this.drop(WebSocketConnection.CLOSE_REASON_PROTOCOL_ERROR,
                  "Unexpected Continuation Frame");
                  return;
      }

      this.fragmentationSize += frame.length;

      if (this.fragmentationSize > this.maxReceivedMessageSize) {
        this.drop(WebSocketConnection.CLOSE_REASON_MESSAGE_TOO_BIG,
                  "Maximum message size exceeded.");
                  return;
      }

      this.frameQueue.push(frame);

      if (frame.fin) {
        // end of fragmented message, so we process the whole
        // message now.  We also have to decode the utf-8 data
        // for text frames after combining all the fragments.
        var bytesCopied = 0;
        var binaryPayload = new Buffer(this.fragmentationSize);
        var opcode = this.frameQueue[0].opcode;
        this.frameQueue.forEach(function (currentFrame) {
          currentFrame.binaryPayload.copy(binaryPayload, bytesCopied);
          bytesCopied += currentFrame.binaryPayload.length;
        });
        this.frameQueue = [];
        this.fragmentationSize = 0;

        switch (opcode) {
          case 0x02: // WebSocketOpcode.BINARY_FRAME
            this.emit('message', {
            type: 'binary',
            binaryData: binaryPayload
          });
          break;
          case 0x01: // WebSocketOpcode.TEXT_FRAME
            if (!Validation.isValidUTF8(binaryPayload)) {
            this.drop(WebSocketConnection.CLOSE_REASON_INVALID_DATA,
                      "Invalid UTF-8 Data Received");
                      return;
          }
          this.emit('message', {
            type: 'utf8',
            utf8Data: binaryPayload.toString('utf8')
          });
          break;
          default:
            this.drop(WebSocketConnection.CLOSE_REASON_PROTOCOL_ERROR,
                      "Unexpected first opcode in fragmentation sequence: 0x" + opcode.toString(16));
                      return;
        }
      }
    }
    break;
    case 0x09: // WebSocketFrame.PING
      this.pong(frame.binaryPayload);
    break;
    case 0x0A: // WebSocketFrame.PONG
      break;
    case 0x08: // WebSocketFrame.CONNECTION_CLOSE
      debug("Received close frame");
    // FIXME: When possible, use return statements, not else blocks
    if (this.waitingForCloseResponse) {
      // Got response to our request to close the connection.
      // Close is complete, so we just hang up.
      debug("Got close response from peer.  Close sequence complete.");
      this.clearCloseTimer();
      this.waitingForCloseResponse = false;
      this.state = STATE_CLOSED;
      this.socket.end();
    }
    else {
      // Got request from other party to close connection.
      // Send back acknowledgement and then hang up.
      this.state = STATE_CLOSING;
      var respondCloseReasonCode;

      // Make sure the close reason provided is legal according to
      // the protocol spec.  Providing no close status is legal.
      // WebSocketFrame sets closeStatus to -1 by default, so if it
      // is still -1, then no status was provided.
      if (frame.invalidCloseFrameLength) {
        this.closeReasonCode = 1005; // 1005 = No reason provided.
        respondCloseReasonCode = WebSocketConnection.CLOSE_REASON_PROTOCOL_ERROR;
      }
      else if (frame.closeStatus === -1 || validateReceivedCloseReason(frame.closeStatus)) {
        this.closeReasonCode = frame.closeStatus;
        respondCloseReasonCode = WebSocketConnection.CLOSE_REASON_NORMAL;
      }
      else {
        this.closeReasonCode = frame.closeStatus;
        respondCloseReasonCode = WebSocketConnection.CLOSE_REASON_PROTOCOL_ERROR;
      }

      // If there is a textual description in the close frame, extract it.
      if (frame.binaryPayload.length > 1) {
        if (!Validation.isValidUTF8(frame.binaryPayload)) {
          this.drop(WebSocketConnection.CLOSE_REASON_INVALID_DATA,
                    "Invalid UTF-8 Data Received");
                    return;
        }
        this.closeDescription = frame.binaryPayload.toString('utf8');
      }
      else {
        this.closeDescription = WebSocketConnection.CLOSE_DESCRIPTIONS[this.closeReasonCode];
      }
      debug(
        "Remote peer %s requested disconnect, code: %d - %s - close frame payload length: %d",
        this.remoteAddress, this.closeReasonCode,
        this.closeDescription, frame.length
      );
      this.sendCloseFrame(respondCloseReasonCode, null, true);
      this.socket.end();
      this.connected = false;
    }
    break;
    default:
      this.drop(WebSocketConnection.CLOSE_REASON_PROTOCOL_ERROR,
                "Unrecognized Opcode: 0x" + frame.opcode.toString(16));
                break;
  }
};


module.exports = function(connection) {
  var proto = connection.__proto__;
  patch.__proto__ = proto;
  connection.__proto__ = patch;

  return connection;
}
