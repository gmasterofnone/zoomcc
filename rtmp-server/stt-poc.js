import axios from 'axios';
import infiniteStream from './recognize-stream'

function recognizeSpeech(streamName) {
  const buff = Buffer.from(streamName, 'base64');
  const decodedCCURL = buff.toString('utf-8');

  const request = {
    config: {
      encoding: 'FLAC',
      sampleRateHertz: '44000',
      audioChannelCount: 1,
      profanityFilter: true,
      languageCode: 'en-US',
      enableAutomaticPunctuation: true,
      enableSpeakerDiarization: true,
      enableWordConfidence: true,

    },
    interimResults: true,
    model: 'video'
  };

  let seq = 1;

  async function postZoomCaptions(captions) {
    let response;
    try {
      response = await axios.post(
        `${decodedCCURL}&seq=${seq}&lang=en-US`,
        `${captions}`,
        { headers: { 'Content-Type': 'text/plain' } }
      );
      seq++
    } catch (e) {
      console.log(e)
    }
    console.log(captions, ':Sent at ', response.data)
  };


  infiniteStream(
    'FLAC',
    44000,
    'en-US',
    295000,
    postZoomCaptions,
    request,
    streamName
  )
}

export default recognizeSpeech;