const EventEmitter = require('events');
const AMF = require('./amf');
const BufferPool = require('./buffer-pool');
const stream = require('stream');
const Readable = stream.Readable;

class AudioStream extends Readable {
  constructor(socket, readableStream) {
    super();
    this.readableStream = readableStream;
    this.socket = socket;
    this.isStarting = false;
    this.inChunkSize = 128;
    this.outChunkSize = 128;
    this.previousChunkMessage = {};
    this.connectCmdObj = null;
    this.isFirstAudioReceived = true;
    this.publishStreamName = '';

    this.bp = new BufferPool();
    this.bp.on('error', () => {});

    this.parser = parseRtmpMessage(this);

    this.codec = {};

    socket.on('data', data => this.bp.push(data));
    socket.on('end', () => this.stop());
    socket.on('error', err => ocket.destroy(err));
    this.run()
  }

  _read(){}

  run() {
    this.isStarting = true;
    this.bp.init(this.parser);
  }

  stop() {
    console.log('Socket Stopped')
    this.isStarting = false;
    delete this
  }

  getRealChunkSize(rtmpBodySize, chunkSize) {
    var nn = rtmpBodySize + parseInt(rtmpBodySize / chunkSize);
    if (rtmpBodySize % chunkSize) {
      return nn;
    } else {
      return nn - 1;
    }
  }

  createRtmpMessage(rtmpHeader, rtmpBody) {
    var formatTypeID = 0;
    var rtmpBodySize = rtmpBody.length;
    if (rtmpHeader.chunkStreamID == null) {
      console.warn("[rtmp] warning: createRtmpMessage(): chunkStreamID is not set for RTMP" +
        " message");
    }
    if (rtmpHeader.timestamp == null) {
      console.warn("[rtmp] warning: createRtmpMessage(): timestamp is not set for RTMP message");
    }
    if (rtmpHeader.messageTypeID == null) {
      console.warn("[rtmp] warning: createRtmpMessage(): messageTypeID is not set for RTMP" +
        " message");
    }
    if (rtmpHeader.messageStreamID == null) {
      console.warn("[rtmp] warning: createRtmpMessage(): messageStreamID is not set for RTMP" +
        " message");
    }

    var useExtendedTimestamp = false;
    var timestamp;

    if (rtmpHeader.timestamp >= 0xffffff) {
      useExtendedTimestamp = true;
      timestamp = [0xff, 0xff, 0xff];
    } else {
      timestamp = [(rtmpHeader.timestamp >> 16) & 0xff, (rtmpHeader.timestamp >> 8) & 0xff, rtmpHeader.timestamp & 0xff];
    }

    var bufs = Buffer.from([(formatTypeID << 6) | rtmpHeader.chunkStreamID, timestamp[0], timestamp[1], timestamp[2], (rtmpBodySize >> 16) & 0xff, (rtmpBodySize >> 8) & 0xff, rtmpBodySize & 0xff, rtmpHeader.messageTypeID, rtmpHeader.messageStreamID & 0xff, (rtmpHeader.messageStreamID >>> 8) & 0xff, (rtmpHeader.messageStreamID >>> 16) & 0xff, (rtmpHeader.messageStreamID >>> 24) & 0xff]);

    if (useExtendedTimestamp) {
      var extendedTimestamp = Buffer.from([(rtmpHeader.timestamp >> 24) & 0xff, (rtmpHeader.timestamp >> 16) & 0xff, (rtmpHeader.timestamp >> 8) & 0xff, rtmpHeader.timestamp & 0xff]);
      bufs = Buffer.concat([bufs, extendedTimestamp]);
    }


    var rtmpBodyPos = 0;
    var chunkBodySize = this.getRealChunkSize(rtmpBodySize, this.outChunkSize);
    var chunkBody = [];
    var type3Header = Buffer.from([(3 << 6) | rtmpHeader.chunkStreamID]);

    do {
      if (rtmpBodySize > this.outChunkSize) {
        chunkBody.push(rtmpBody.slice(rtmpBodyPos, rtmpBodyPos + this.outChunkSize));
        rtmpBodySize -= this.outChunkSize
        rtmpBodyPos += this.outChunkSize;
        chunkBody.push(type3Header);
      } else {
        chunkBody.push(rtmpBody.slice(rtmpBodyPos, rtmpBodyPos + rtmpBodySize));
        rtmpBodySize -= rtmpBodySize;
        rtmpBodyPos += rtmpBodySize;
      }

    } while (rtmpBodySize > 0)
    var chunkBodyBuffer = Buffer.concat(chunkBody);
    bufs = Buffer.concat([bufs, chunkBodyBuffer]);
    return bufs;
  }

  handleRtmpMessage(rtmpHeader, rtmpBody) {
    switch (rtmpHeader.messageTypeID) {
      case 0x01:
        this.inChunkSize = rtmpBody.readUInt32BE(0);
        // console.log('[rtmp handleRtmpMessage] Set In chunkSize:' + this.inChunkSize);
        break;
      case 0x08:
        this.parseAudioMessage(rtmpHeader, rtmpBody);
        break;
      case 0x11:
        //AMF3 Command
        var cmd = AMF.decodeAmf0Cmd(rtmpBody.slice(1));
        this.handleAMFCommandMessage(cmd, this);
        break;
      case 0x14:
        //AMF0 Command
        var cmd = AMF.decodeAmf0Cmd(rtmpBody);
        this.handleAMFCommandMessage(cmd, this);
        break;
    }
  }


  handleAMFCommandMessage(cmd) {
    switch (cmd.cmd) {
      case 'connect': {
        this.connectCmdObj = cmd.cmdObj;
        this.app = this.connectCmdObj.app;
        this.respondConnect();
        console.log('Handshake(S2): Ack sent')
        console.log('Handshake: Done')
        break;
      }
      case 'createStream':
        console.log('createStream: Create Zoom stream')

        this.respondCreateStream(cmd);
        break;
      case 'deleteStream':
        console.log('deleteStream: Zoom stopped stream')
        this.deleteStream();
        break;
      case 'publish': {
        console.log(`publish: Start Zoom stream: ${cmd.streamName}`)

        const streamName = this.connectCmdObj.app + '/' + cmd.streamName;
        this.publishStreamName = streamName;
        this.respondPublish();
        break;
      }
      default:
        return;
    }
  }

  respondConnect() {
    var rtmpHeader = {
      chunkStreamID: 3,
      timestamp: 0,
      messageTypeID: 0x14,
      messageStreamID: 0
    };
    var opt = {
      cmd: '_result',
      transId: 1,
      cmdObj: {
        fmsVer: 'FMS/3,0,1,123',
        capabilities: 31
      },
      info: {
        level: 'status',
        code: 'NetConnection.Connect.Success',
        description: 'Connection succeeded.',
        objectEncoding: this.objectEncoding
      }
    };
    var rtmpBody = AMF.encodeAmf0Cmd(opt);
    var rtmpMessage = this.createRtmpMessage(rtmpHeader, rtmpBody);
    this.socket.write(rtmpMessage);
  }

  respondCreateStream(cmd) {
    var rtmpHeader = {
      chunkStreamID: 3,
      timestamp: 0,
      messageTypeID: 0x14,
      messageStreamID: 0
    };
    var opt = {
      cmd: "_result",
      transId: cmd.transId,
      cmdObj: null,
      info: 1

    };
    var rtmpBody = AMF.encodeAmf0Cmd(opt);
    var rtmpMessage = this.createRtmpMessage(rtmpHeader, rtmpBody);
    this.socket.write(rtmpMessage);
  }

  respondPublish() {
    var rtmpHeader = {
      chunkStreamID: 5,
      timestamp: 0,
      messageTypeID: 0x14,
      messageStreamID: 1
    };
    var opt = {
      cmd: 'onStatus',
      transId: 0,
      cmdObj: null,
      info: {
        level: 'status',
        code: 'NetStream.Publish.Start',
        description: 'Start publishing'
      }
    };
    var rtmpBody = AMF.encodeAmf0Cmd(opt);
    var rtmpMessage = this.createRtmpMessage(rtmpHeader, rtmpBody);
    this.socket.write(rtmpMessage);
  }

  createADTSHeader(rtmpBody) {
    const chanCfg = 2;
    const frame_length = rtmpBody.length - 2 + 7;
    const audioBuffer = Buffer.alloc(frame_length);

    audioBuffer[0] = 0xFF;
    audioBuffer[1] = 0xF9;
    audioBuffer[2] = ((this.codec.profile - 1) << 6) + (this.codec.sample_rate << 2) + (chanCfg >> 2);
    audioBuffer[3] = (chanCfg << 6) + (frame_length >> 11);
    audioBuffer[4] = ((frame_length&0x7FF) >> 3);
    audioBuffer[5] = (((frame_length&7)<<5) + 0x1F);
    audioBuffer[6] = 0xFC;
    rtmpBody.copy(audioBuffer, 7, 2, rtmpBody.length);

    return audioBuffer
}

  parseAudioMessage(rtmpHeader, rtmpBody) {
    if (this.isFirstAudioReceived) {
      this.codec.channels = (rtmpBody[3] >> 3) & 0x0f;
      this.codec.sample_rate = ((rtmpBody[2] << 1) & 0x0e) | ((rtmpBody[3] >> 7) & 0x01);
      this.codec.profile = (rtmpBody[2] >> 3) & 0x1f;
      this.isFirstAudioReceived = false;
      console.log(this.codec)
    }
    this.push(this.createADTSHeader(rtmpBody))
  }
}

module.exports = AudioStream;


/* local helpers */

function *parseRtmpMessage(self) {
  // console.log("rtmp handshake [start]");
  if (self.bp.need(1537)) {
    yield;
  }
  var c0c1 = self.bp.read(1537);
  var clientType = c0c1.slice(0, 1);
  var clientsig = c0c1.slice(1);
  console.log('Handshake(C0, C1): Uninitialized')

  var s0s1s2 = Buffer.concat([clientType, clientsig, clientsig])
  self.socket.write(s0s1s2);
  console.log('Handshake(S0, S1): Uninitialized')

  if (self.bp.need(1536)) {
    yield;
  }
  var c2 = self.bp.read(1536);
  console.log('Handshake(C2): Ack recieved')

  while (self.isStarting) {
    var message = {};
    var chunkMessageHeader = null;
    var previousChunk = null;
    if (self.bp.need(1)) {
      yield;
    }
    var chunkBasicHeader = self.bp.read(1);
    message.formatType = chunkBasicHeader[0] >> 6;
    message.chunkStreamID = chunkBasicHeader[0] & 0x3F;
    if (message.chunkStreamID == 0) {
      if (self.bp.need(1)) {
        yield;
      }
      var exStreamID = self.bp.read(1);
      message.chunkStreamID = exStreamID[0] + 64;
    } else if (message.chunkStreamID == 1) {
      if (self.bp.need(2)) {
        yield;
      }
      var exStreamID = self.bp.read(2);
      message.chunkStreamID = (exStreamID[0] << 8) + exStreamID[1] + 64;
    }

    if (message.formatType == 0) {
      // Type 0 (11 bytes)
      if (self.bp.need(11)) {
        yield;
      }
      chunkMessageHeader = self.bp.read(11);
      message.timestamp = chunkMessageHeader.readIntBE(0, 3);
      message.timestampDelta = 0;
      message.messageLength = chunkMessageHeader.readIntBE(3, 3);
      message.messageTypeID = chunkMessageHeader[6];
      message.messageStreamID = chunkMessageHeader.readInt32LE(7);
    } else if (message.formatType == 1) {
      // Type 1 (7 bytes)
      if (self.bp.need(7)) {
        yield;
      }
      chunkMessageHeader = self.bp.read(7);
      message.timestampDelta = chunkMessageHeader.readIntBE(0, 3);
      message.messageLength = chunkMessageHeader.readIntBE(3, 3);
      message.messageTypeID = chunkMessageHeader[6]
      previousChunk = self.previousChunkMessage[message.chunkStreamID];
      if (previousChunk != null) {
        message.timestamp = previousChunk.timestamp;
        message.messageStreamID = previousChunk.messageStreamID;
      } else {
        throw new Error("Chunk reference error for type 1: previous chunk for id " + message.chunkStreamID + " is not found");
      }
    } else if (message.formatType == 2) {
      // Type 2 (3 bytes)
      if (self.bp.need(3)) {
        yield;
      }
      chunkMessageHeader = self.bp.read(3);
      message.timestampDelta = chunkMessageHeader.readIntBE(0, 3);
      previousChunk = self.previousChunkMessage[message.chunkStreamID];
      if (previousChunk != null) {
        message.timestamp = previousChunk.timestamp
        message.messageStreamID = previousChunk.messageStreamID
        message.messageLength = previousChunk.messageLength
        message.messageTypeID = previousChunk.messageTypeID
      } else {
        throw new Error("Chunk reference error for type 2: previous chunk for id " + message.chunkStreamID + " is not found");
      }
    } else if (message.formatType == 3) {
      // Type 3 (0 byte)
      previousChunk = self.previousChunkMessage[message.chunkStreamID];
      if (previousChunk != null) {
        message.timestamp = previousChunk.timestamp;
        message.messageStreamID = previousChunk.messageStreamID;
        message.messageLength = previousChunk.messageLength;
        message.timestampDelta = previousChunk.timestampDelta;
        message.messageTypeID = previousChunk.messageTypeID;
      } else {
        throw new Error("Chunk reference error for type 3: previous chunk for id " + message.chunkStreamID + " is not found");
      }
    } else {
      throw new Error("Unknown format type: " + message.formatType);
    }

    //Extended Timestamp
    if (message.formatType === 0) {
      if (message.timestamp === 0xffffff) {
        if (self.bp.need(4)) {
          yield;
        }
        var chunkBodyHeader = self.bp.read(4);
        message.timestamp = (chunkBodyHeader[0] * Math.pow(256, 3)) + (chunkBodyHeader[1] << 16) + (chunkBodyHeader[2] << 8) + chunkBodyHeader[3];
      }
    } else if (message.timestampDelta === 0xffffff) {
      if (self.bp.need(4)) {
        yield;
      }
      var chunkBodyHeader = self.bp.read(4);
      message.timestampDelta = (chunkBodyHeader[0] * Math.pow(256, 3)) + (chunkBodyHeader[1] << 16) + (chunkBodyHeader[2] << 8) + chunkBodyHeader[3];
    }


    var rtmpBody = [];
    var rtmpBodySize = message.messageLength;
    var chunkBodySize = self.getRealChunkSize(rtmpBodySize, self.inChunkSize);
    if (self.bp.need(chunkBodySize)) {
      yield;
    }
    var chunkBody = self.bp.read(chunkBodySize);
    var chunkBodyPos = 0;
    do {
      if (rtmpBodySize > self.inChunkSize) {
        rtmpBody.push(chunkBody.slice(chunkBodyPos, chunkBodyPos + self.inChunkSize));
        rtmpBodySize -= self.inChunkSize;
        chunkBodyPos += self.inChunkSize;
        chunkBodyPos++;
      } else {
        rtmpBody.push(chunkBody.slice(chunkBodyPos, chunkBodyPos + rtmpBodySize));
        rtmpBodySize -= rtmpBodySize;
        chunkBodyPos += rtmpBodySize;
      }
    } while (rtmpBodySize > 0);

    message.timestamp += message.timestampDelta;
    self.previousChunkMessage[message.chunkStreamID] = message;
    var rtmpBodyBuf = Buffer.concat(rtmpBody);
    self.handleRtmpMessage(message, rtmpBodyBuf);
  }
}