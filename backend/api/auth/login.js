import { CALLBACK, createState, handleOptions } from '../../lib/common.js';

export default function handler(req, res) {
  if (handleOptions(req, res)) return;
  if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET || !process.env.SESSION_SECRET) {
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({ error: 'OAuth not configured' }));
  }
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID,
    redirect_uri: CALLBACK,
    scope: 'public_repo',
    state: createState()
  });
  res.statusCode = 302;
  res.setHeader('Location', `https://github.com/login/oauth/authorize?${params.toString()}`);
  res.end();
}
