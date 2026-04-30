import { SPORTS } from '../sports/index.js';
import { localStore } from '../core/storage-local.js';

class HomeApp {
  init() {
    this._renderSports();
    this._renderRecents();
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }

  _renderSports() {
    const container = document.getElementById('sport-list');
    for (const [id, sport] of Object.entries(SPORTS)) {
      if (!sport.enabled) {
        const div = document.createElement('div');
        div.className = 'sport-card disabled';
        div.innerHTML = `
          <span class="sport-icon">⚽</span>
          <div class="sport-info">
            <h3>${sport.label}</h3>
            <p>近日公開</p>
          </div>`;
        container.appendChild(div);
        continue;
      }
      const a = document.createElement('a');
      a.href = `editor.html?sport=${id}`;
      a.className = 'sport-card';
      a.innerHTML = `
        <span class="sport-icon">⚽</span>
        <div class="sport-info">
          <h3>${sport.label}</h3>
          <p>タップして録画を開始</p>
        </div>`;
      container.appendChild(a);
    }
  }

  _renderRecents() {
    const recents = localStore.getRecents();
    if (recents.length === 0) return;

    document.getElementById('recent-label').style.display = '';
    const container = document.getElementById('recent-list');

    for (const r of recents) {
      const a = document.createElement('a');
      a.href = `viewer.html?id=${r.id}`;
      a.className = 'recent-item';
      const date = new Date(r.createdAt).toLocaleDateString('ja-JP', {
        month: 'short', day: 'numeric',
      });
      a.innerHTML = `
        <div>
          <div class="recent-title">${r.title}</div>
          <div class="recent-meta">${r.sport} · ${date}</div>
        </div>
        <span class="recent-arrow">›</span>`;
      container.appendChild(a);
    }
  }
}

new HomeApp().init();
