import { Duplex } from 'stream';
import { v1p1beta1 as speech } from '@google-cloud/speech';

class Transcriber extends Duplex {
  constructor() {
    super()
    this.params = {
      config: {
        encoding: "FLAC",
        sampleRateHertz: "44000",
        audioChannelCount: 1,
        profanityFilter: true,
        languageCode: "en-US",
        enableAutomaticPunctuation: true,
        enableSpeakerDiarization: true,
        enableWordConfidence: true,
      },
      model: "video",
    };
    this.streamingLimit = 295000;
    this.recognizeStream = null;
    this.restartCounter = 0;
    this.audioInput = [];
    this.lastAudioInput = [];
    this.resultEndTime = 0;
    this.isFinalEndTime = 0;
    this.finalRequestEndTime = 0;
    this.newStream = true;
    this.bridgingOffset = 0;
    this.lastTranscriptWasFinal = false;
    this.startStream();
  }

  _read() { }

  _write(chunk, encoding, next) {
    if (this.newStream && this.lastAudioInput.length !== 0) {
      const chunkTime = this.streamingLimit / this.lastAudioInput.length;
      if (chunkTime !== 0) {
        if (this.bridgingOffset < 0) {
          this.bridgingOffset = 0;
        }
        if (this.bridgingOffset > this.finalRequestEndTime) {
          this.bridgingOffset = this.finalRequestEndTime;
        }
        const chunksFromMS = Math.floor(
          (this.finalRequestEndTime - this.bridgingOffset) / chunkTime
        );
        this.bridgingOffset = Math.floor(
          (this.lastAudioInput.length - chunksFromMS) * chunkTime
        );

        for (let i = chunksFromMS; i < this.lastAudioInput.length; i++) {
          this.recognizeStream.write(this.lastAudioInput[i]);
        }
      }
      this.newStream = false;
    }

    this.audioInput.push(chunk);

    if (this.recognizeStream) {
      this.recognizeStream.write(chunk);
    }

    next();
  }

  processSpeech(stream) {
    this.resultEndTime =
      stream.results[0].resultEndTime.seconds * 1000 +
      Math.round(stream.results[0].resultEndTime.nanos / 1000000);

    const correctedTime =
      this.resultEndTime - this.bridgingOffset + this.streamingLimit * this.restartCounter;

    let stdoutText = '';
    if (stream.results[0] && stream.results[0].alternatives[0]) {
      stdoutText =
        correctedTime + ': ' + stream.results[0].alternatives[0].transcript;
    }

    if (stream.results[0].isFinal) {
      const caption = stream.results[0].alternatives[0].transcript;
      this.push(caption)
      this.isFinalEndTime = this.resultEndTime;
      this.lastTranscriptWasFinal = true;
    } else {
      if (stdoutText.length > process.stdout.columns) {
        stdoutText =
          stdoutText.substring(0, process.stdout.columns - 4) + '...';
      }
      this.lastTranscriptWasFinal = false;
    }
  }

  restartStream() {
    if (this.recognizeStream) {
      recognizeStream.end();
      recognizeStream.removeListener('data', speechCallback);
      recognizeStream = null;
    }
    if (this.resultEndTime > 0) {
      this.finalRequestEndTime = this.isFinalEndTime;
    }
    this.resultEndTime = 0;
    this.lastAudioInput = [];
    this.lastAudioInput = this.audioInput;
    this.restartCounter++;
    this.newStream = true;
    startStream();
  }

  startStream() {
    this.audioInput = [];
    this.speechClient = new speech.SpeechClient()
    this.recognizeStream = this.speechClient.streamingRecognize(this.params)
      .on('error', err => {
        if (err.code === 11) {
          // restartStream();
        } else {
          console.error('API request error ' + err);
        }
      })
      .on('data', data => this.processSpeech(data));
    setTimeout(this.restartStream, this.streamingLimit);
  }
}

export default Transcriber;