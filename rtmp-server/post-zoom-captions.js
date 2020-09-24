import axios from 'axios';

function postZoomCaptions() {
  let seq = 0;
  return async function(captions, streamName) {
    const buff = Buffer.from(streamName, 'base64');
    const decodedCCURL = buff.toString('utf-8');
    try {
      const response = await axios.post(
        `${decodedCCURL}&seq=${seq}&lang=en-US`,
        `${captions}`,
        { headers: { 'Content-Type': 'text/plain' } }
      );
      console.log(captions, ":Sent at ", response.data);
      seq++
    } catch (e) {
      console.log(e)
    }
  }
}

export default postZoomCaptions();