import { spawn } from 'child_process';

function transcoder() {
  const args = ['-loglevel', 'quiet' , '-f', 'aac', '-i', 'pipe:0', '-f', 'flac', 'pipe:1']

	const ffmpeg = spawn('ffmpeg', args);

  return ffmpeg;
}

export default transcoder();