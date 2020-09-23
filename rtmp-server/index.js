const net = require('net');
const AudioStream = require('./audio-stream');
const transcoder = require('./transcoder');
const fs = require('fs')

function rtmpServer() {
  net.createServer(socket => {
    const audioStream = new AudioStream(socket)
      .pipe(transcoder)
      // .pipe(fs.createWriteStream('testAudio.flac'))
  }).listen('1935')
};

module.exports = rtmpServer();