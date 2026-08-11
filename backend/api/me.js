import { handleOptions, json, requireSession } from '../lib/common.js';

export default function handler(req, res) {
  if (handleOptions(req, res)) return;
  const session = requireSession(req, res);
  if (!session) return;
  return json(req, res, 200, { login: session.login });
}
