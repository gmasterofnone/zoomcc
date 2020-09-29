import { Writable } from 'stream';
import axios from 'axios';

class ZoomClient extends Writable {
  constructor(audioStream) {
    super()
    this.sequence = 0;
    this.audioStream = audioStream;
  }

  async postCaption(url, caption) {
    try {
      const response = await axios.post(
        `${url}&seq=${this.sequence}&lang=en-US`,
        `${caption}`,
        { headers: { 'Content-Type': 'text/plain' } }
      );
      console.log(caption, ":Sent at:",response.data);
      this.sequence++
    } catch (e) {
      console.log(e)
    }
  }

  _write(chunk, encoding, next) {
    const buff = Buffer.from(this.audioStream.streamName, 'base64');
    const decodedCCURL = buff.toString('utf-8');
    const caption = chunk.toString('utf-8');
    this.postCaption(decodedCCURL, caption);
    next();
  }
}

export default ZoomClient;