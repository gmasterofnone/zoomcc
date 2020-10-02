import net from'net';
import fs from 'fs';
import AudioServer from './audio-server';
import Transcoder from './transcoder';
import Transcriber from './transcriber';
import ZoomClient from './zoom-client';


function rtmpServer() {
  net.createServer(function(socket) {
    const audioStream = new AudioServer(socket)
    audioStream
      .pipe(new Transcoder())
      .pipe(new Transcriber())
      .pipe(new ZoomClient(audioStream))
  }).listen(process.env.RTMP_PORT, () => console.info(`TCP Server listening on port:${process.env.RTMP_PORT}`))};

export default rtmpServer();