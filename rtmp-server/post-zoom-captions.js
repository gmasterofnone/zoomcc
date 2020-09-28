import { Writable } from 'stream';
import axios from 'axios';

class ZoomClient extends Writable {
  constructor(audioStream) {
    super()
    this.sequence = 0;
    this.audioStream = audioStream
  }

  async _write(chunk, encoding, next) {
    const buff = Buffer.from(this.audioStream.streamName, 'base64');
    const decodedCCURL = buff.toString('utf-8');
    const caption = chunk.toString('utf-8');

    try {
      const response = await axios.post(
        `${decodedCCURL}&seq=${this.sequence}&lang=en-US`,
        `${caption}`,
        { headers: { 'Content-Type': 'text/plain' } }
      );
      console.log(caption, ":Sent at ", response.data);
      this.sequence++
    } catch (e) {
      console.log(e)
    }
  }
}

export default ZoomClient;