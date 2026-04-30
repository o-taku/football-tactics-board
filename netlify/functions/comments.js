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

function json(status, body, extra = {}) {
  return {
    statusCode: status,
    headers: { 'Content-Type': 'application/json', ...extra },
    body: JSON.stringify(body),
  };
}

export async function handler(event) {
  const method = event.httpMethod;
  const tacticsStore = getStore('tactics');
  const commentsStore = getStore('comments');

  if (method === 'GET') {
    const tacticId = event.queryStringParameters?.tacticId;
    if (!tacticId) return json(400, { error: 'Missing tacticId' });

    const comments = await commentsStore.get(tacticId, { type: 'json' }).catch(() => []);
    return json(200, { comments: comments || [] }, { 'Cache-Control': 'no-store' });
  }

  if (method === 'POST') {
    const ct = event.headers?.['content-type'] ?? '';
    if (!ct.includes('application/json')) return json(415, { error: 'Content-Type must be application/json' });

    let data;
    try { data = JSON.parse(event.body); }
    catch { return json(400, { error: 'Invalid JSON' }); }

    const { tacticId, name, body: commentBody } = data;
    if (!tacticId) return json(400, { error: 'Missing tacticId' });
    if (!commentBody?.trim()) return json(400, { error: 'Comment body required' });

    const tactic = await tacticsStore.get(tacticId, { type: 'json' }).catch(() => null);
    if (!tactic) return json(404, { error: 'Tactic not found' });

    const comments = (await commentsStore.get(tacticId, { type: 'json' }).catch(() => null)) ?? [];
    if (comments.length >= LIMITS.maxComments) return json(429, { error: 'Comment limit reached' });

    const comment = {
      id: randomUUID().slice(0, 8),
      name: sanitize(name || '', LIMITS.maxName) || '匿名',
      body: sanitize(commentBody, LIMITS.maxBody),
      createdAt: Date.now(),
    };

    comments.push(comment);
    await commentsStore.setJSON(tacticId, comments);
    return json(201, { comment });
  }

  return json(405, { error: 'Method not allowed' });
}
