let seq = 0;
// Make more robust

async function postZoomCaptions(captions) {
  let response;
  try {
    response = await axios.post(
      `${"https://wmcc.zoom.us/closedcaption?id=7023278240&ns=R3JhaGFtIE11bnJvJ3MgUGVyc29uYWwgTWVldGlu&expire=86400&sparams=id%2Cns%2Cexpire&signature=D5wSwa3YLsVj1WnsUaMhvo42nbU4Rflxjigu1NCLv4k.EwEAAAF0u-o8bAABUYAYNWlZaEdjRVlCVWY4VjJOcWYyMVlGQT09QCtTcnpYUDI1Y215MG96b25QMVVzMlJUWnFBL2VvOGxBWDZnbnFSUmtOd3pWODVkNy9rcHZQN0FpNlo2UlBPSXo"}&seq=${seq}&lang=en-US`,
      `${captions}`,
      { headers: { "Content-Type": "text/plain" } }
    );
    seq++;
  } catch (e) {
    console.log(e);
  }
  // console.log(captions, ":Sent at ", response.data);
}

export default postZoomCaptions