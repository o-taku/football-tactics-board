import { getStore } from '@netlify/blobs';
import { randomUUID } from 'crypto';

const LIMITS = {
  maxComments: 500,
  maxName: 30,
  maxBody: 500,
};

function sanitize(str, maxLen) {
  if (typeof str !== 'string') return '';
  return str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '').trim().slice(0, maxLen);
}

export default async (req) => {
  const method = req.method;
  const tacticsStore = getStore('tactics');
  const commentsStore = getStore('comments');

  if (method === 'GET') {
    const url = new URL(req.url);
    const tacticId = url.searchParams.get('tacticId');
    if (!tacticId) return Response.json({ error: 'Missing tacticId' }, { status: 400 });

    const comments = await commentsStore.get(tacticId, { type: 'json' }).catch(() => []);
    return new Response(JSON.stringify({ comments: comments || [] }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  }

  if (method === 'POST') {
    const ct = req.headers.get('content-type') ?? '';
    if (!ct.includes('application/json')) {
      return Response.json({ error: 'Content-Type must be application/json' }, { status: 415 });
    }

    let data;
    try { data = JSON.parse(await req.text()); }
    catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }); }

    const { tacticId, name, body: commentBody } = data;
    if (!tacticId) return Response.json({ error: 'Missing tacticId' }, { status: 400 });
    if (!commentBody?.trim()) return Response.json({ error: 'Comment body required' }, { status: 400 });

    const tactic = await tacticsStore.get(tacticId, { type: 'json' }).catch(() => null);
    if (!tactic) return Response.json({ error: 'Tactic not found' }, { status: 404 });

    const comments = (await commentsStore.get(tacticId, { type: 'json' }).catch(() => null)) ?? [];
    if (comments.length >= LIMITS.maxComments) {
      return Response.json({ error: 'Comment limit reached' }, { status: 429 });
    }

    const comment = {
      id: randomUUID().slice(0, 8),
      name: sanitize(name || '', LIMITS.maxName) || '匿名',
      body: sanitize(commentBody, LIMITS.maxBody),
      createdAt: Date.now(),
    };

    comments.push(comment);
    await commentsStore.setJSON(tacticId, comments);
    return Response.json({ comment }, { status: 201 });
  }

  return Response.json({ error: 'Method not allowed' }, { status: 405 });
};

export const config = {
  path: '/api/comments',
};
