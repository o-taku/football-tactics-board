import { clamp } from './util.js';

const NS = 'http://www.w3.org/2000/svg';

export class Board {
  constructor(svgEl, sportConfig, { interactive = true } = {}) {
    this.svg = svgEl;
    this.sport = sportConfig;
    this.interactive = interactive;
    this.pieces = [];
    this._listeners = {};
    this._dragging = null;
  }

  init() {
    const { width, height } = this.sport.field;
    this.svg.setAttribute('viewBox', `-2 -1 ${width + 4} ${height + 2}`);
    this.svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    if (this.interactive) this.svg.style.touchAction = 'none';

    const container = this.svg.closest('.board-container');
    if (container) container.style.aspectRatio = `${width + 4}/${height + 2}`;

    this._renderField();
    this._renderPieces();
    if (this.interactive) this._setupDrag();
  }

  _renderField() {
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('class', 'field-lines');

    for (const line of this.sport.field.lines) {
      let el;
      if (line.type === 'rect') {
        el = document.createElementNS(NS, 'rect');
        el.setAttribute('x', line.x); el.setAttribute('y', line.y);
        el.setAttribute('width', line.w); el.setAttribute('height', line.h);
        if (line.style === 'dashed') el.setAttribute('class', 'dashed');
      } else if (line.type === 'goal') {
        el = document.createElementNS(NS, 'rect');
        el.setAttribute('x', line.x); el.setAttribute('y', line.y);
        el.setAttribute('width', line.w); el.setAttribute('height', line.h);
        el.setAttribute('class', 'goal');
      } else if (line.type === 'line') {
        el = document.createElementNS(NS, 'line');
        el.setAttribute('x1', line.x1); el.setAttribute('y1', line.y1);
        el.setAttribute('x2', line.x2); el.setAttribute('y2', line.y2);
      } else if (line.type === 'circle') {
        el = document.createElementNS(NS, 'circle');
        el.setAttribute('cx', line.cx); el.setAttribute('cy', line.cy);
        el.setAttribute('r', line.r);
      } else if (line.type === 'dot') {
        el = document.createElementNS(NS, 'circle');
        el.setAttribute('cx', line.cx); el.setAttribute('cy', line.cy);
        el.setAttribute('r', line.r);
        el.setAttribute('class', 'dot');
      }
      if (el) g.appendChild(el);
    }
    this.svg.appendChild(g);
  }

  _renderPieces() {
    const { home, away, ball } = this.sport.pieces;
    const formation = this.sport.formations.default;
    const r = this.sport.pieceRadius;

    for (let i = 0; i < home.count; i++) {
      const [x, y] = formation.home[i] ?? [5, 5 + i * 3];
      this._makePiece(`h${i + 1}`, 'home', home.labels[i], home.color, null, r, x, y);
    }
    for (let i = 0; i < away.count; i++) {
      const [x, y] = formation.away[i] ?? [45, 5 + i * 3];
      this._makePiece(`a${i + 1}`, 'away', away.labels[i], away.color, null, r, x, y);
    }
    if (ball.enabled) {
      const [bx, by] = formation.ball;
      this._makePiece('ball', 'ball', '', ball.color, ball.strokeColor, ball.radius, bx, by);
    }
  }

  _makePiece(id, team, label, fill, stroke, r, x, y) {
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('class', `piece piece-${team}`);
    g.setAttribute('data-id', id);
    g.setAttribute('transform', `translate(${x},${y})`);

    const circle = document.createElementNS(NS, 'circle');
    circle.setAttribute('r', r);
    circle.setAttribute('fill', fill);
    circle.setAttribute('stroke', stroke || 'rgba(255,255,255,0.9)');
    circle.setAttribute('stroke-width', '0.2');
    g.appendChild(circle);

    if (label) {
      const text = document.createElementNS(NS, 'text');
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dominant-baseline', 'central');
      text.setAttribute('font-size', r * 0.9);
      text.setAttribute('fill', '#fff');
      text.setAttribute('pointer-events', 'none');
      text.textContent = label;
      g.appendChild(text);
    }

    this.svg.appendChild(g);
    this.pieces.push({ id, team, label, fill, el: g, x, y, r });
  }

  _clientToSvg(e) {
    const pt = this.svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    return pt.matrixTransform(this.svg.getScreenCTM().inverse());
  }

  _setupDrag() {
    this.svg.addEventListener('pointerdown', e => {
      const pieceEl = e.target.closest('[data-id]');
      if (!pieceEl) return;
      e.preventDefault();
      pieceEl.setPointerCapture(e.pointerId);
      this._dragging = pieceEl.getAttribute('data-id');
      this.emit('dragstart', { id: this._dragging });
    });

    this.svg.addEventListener('pointermove', e => {
      if (!this._dragging) return;
      e.preventDefault();
      const pt = this._clientToSvg(e);
      const piece = this.pieces.find(p => p.id === this._dragging);
      if (!piece) return;
      const { width, height } = this.sport.field;
      const x = clamp(pt.x, piece.r, width - piece.r);
      const y = clamp(pt.y, piece.r, height - piece.r);
      this._movePiece(piece, x, y);
      this.emit('drag', { id: this._dragging, x, y });
    });

    this.svg.addEventListener('pointerup', () => {
      if (!this._dragging) return;
      this.emit('dragend', { id: this._dragging });
      this._dragging = null;
    });
  }

  _movePiece(piece, x, y) {
    piece.x = x;
    piece.y = y;
    piece.el.setAttribute('transform', `translate(${x.toFixed(1)},${y.toFixed(1)})`);
  }

  setPositions(posArray) {
    posArray.forEach(([x, y], i) => {
      if (this.pieces[i]) this._movePiece(this.pieces[i], x, y);
    });
  }

  getPositions() {
    return this.pieces.map(p => [
      parseFloat(p.x.toFixed(1)),
      parseFloat(p.y.toFixed(1)),
    ]);
  }

  getPiecesConfig() {
    return this.pieces.map(p => ({
      id: p.id,
      team: p.team,
      label: p.label,
      color: p.fill,
    }));
  }

  resetFormation() {
    const { home, away, ball } = this.sport.pieces;
    const formation = this.sport.formations.default;
    for (let i = 0; i < home.count; i++) {
      const piece = this.pieces.find(p => p.id === `h${i + 1}`);
      if (piece && formation.home[i]) this._movePiece(piece, ...formation.home[i]);
    }
    for (let i = 0; i < away.count; i++) {
      const piece = this.pieces.find(p => p.id === `a${i + 1}`);
      if (piece && formation.away[i]) this._movePiece(piece, ...formation.away[i]);
    }
    if (ball.enabled) {
      const ballPiece = this.pieces.find(p => p.id === 'ball');
      if (ballPiece) this._movePiece(ballPiece, ...formation.ball);
    }
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
