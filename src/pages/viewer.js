import { getSport } from '../sports/index.js';
import { Board } from '../core/board.js';
import { Player } from '../core/player.js';
import { api } from '../core/api.js';
import { localStore } from '../core/storage-local.js';
import { escapeHtml, formatTime } from '../core/util.js';

class ViewerApp {
  constructor() {
    this.board = null;
    this.player = null;
    this.tactic = null;
    this._pollTimer = null;
    this.els = {};
  }

  async init() {
    this.els = {
      svg:         document.getElementById('board-svg'),
      main:        document.getElementById('main-content'),
      errorState:  document.getElementById('error-state'),
      pageTitle:   document.getElementById('page-title'),
      btnPlay:     document.getElementById('btn-play'),
      seekbar:     document.getElementById('seekbar'),
      currentTime: document.getElementById('current-time'),
      totalTime:   document.getElementById('total-time'),
      descSection: document.getElementById('desc-section'),
      shareUrl:    document.getElementById('share-url'),
      commentName: document.getElementById('comment-name'),
      commentBody: document.getElementById('comment-body'),
      btnComment:  document.getElementById('btn-comment'),
      commentList: document.getElementById('comment-list'),
      toast:       document.getElementById('toast'),
    };

    const params = new URLSearchParams(location.search);
    const id = params.get('id');
    if (!id) { this._showError(); return; }

    // Bind events (safe even before content loads)
    document.getElementById('btn-back').addEventListener('click', () => history.back());
    document.getElementById('btn-share').addEventListener('click', () => this._copyUrl());
    document.getElementById('btn-copy').addEventListener('click',  () => this._copyUrl());
    this.els.btnPlay.addEventListener('click',  () => this._togglePlay());
    this.els.seekbar.addEventListener('input',  () => this._onSeek());
    this.els.btnComment.addEventListener('click', () => this._postComment());
    document.querySelectorAll('.speed-btn').forEach(btn => {
      btn.addEventListener('click', () => this._setSpeed(btn));
    });

    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});

    try {
      this.tactic = await api.getTactic(id);
    } catch {
      this._showError();
      return;
    }

    const sport = getSport(this.tactic.sport);
    if (!sport) { this._showError(); return; }

    document.title = `${this.tactic.title} – Tactics Board`;
    this.els.pageTitle.textContent = this.tactic.title;
    this.els.shareUrl.textContent = location.href;

    // Init board
    this.board = new Board(this.els.svg, sport, { interactive: false });
    this.board.init();
    if (this.tactic.frames.length > 0) {
      this.board.setPositions(this.tactic.frames[0].p);
    }

    // Init player
    this.player = new Player(this.board, this.tactic);
    this.els.seekbar.max = this.tactic.duration;
    this.els.seekbar.value = 0;
    this.els.totalTime.textContent = formatTime(this.tactic.duration);

    this.player.on('tick', ({ elapsed }) => {
      this.els.seekbar.value = elapsed;
      this.els.currentTime.textContent = formatTime(elapsed);
    });
    this.player.on('end', () => {
      this.els.btnPlay.textContent = '▶';
    });

    // Description
    if (this.tactic.author || this.tactic.description) {
      const box = document.createElement('div');
      box.className = 'description-box';
      if (this.tactic.author) {
        const a = document.createElement('div');
        a.className = 'description-author';
        a.textContent = this.tactic.author;
        box.appendChild(a);
      }
      if (this.tactic.description) {
        const d = document.createElement('div');
        d.className = 'description-text';
        d.textContent = this.tactic.description;
        box.appendChild(d);
      }
      this.els.descSection.appendChild(box);
    }

    localStore.addRecent({
      id: this.tactic.id,
      title: this.tactic.title,
      sport: this.tactic.sport,
      createdAt: this.tactic.createdAt,
    });

    this.els.main.style.display = '';

    // Load comments + poll
    this._loadComments(id);
    this._pollTimer = setInterval(() => this._loadComments(id), 30000);
    window.addEventListener('focus', () => this._loadComments(id));
  }

  async _loadComments(tacticId) {
    try {
      const { comments } = await api.getComments(tacticId);
      this._renderComments(comments);
    } catch { /* silent */ }
  }

  _renderComments(comments) {
    const list = this.els.commentList;
    if (!comments || comments.length === 0) {
      list.innerHTML = '<div class="empty-state">コメントはまだありません</div>';
      return;
    }
    list.innerHTML = '';
    for (const c of comments) {
      const div = document.createElement('div');
      div.className = 'comment-item';
      const date = new Date(c.createdAt).toLocaleString('ja-JP', {
        month: 'numeric', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
      div.innerHTML = `
        <div class="comment-meta">${escapeHtml(c.name)} · ${date}</div>
        <div class="comment-body">${escapeHtml(c.body)}</div>`;
      list.appendChild(div);
    }
  }

  async _postComment() {
    const body = this.els.commentBody.value.trim();
    if (!body) { this._toast('コメントを入力してください'); return; }

    this.els.btnComment.disabled = true;
    try {
      await api.addComment(this.tactic.id, {
        name: this.els.commentName.value.trim(),
        body,
      });
      this.els.commentBody.value = '';
      await this._loadComments(this.tactic.id);
      this._toast('コメントを投稿しました');
    } catch (err) {
      this._toast(`投稿に失敗しました: ${err.message}`);
    } finally {
      this.els.btnComment.disabled = false;
    }
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

  async _copyUrl() {
    try {
      await navigator.clipboard.writeText(location.href);
      this._toast('URLをコピーしました');
    } catch {
      this._toast('コピーに失敗しました');
    }
  }

  _showError() {
    document.getElementById('error-state').style.display = '';
    document.getElementById('main-content').style.display = 'none';
    document.getElementById('page-title').textContent = 'エラー';
  }

  _toast(msg) {
    const el = this.els.toast;
    el.textContent = msg;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 3000);
  }
}

new ViewerApp().init();
