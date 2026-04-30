export default {
  id: 'soccer',
  label: 'サッカー (11v11)',
  enabled: false,
  field: { width: 105, height: 68, lines: [] },
  pieces: {
    home: { count: 11, color: '#1565c0', labels: ['GK','2','3','4','5','6','7','8','9','10','11'] },
    away: { count: 11, color: '#c62828', labels: ['GK','2','3','4','5','6','7','8','9','10','11'] },
    ball: { enabled: true, color: '#f5f5f5', strokeColor: '#888', radius: 1.2 },
  },
  formations: { default: { home: [], away: [], ball: [52.5, 34] } },
  pieceRadius: 2,
};
