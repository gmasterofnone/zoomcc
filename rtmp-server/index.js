import net from'net';
import AudioStream from'./audio-stream';
import transcoder from'./transcoder';
import recognizeStream from './stt-poc';
import fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';




function rtmpServer() {
  net.createServer(socket => {
    const audioStream = new AudioStream(socket)
    recognizeStream(audioStream)
    // ffmpeg(audioStream)
    //     .inputFormat('aac')
    //     .inputOptions('-loglevel debug')
    //     .outputFormat('flac')
    //     .pipe(fs.createWriteStream('test.flac'))

  }).listen('1935')
};

export default rtmpServer();