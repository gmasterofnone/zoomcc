import { spawn } from 'child_process';
import { Duplex, PassThrough } from 'stream';
class Transcoder extends Duplex {
  constructor() {
    super()
    this._reader = new PassThrough();
    this._writer = new PassThrough();
    this._onError = this.emit.bind(this, 'error');
    this._reader.on('error', this.onError);
    this._writer.on('error', this.onError);
    this._readableState = this._reader._readableState;
    this._writableState = this._writer._writableState;
    this.args = ['-loglevel', 'quiet', '-f', 'aac', '-i', 'pipe:0', '-f', 'flac', 'pipe:1'];
    this.delegateEvents = { readable: '_reader', data: '_reader', end: '_reader', drain: '_writer', finish: '_writer' };
    this.eventMethods = ['on', 'once', 'removeListener', 'removeListeners', 'listeners'];
    this.destroy = this.kill = this.noop;
    this.init();
    this.spawn();
  }

  init() {
    this.eventMethods.forEach(function (method) {
      var og = Duplex.prototype[method]

      Transcoder.prototype[method] = function (ev, fn) {
        var substream = this.delegateEvents[ev]
        if (substream)
          return this[substream][method](ev, fn)
        else
          return og.call(this, ev, fn)
      }
    })
  }

  spawn(){
    this._process = spawn('ffmpeg', this.args)
    this._stdin = this._process.stdin
    this._stdout = this._process.stdout
    this._stderr = this._process.stderr
    this._writer.pipe(this._stdin)
    this._stdout.pipe(this._reader, { end: false })
    this.kill = this.destroy = kill

    const stderr = []
    this._stderr.on('data', onStderrData);
    this._stdin.on('error', this.noop);
    this._stdout.on('error', this.noop);
    this._stdout.on('end', onStdoutEnd);
    this._process.once('close', onExit)
    this._process.once('error', this.onError)

    let ex
    let exited
    let killed
    let ended

    return this

    function onStdoutEnd() {
      if (exited && !ended) {
        ended = true;
        this._reader.end(this.emit.bind(this, 'close'));
      }
    }

    function onStderrData(chunk) {
      stderr.push(chunk)
    }

    function onExit(code, signal) {
      if (exited || exited === null)
        return

      exited = true

      if (killed) {

      } else if (ex) {
        this.emit('error', ex)
        this.emit('close')
      } else if (code === 0 && signal == null) {
        onStdoutEnd()
      } else {
        ex = new Error('Command failed: ' + Buffer.concat(stderr).toString('utf8'))
        ex.killed = this._process.killed || killed
        ex.code = code
        ex.signal = signal
        this.emit('error', ex)
        this.emit('close')
      }

      cleanup()
    }

    function kill(cb) {
      this._stdout.destroy()
      this._stderr.destroy()

      killed = true

      try {
        this._process.kill((options && options.killSignal) || 'SIGTERM')
      } catch (e) {
        ex = e
        onExit()
      }
      cb && cb()
    }

    function cleanup() {
      this._process =
      this._stderr =
      this._stdout =
      this._stdin =
      stderr =
      ex =
      exited =
      killed = null

      this.kill =
      this.destroy = noop
    }
  }

  onError(err) {
    ex = err
    this._stdout.destroy()
    this._stderr.destroy()
    onExit()
  }

  addListener() { Transcoder.prototype.on }

  pipe(dest, opts) {
    return this._reader.pipe(dest, opts)
  }

  unpipe(dest) {
    return this._reader.unpipe(dest)
  }

  setEncoding(enc) {
    return this._reader.setEncoding(enc)
  }

  read(size) {
    return this._reader.read(size)
  }

  end(chunk, enc, cb) {
    return this._writer.end(chunk, enc, cb)
  }

  write(chunk, enc, cb) {
    return this._writer.write(chunk, enc, cb)
  }

  noop() {}
}

export default Transcoder;