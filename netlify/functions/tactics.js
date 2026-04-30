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

export default async (req) => {
  const method = req.method;
  const store = getStore('tactics');

  if (method === 'GET') {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    if (!id || !/^[a-z0-9]{10}$/.test(id)) {
      return Response.json({ error: 'Invalid id' }, { status: 400 });
    }
    const data = await store.get(id, { type: 'json' }).catch(() => null);
    if (!data) return Response.json({ error: 'Not found' }, { status: 404 });

    return new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  }

  if (method === 'POST') {
    const ct = req.headers.get('content-type') ?? '';
    if (!ct.includes('application/json')) {
      return Response.json({ error: 'Content-Type must be application/json' }, { status: 415 });
    }

    const text = await req.text();
    if (new TextEncoder().encode(text).length > LIMITS.maxPayloadBytes) {
      return Response.json({ error: 'Payload too large' }, { status: 413 });
    }

    let data;
    try { data = JSON.parse(text); }
    catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }); }

    if (data.v !== 1) return Response.json({ error: 'Invalid version' }, { status: 400 });
    if (!data.title?.trim()) return Response.json({ error: 'Title required' }, { status: 400 });
    if (typeof data.duration !== 'number' || data.duration > LIMITS.maxDuration) {
      return Response.json({ error: 'Recording too long (max 30s)' }, { status: 400 });
    }
    if (!Array.isArray(data.frames) || data.frames.length > LIMITS.maxFrames) {
      return Response.json({ error: 'Too many frames' }, { status: 400 });
    }
    if (!Array.isArray(data.pieces) || data.pieces.length > LIMITS.maxPieces) {
      return Response.json({ error: 'Too many pieces' }, { status: 400 });
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
    return Response.json({ id, url: `/viewer.html?id=${id}` }, { status: 201 });
  }

  return Response.json({ error: 'Method not allowed' }, { status: 405 });
};

export const config = {
  path: '/api/tactics',
};
