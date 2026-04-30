export default {
  id: 'socca',
  label: 'ソサイチ (7v7)',
  enabled: true,
  field: {
    width: 50,
    height: 30,
    lines: [
      { type: 'rect', x: 0, y: 0, w: 50, h: 30 },
      { type: 'line', x1: 25, y1: 0, x2: 25, y2: 30 },
      { type: 'circle', cx: 25, cy: 15, r: 4.5 },
      { type: 'dot', cx: 25, cy: 15, r: 0.4 },
      { type: 'rect', x: 0, y: 5, w: 10, h: 20 },
      { type: 'rect', x: 40, y: 5, w: 10, h: 20 },
      { type: 'rect', x: 0, y: 9, w: 4, h: 12 },
      { type: 'rect', x: 46, y: 9, w: 4, h: 12 },
      { type: 'dot', cx: 7, cy: 15, r: 0.3 },
      { type: 'dot', cx: 43, cy: 15, r: 0.3 },
      { type: 'goal', x: -1.5, y: 10.5, w: 1.5, h: 9 },
      { type: 'goal', x: 50, y: 10.5, w: 1.5, h: 9 },
    ],
  },
  pieces: {
    home: { count: 7, color: '#1565c0', labels: ['GK', '2', '3', '4', '5', '6', '7'] },
    away: { count: 7, color: '#c62828', labels: ['GK', '2', '3', '4', '5', '6', '7'] },
    ball: { enabled: true, color: '#f5f5f5', strokeColor: '#888', radius: 0.8 },
  },
  formations: {
    default: {
      home: [
        [3, 15],
        [9, 10], [9, 20],
        [16, 8], [16, 15], [16, 22],
        [22, 15],
      ],
      away: [
        [47, 15],
        [41, 10], [41, 20],
        [34, 8], [34, 15], [34, 22],
        [28, 15],
      ],
      ball: [25, 15],
    },
  },
  pieceRadius: 1.4,
};
