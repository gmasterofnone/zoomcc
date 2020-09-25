import EventEmitter from'events';
import AMF from'./amf';
import RTMPBuffer from './rtmp-buffer';
import rtmpParser from './rtmp-parser'
import { Readable } from 'stream';

class RTMPAudioServer extends Readable {
  constructor(socket) {
    super();
    this.socket = socket;
    this.isStarting = false;
    this.inChunkSize = 128;
    this.outChunkSize = 128;
    this.previousChunkMessage = {};
    this.connectCmdObj = null;
    this.isFirstAudioReceived = true;
    this.streamName = '';
    this.bp = new RTMPBuffer();
    this.bp.on('error', () => {});
    this.parser = rtmpParser(this);
    this.codec = {};

    socket.on('data', data => this.bp.push(data));
    socket.on('end', () => this.stop());
    socket.on('error', err => socket.destroy(err));
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
        this.isStarting = false;
        console.log('deleteStream: Zoom stopped stream')
        break;
      case 'publish': {
        console.log('publish: Start Zoom stream')
        this.streamName = cmd.streamName;
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
    }
    this.push(this.createADTSHeader(rtmpBody))
  }
}

export default RTMPAudioServer;