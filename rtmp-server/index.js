import net from'net';
import fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import AudioServer from './audio-server';
import transcoder from './transcoder';
import transcriber from './transcriber';
import postZoomCaptions from './post-zoom-captions';

function rtmpServer() {
  net.createServer(socket => {
    const audioStream = new AudioServer(socket)
    audioStream.pipe(transcoder.stdin)
    const captionCallback = data => console.log(data);
    transcriber(transcoder.stdout, captionCallback)
  }).listen('1935')
};

export default rtmpServer();