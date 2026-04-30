const KEY = 'football-tactics-board-recents';

export const localStore = {
  getRecents() {
    try {
      return JSON.parse(localStorage.getItem(KEY) || '[]');
    } catch { return []; }
  },

  addRecent({ id, title, sport, createdAt }) {
    const recents = this.getRecents().filter(r => r.id !== id);
    recents.unshift({ id, title, sport, createdAt });
    localStorage.setItem(KEY, JSON.stringify(recents.slice(0, 20)));
  },

  removeRecent(id) {
    const recents = this.getRecents().filter(r => r.id !== id);
    localStorage.setItem(KEY, JSON.stringify(recents));
  },
};
