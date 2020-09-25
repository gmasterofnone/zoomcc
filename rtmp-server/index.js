import net from'net';
import fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import RTMPAudioServer from'./audio-stream';
import translateSpeech from './translate-speech';
import postZoomCaptions from './post-zoom-captions';

function rtmpServer() {
  net.createServer(socket => {
    const audioStream = new RTMPAudioServer(socket)
    translateSpeech(audioStream, postZoomCaptions)
  }).listen('1935')
};

export default rtmpServer();