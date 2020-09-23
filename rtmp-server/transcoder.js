const ffmpeg = require('fluent-ffmpeg');

function transcoder(arguments) {
  return ffmpeg()
    .inputFormat('aac')
    .inputOptions('-loglevel debug')
    .outputFormat('flac')
};

module.exports = transcoder;