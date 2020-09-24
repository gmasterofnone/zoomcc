import axios from "axios";
import infiniteStream from "./translate-speech";

function recognizeSpeech(audioStream) {




  infiniteStream(
    "FLAC",
    44000,
    "en-US",
    295000,
    postZoomCaptions,
    audioStream
  );
}

export default recognizeSpeech;
