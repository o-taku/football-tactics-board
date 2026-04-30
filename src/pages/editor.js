import { getSport } from '../sports/index.js';
import { Board } from '../core/board.js';
import { Recorder } from '../core/recorder.js';
import { Player } from '../core/player.js';
import { api } from '../core/api.js';
import { localStore } from '../core/storage-local.js';
import { sanitizeString, formatTime } from '../core/util.js';

class EditorApp {
  constructor() {
    this.sport = null;
    this.board = null;
    this.recorder = null;
    this.player = null;
    this.recording = null;
    this.els = {};
  }

  init() {
    const params = new URLSearchParams(location.search);
    const sportId = params.get('sport') || 'socca';
    this.sport = getSport(sportId);
    if (!this.sport || !this.sport.enabled) { location.href = '/'; return; }

    document.title = `録画 – ${this.sport.label}`;
    document.getElementById('page-title').textContent = this.sport.label;

    this.els = {
      svg:         document.getElementById('board-svg'),
      btnRecord:   document.getElementById('btn-record'),
      btnReset:    document.getElementById('btn-reset'),
      timer:       document.getElementById('timer'),
      recordPhase: document.getElementById('record-phase'),
      savePhase:   document.getElementById('save-phase'),
      btnPlay:     document.getElementById('btn-play'),
      seekbar:     document.getElementById('seekbar'),
      currentTime: document.getElementById('current-time'),
      totalTime:   document.getElementById('total-time'),
      btnRedo:     document.getElementById('btn-redo'),
      btnSave:     document.getElementById('btn-save'),
      titleInput:  document.getElementById('input-title'),
      descInput:   document.getElementById('input-desc'),
      authorInput: document.getElementById('input-author'),
      toast:       document.getElementById('toast'),
    };

    // Bind all listeners once
    document.getElementById('btn-back').addEventListener('click', () => history.back());
    this.els.btnRecord.addEventListener('click', () => this._toggleRecord());
    this.els.btnReset.addEventListener('click',  () => this._resetFormation());
    this.els.btnPlay.addEventListener('click',   () => this._togglePlay());
    this.els.seekbar.addEventListener('input',   () => this._onSeek());
    this.els.btnRedo.addEventListener('click',   () => this._redo());
    this.els.btnSave.addEventListener('click',   () => this._save());
    document.querySelectorAll('.speed-btn').forEach(btn => {
      btn.addEventListener('click', () => this._setSpeed(btn));
    });

    this._initBoard();
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
  }

  _initBoard() {
    const { svg } = this.els;
    svg.innerHTML = '';
    this.board = new Board(svg, this.sport, { interactive: true });
    this.board.init();
    this.recorder = new Recorder(this.board);

    this.recorder.on('tick', ({ elapsed }) => {
      this.els.timer.textContent = formatTime(elapsed);
    });
    this.recorder.on('stop', () => {
      this.recording = this.recorder.getRecording();
      this.els.btnRecord.classList.remove('recording');
      this.els.btnRecord.textContent = '録画開始';
      this._enterSavePhase();
    });
  }

  _toggleRecord() {
    if (this.recorder.isRecording()) {
      this.recorder.stop();
    } else {
      this.els.timer.textContent = '0:00';
      this.recorder.start();
      this.els.btnRecord.classList.add('recording');
      this.els.btnRecord.textContent = '録画停止';
    }
  }

  _resetFormation() {
    if (!this.recorder.isRecording()) this.board.resetFormation();
  }

  _enterSavePhase() {
    this.els.recordPhase.style.display = 'none';
    this.els.savePhase.style.display = '';

    // Switch board to read-only for preview
    const { svg } = this.els;
    svg.innerHTML = '';
    this.board = new Board(svg, this.sport, { interactive: false });
    this.board.init();
    if (this.recording.frames.length > 0) {
      this.board.setPositions(this.recording.frames[0].p);
    }

    // Init player
    this.player?.pause();
    this.player = new Player(this.board, this.recording);
    this.els.seekbar.max = this.recording.duration;
    this.els.seekbar.value = 0;
    this.els.totalTime.textContent = formatTime(this.recording.duration);
    this.els.currentTime.textContent = '0:00';
    this.els.btnPlay.textContent = '▶';

    this.player.on('tick', ({ elapsed }) => {
      this.els.seekbar.value = elapsed;
      this.els.currentTime.textContent = formatTime(elapsed);
    });
    this.player.on('end', () => {
      this.els.btnPlay.textContent = '▶';
    });
  }

  _togglePlay() {
    if (!this.player) return;
    if (this.player._playing) {
      this.player.pause();
      this.els.btnPlay.textContent = '▶';
    } else {
      this.player.play();
      this.els.btnPlay.textContent = '⏸';
    }
  }

  _onSeek() {
    if (!this.player) return;
    const t = parseInt(this.els.seekbar.value);
    this.player.seek(t);
    this.els.currentTime.textContent = formatTime(t);
  }

  _setSpeed(btn) {
    document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    this.player?.setSpeed(parseFloat(btn.dataset.speed));
  }

  _redo() {
    this.player?.pause();
    const lastPositions = this.recording?.frames.length > 0
      ? this.recording.frames[this.recording.frames.length - 1].p
      : null;
    this.recording = null;
    this.els.savePhase.style.display = 'none';
    this.els.recordPhase.style.display = '';
    this.els.timer.textContent = '0:00';
    this.els.btnRecord.classList.remove('recording');
    this.els.btnRecord.textContent = '録画開始';
    this._initBoard();
    if (lastPositions) {
      this.board.setPositions(lastPositions);
    }
  }

  async _save() {
    const title = this.els.titleInput.value.trim();
    if (!title) { this._toast('タイトルを入力してください'); return; }
    if (!this.recording || this.recording.frames.length < 2) {
      this._toast('録画が短すぎます。もう一度録画してください'); return;
    }

    this.els.btnSave.disabled = true;
    this.els.btnSave.textContent = '保存中...';

    try {
      const data = {
        v: 1,
        sport: this.sport.id,
        title: sanitizeString(title, 100),
        description: sanitizeString(this.els.descInput.value, 1000),
        author: sanitizeString(this.els.authorInput.value, 50),
        pieces: this.board.getPiecesConfig(),
        frames: this.recording.frames,
        duration: this.recording.duration,
        sampleRate: this.recording.sampleRate,
        createdAt: Date.now(),
      };

      const { id, url } = await api.saveTactic(data);
      localStore.addRecent({ id, title: data.title, sport: data.sport, createdAt: data.createdAt });
      location.href = url;
    } catch (err) {
      this._toast(`保存に失敗しました: ${err.message}`);
      this.els.btnSave.disabled = false;
      this.els.btnSave.textContent = '保存して共有 →';
    }
  }

  _toast(msg) {
    const el = this.els.toast;
    el.textContent = msg;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 3000);
  }
}

new EditorApp().init();
