const ffmpeg = require('fluent-ffmpeg');

function transcoder() {
  return ffmpeg()
    .inputFormat('aac')
    .inputOptions('-loglevel debug')
    .outputFormat('flac')
};

module.exports = transcoder;