import axios from 'axios';
const httpClient = axios.create();

const zoomApiHandler = async (method, url, data, config) => {
  try {
    const response = await httpClient[method](url, data, config);
    return response;
  } catch (e) {
    console.error(e);
  }
};

const getAccessToken = code => {
  const config = {
    headers: {
      Authorization: `Basic ${Buffer.from(
        `${process.env.CLIENT_ID}:${process.env.CLIENT_SECRET}`
      ).toString('base64')}`
    }
  };

  return zoomApiHandler(
    'post',
    `https://zoom.us/oauth/token?grant_type=authorization_code&code=${code}&redirect_uri=${process.env.REDIRECT_URL}`,
    null,
    config
  );
};

const enableLiveStream = (meetingId, streamKey, access_token) => {
  return zoomApiHandler(
    'patch',
    `${process.env.ZOOM_API_URL}/v2/meetings/${meetingId}/livestream`,
    {
      stream_url: process.env.RTMP_URL,
      stream_key: streamKey,
      page_url: process.env.REDIRECT_URL
    },
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${access_token}`
      }
    }
  );
};

const startLiveStream = (meetingId, access_token) => {
  return zoomApiHandler(
    'patch',
    `${process.env.ZOOM_API_URL}/v2/meetings/${meetingId}/livestream/status`,
    {
      action: 'start'
    },
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${access_token}`
      }
    }
  );
};

export default { getAccessToken, enableLiveStream, startLiveStream };
