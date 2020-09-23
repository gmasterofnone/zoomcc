import { Router } from 'express';
import htmlStream from '../html';
import zoomApiHandler from '../helpers/ZoomApiHandler';
import axios from 'axios';

const routes = Router();

routes.get('/', async (req, res) => {
  if (req.query.code) {
    return htmlStream(res);
  }
  let url = `https://zoom.us/oauth/authorize?response_type=code&client_id=${process.env.CLIENT_ID}&redirect_uri=${process.env.REDIRECT_URL}`;

  return res.redirect(url);
});



routes.post('/start', async (req, res) => {
  const code = req.headers.referer.match(/code=([^&]*)/)[1];
  const meetingId = req.body.meetingId
  const streamKey = Buffer.from(req.body.closedCaptionURL, 'utf-8').toString('base64');

  const { data: { access_token } } = await zoomApiHandler.getAccessToken(code);
  console.log('ACCESS TOKEN', access_token)

  // async function postZoomCaptions(captions) {
  //   let response;
  //   try {
  //     response = await axios.post(
  //       `${req.body.closedCaptionURL}&seq=${0}&lang=en-US`,
  //       `${captions}`,
  //       { headers: { 'Content-Type': 'text/plain' } }
  //     );
  //   } catch (e) {
  //     console.log(e)
  //   }
  //   console.log('Zoom Startup Caption time:', response.data)
  // };

  await postZoomCaptions('ZOOMCC: Starting live captions...')

  await zoomApiHandler.enableLiveStream(meetingId, streamKey, access_token);

  await zoomApiHandler.startLiveStream(meetingId, access_token);

  res.status(200).end();
});

export default routes;
