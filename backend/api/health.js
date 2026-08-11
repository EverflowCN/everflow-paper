import { ADMIN, REPO_OWNER, REPO_NAME, handleOptions, json } from '../lib/common.js';

export default function handler(req, res) {
  if (handleOptions(req, res)) return;
  return json(req, res, 200, {
    ok: true,
    oauthConfigured: Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET && process.env.SESSION_SECRET),
    admin: ADMIN,
    repo: `${REPO_OWNER}/${REPO_NAME}`
  });
}
