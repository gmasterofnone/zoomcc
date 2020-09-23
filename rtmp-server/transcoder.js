const ffmpeg = require('fluent-ffmpeg');

function transcoder(readableStream) {
  return ffmpeg(readableStream)
    .inputFormat('aac')
    .inputOptions('-loglevel debug')
    .outputFormat('flac')
};

module.exports = transcoder;