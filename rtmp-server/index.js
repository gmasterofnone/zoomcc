import net from'net';
import fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import AudioServer from './audio-server';
import transcoder from './transcoder';
import transcriber from './transcriber';
import postZoomCaptions from './post-zoom-captions';

function rtmpServer() {
  net.createServer(socket => {
    const audioStream = new AudioServer(socket);

      audioStream.pipe(transcoder);


    const captionCallback = data => {
      postZoomCaptions(data, audioStream.streamName)
    }
    transcriber(transcoder, captionCallback)
  }).listen('1935')
};

export default rtmpServer();