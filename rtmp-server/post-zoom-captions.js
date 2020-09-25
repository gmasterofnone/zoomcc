import axios from 'axios';

function postZoomCaptions() {
  let seq = 0;
  return async function(caption, streamName) {
    const buff = Buffer.from(streamName, 'base64');
    const decodedCCURL = buff.toString('utf-8');
    try {
      const response = await axios.post(
        `${decodedCCURL}&seq=${seq}&lang=en-US`,
        `${caption}`,
        { headers: { 'Content-Type': 'text/plain' } }
      );
      console.log(caption, ":Sent at ", response.data);
      seq++
    } catch (e) {
      console.log(e)
    }
  }
}

export default postZoomCaptions();