export default {
  id: 'futsal',
  label: 'フットサル (5v5)',
  enabled: false,
  field: { width: 40, height: 20, lines: [] },
  pieces: {
    home: { count: 5, color: '#1565c0', labels: ['GK','2','3','4','5'] },
    away: { count: 5, color: '#c62828', labels: ['GK','2','3','4','5'] },
    ball: { enabled: true, color: '#f5f5f5', strokeColor: '#888', radius: 0.6 },
  },
  formations: { default: { home: [], away: [], ball: [20, 10] } },
  pieceRadius: 1.2,
};
