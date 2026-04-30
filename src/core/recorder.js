export class Recorder {
  constructor(board, { sampleRateHz = 20, maxDurationMs = 30000 } = {}) {
    this.board = board;
    this.interval = Math.round(1000 / sampleRateHz);
    this.maxDurationMs = maxDurationMs;
    this.sampleRate = sampleRateHz;
    this._frames = [];
    this._timer = null;
    this._startTime = null;
    this._listeners = {};
  }

  start() {
    if (this._timer) return;
    this._frames = [];
    this._startTime = performance.now();
    this._timer = setInterval(() => {
      const t = Math.round(performance.now() - this._startTime);
      this._frames.push({ t, p: this.board.getPositions() });
      this.emit('tick', { elapsed: t });
      if (t >= this.maxDurationMs) this.stop();
    }, this.interval);
  }

  stop() {
    if (!this._timer) return;
    clearInterval(this._timer);
    this._timer = null;
    const duration = this._frames.length > 0 ? this._frames[this._frames.length - 1].t : 0;
    this.emit('stop', { duration });
  }

  isRecording() {
    return this._timer !== null;
  }

  getRecording() {
    return {
      frames: this._frames,
      duration: this._frames.length > 0 ? this._frames[this._frames.length - 1].t : 0,
      sampleRate: this.sampleRate,
    };
  }

  on(event, cb) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(cb);
    return this;
  }

  emit(event, data) {
    (this._listeners[event] || []).forEach(cb => cb(data));
  }
}
