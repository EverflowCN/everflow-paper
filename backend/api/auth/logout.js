import { clearSessionCookie, handleOptions, json, requireTrustedOrigin } from '../../lib/common.js';

export default function handler(req, res) {
  if (handleOptions(req, res)) return;
  if (req.method !== 'POST') return json(req, res, 405, { error: 'Method not allowed' });
  if (!requireTrustedOrigin(req, res)) return;
  clearSessionCookie(res);
  return json(req, res, 200, { ok: true });
}
