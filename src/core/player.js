import { lerp } from './util.js';

export class Player {
  constructor(board, recordingJson) {
    this.board = board;
    this.recording = recordingJson;
    this._playing = false;
    this._speed = 1;
    this._elapsed = 0;
    this._startWall = null;
    this._rafId = null;
    this._listeners = {};
  }

  play() {
    if (this._playing) return;
    if (this._elapsed >= this.recording.duration) this._elapsed = 0;
    this._playing = true;
    this._startWall = performance.now() - this._elapsed / this._speed;
    this._loop();
  }

  pause() {
    this._playing = false;
    if (this._rafId) { cancelAnimationFrame(this._rafId); this._rafId = null; }
  }

  seek(ms) {
    const wasPlaying = this._playing;
    this.pause();
    this._elapsed = Math.max(0, Math.min(ms, this.recording.duration));
    this._applyFrame(this._elapsed);
    this.emit('tick', { elapsed: this._elapsed });
    if (wasPlaying) this.play();
  }

  setSpeed(x) {
    const wasPlaying = this._playing;
    if (wasPlaying) this.pause();
    this._speed = x;
    if (wasPlaying) this.play();
  }

  _loop() {
    if (!this._playing) return;
    const elapsed = (performance.now() - this._startWall) * this._speed;
    this._elapsed = Math.min(elapsed, this.recording.duration);
    this._applyFrame(this._elapsed);
    this.emit('tick', { elapsed: this._elapsed });
    if (this._elapsed >= this.recording.duration) {
      this._playing = false;
      this.emit('end', {});
      return;
    }
    this._rafId = requestAnimationFrame(() => this._loop());
  }

  _applyFrame(t) {
    const { frames } = this.recording;
    if (!frames || frames.length === 0) return;
    if (frames.length === 1) { this.board.setPositions(frames[0].p); return; }

    let i = frames.length - 2;
    for (let j = 0; j < frames.length - 1; j++) {
      if (frames[j + 1].t > t) { i = j; break; }
    }

    const f0 = frames[i], f1 = frames[i + 1];
    const alpha = Math.max(0, Math.min(1, (t - f0.t) / (f1.t - f0.t)));
    const interpolated = f0.p.map(([x0, y0], idx) => {
      const [x1, y1] = f1.p[idx];
      return [lerp(x0, x1, alpha), lerp(y0, y1, alpha)];
    });
    this.board.setPositions(interpolated);
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
