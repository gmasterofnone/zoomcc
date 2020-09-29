import net from'net';
import fs from 'fs';
import AudioServer from './audio-server';
import Transcoder from './transcoder';
import Transcriber from './transcriber';
import ZoomClient from './zoom-client';


function rtmpServer() {
  net.createServer(function(socket) {
    const audioStream = new AudioServer(socket);
    audioStream
      .pipe(new Transcoder())
      .pipe(new Transcriber())
      .pipe(new ZoomClient(audioStream))
  }).listen('1935')
};

export default rtmpServer();