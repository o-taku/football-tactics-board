import { getStore } from '@netlify/blobs';
import { randomUUID } from 'crypto';

const LIMITS = {
  maxDuration: 30000,
  maxFrames: 700,
  maxPieces: 30,
  maxPayloadBytes: 200 * 1024,
  maxTitle: 100,
  maxDescription: 1000,
  maxAuthor: 50,
};

function sanitize(str, maxLen) {
  if (typeof str !== 'string') return '';
  return str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '').trim().slice(0, maxLen);
}

function uid() {
  return randomUUID().replace(/-/g, '').slice(0, 10);
}

function json(status, body, extra = {}) {
  return {
    statusCode: status,
    headers: { 'Content-Type': 'application/json', ...extra },
    body: JSON.stringify(body),
  };
}

export async function handler(event) {
  const method = event.httpMethod;
  const store = getStore('tactics');

  if (method === 'GET') {
    const id = event.queryStringParameters?.id;
    if (!id || !/^[a-z0-9]{10}$/.test(id)) return json(400, { error: 'Invalid id' });

    const data = await store.get(id, { type: 'json' }).catch(() => null);
    if (!data) return json(404, { error: 'Not found' });

    return json(200, data, { 'Cache-Control': 'public, max-age=31536000, immutable' });
  }

  if (method === 'POST') {
    const ct = event.headers?.['content-type'] ?? '';
    if (!ct.includes('application/json')) return json(415, { error: 'Content-Type must be application/json' });

    const bodyLen = Buffer.byteLength(event.body || '', 'utf8');
    if (bodyLen > LIMITS.maxPayloadBytes) return json(413, { error: 'Payload too large' });

    let data;
    try { data = JSON.parse(event.body); }
    catch { return json(400, { error: 'Invalid JSON' }); }

    if (data.v !== 1) return json(400, { error: 'Invalid version' });
    if (!data.title?.trim()) return json(400, { error: 'Title required' });
    if (typeof data.duration !== 'number' || data.duration > LIMITS.maxDuration) {
      return json(400, { error: 'Recording too long (max 30s)' });
    }
    if (!Array.isArray(data.frames) || data.frames.length > LIMITS.maxFrames) {
      return json(400, { error: 'Too many frames' });
    }
    if (!Array.isArray(data.pieces) || data.pieces.length > LIMITS.maxPieces) {
      return json(400, { error: 'Too many pieces' });
    }

    const id = uid();
    const clean = {
      v: 1,
      id,
      sport: sanitize(String(data.sport || ''), 20),
      title: sanitize(data.title, LIMITS.maxTitle),
      description: sanitize(data.description || '', LIMITS.maxDescription),
      author: sanitize(data.author || '', LIMITS.maxAuthor),
      pieces: data.pieces,
      frames: data.frames,
      duration: data.duration,
      sampleRate: data.sampleRate,
      createdAt: Date.now(),
    };

    await store.setJSON(id, clean);
    return json(201, { id, url: `/viewer.html?id=${id}` });
  }

  return json(405, { error: 'Method not allowed' });
}
