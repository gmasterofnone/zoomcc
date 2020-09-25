import { Readable } from'stream';

class ConnectionBuffer extends Readable {
  constructor() {
    super();
  }

  _read(){}

  init(gFun) {
    this.totalBufferLength = 0;
    this.needBufferLength = 0;
    this.gFun = gFun;
    this.gFun.next();
  }

  push(buf) {
    super.push(buf);
    this.totalBufferLength += buf.length;
    if (this.needBufferLength > 0 && this.needBufferLength <= this.totalBufferLength) {
      this.gFun.next();
    }
  }

  read(size) {
    this.totalBufferLength -= size;
    return super.read(size);
  }

  need(size) {
    const ret = this.totalBufferLength < size;
    if (ret) {
      this.needBufferLength = size;
    }
    return ret;
  }
}

export default ConnectionBuffer;

