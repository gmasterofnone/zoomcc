import { Duplex } from 'stream';
import { v1p1beta1 as speech } from '@google-cloud/speech';

class Transcriber extends Duplex {
  constructor() {
    super()
    this.reqParams = {
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
  _read() {}
  _write(chunk, encoding, next) {
    if (this.newStream && this.lastAudioInput.length !== 0) {
      // Approximate math to calculate time of chunks
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

//   final() {
//     if (recognizeStream) {
//       recognizeStream.end();
//     }
//   }

  processSpeech(stream) {
    // Convert API result end time from seconds + nanoseconds to milliseconds
    this.resultEndTime =
      stream.results[0].resultEndTime.seconds * 1000 +
      Math.round(stream.results[0].resultEndTime.nanos / 1000000);

    // Calculate correct time based on offset from audio sent twice
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
      // Make sure transcript does not exceed console character length
      if (stdoutText.length > process.stdout.columns) {
        stdoutText =
          stdoutText.substring(0, process.stdout.columns - 4) + '...';
      }
      // process.stdout.write(chalk.red(`${stdoutText}`));

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

    if (!this.lastTranscriptWasFinal) {
      // process.stdout.write('\n');
    }

    this.newStream = true;

    startStream();
  }

  startStream() {
    // Clear current this.audioInput
    this.audioInput = [];
    // Initiate (Reinitiate) a recognize stream
    this.speechClient = new speech.SpeechClient()
    this.recognizeStream = this.speechClient.streamingRecognize(this.reqParams)
    .on('error', err => {
      if (err.code === 11) {
        // restartStream();
      } else {
        console.error('API request error ' + err);
      }
    })
    .on('data', data => this.processSpeech(data));

    // Restart stream when this.streamingLimit expires
    setTimeout(this.restartStream, this.streamingLimit);
  }
}

export default Transcriber;