import { CALLBACK, createState, handleOptions } from '../../lib/common.js';

export default function handler(req, res) {
  if (handleOptions(req, res)) return;
  if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET || !process.env.SESSION_SECRET) {
    res.statusCode = 503;
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({ error: 'OAuth not configured' }));
  }

  const url = new URL(req.url, 'https://api.evera.top');
  const deviceId = String(url.searchParams.get('device') || '').trim();
  let state;
  try {
    state = createState(deviceId);
  } catch {
    res.statusCode = 400;
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({ error: 'Missing or invalid device id' }));
  }

  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID,
    redirect_uri: CALLBACK,
    scope: 'public_repo',
    state
  });
  res.statusCode = 302;
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Location', `https://github.com/login/oauth/authorize?${params.toString()}`);
  res.end();
}
