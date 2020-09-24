import net from'net';
import fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import AudioStream from'./audio-stream';
import translateSpeech from './translate-speech';
import postZoomCaptions from './post-zoom-captions';

function rtmpServer() {
  net.createServer(socket => {
    const audioStream = new AudioStream(socket)
    translateSpeech(audioStream, postZoomCaptions)
  }).listen('1935')
};

export default rtmpServer();