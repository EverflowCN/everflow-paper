import crypto from 'node:crypto';

export const ADMIN = 'EverflowCN';
export const REPO_OWNER = 'EverflowCN';
export const REPO_NAME = 'everflow-paper';
export const DATA_PATH = 'site/data/posts.json';
export const FRONTEND = 'https://evera.top';
export const CALLBACK = 'https://api.evera.top/api/auth/callback';
export const SESSION_COOKIE = 'everflow_admin_session';

const SESSION_TTL_SECONDS = 12 * 60 * 60;
const allowedOrigins = new Set([
  'https://evera.top',
  'https://www.evera.top',
  'https://everflowcn.github.io'
]);

export function applyCors(req, res) {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Everflow-Device');
  res.setHeader('Access-Control-Max-Age', '86400');
}

export function handleOptions(req, res) {
  applyCors(req, res);
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.setHeader('Cache-Control', 'no-store');
    res.end();
    return true;
  }
  return false;
}

export function json(req, res, status, body) {
  applyCors(req, res);
  res.statusCode = status;
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

export function requireTrustedOrigin(req, res) {
  const origin = String(req.headers.origin || '');
  if (!allowedOrigins.has(origin)) {
    json(req, res, 403, { error: 'Untrusted origin' });
    return false;
  }
  return true;
}

function secret() {
  if (!process.env.SESSION_SECRET) throw new Error('SESSION_SECRET missing');
  return process.env.SESSION_SECRET;
}

function b64url(input) {
  return Buffer.from(input).toString('base64url');
}

function unb64url(input) {
  return Buffer.from(input, 'base64url');
}

function normalizeDeviceId(value) {
  const deviceId = String(value || '').trim();
  return /^[A-Za-z0-9._-]{24,160}$/.test(deviceId) ? deviceId : '';
}

function deviceHash(value) {
  const deviceId = normalizeDeviceId(value);
  return deviceId ? crypto.createHash('sha256').update(deviceId).digest('base64url') : '';
}

export function createState(deviceId) {
  const boundDevice = deviceHash(deviceId);
  if (!boundDevice) throw new Error('Invalid device id');
  const payload = b64url(JSON.stringify({
    nonce: crypto.randomBytes(16).toString('hex'),
    deviceHash: boundDevice,
    exp: Date.now() + 10 * 60 * 1000
  }));
  const sig = crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifyState(state) {
  if (!state || !state.includes('.')) return null;
  const [payload, sig] = state.split('.');
  const expected = crypto.createHmac('sha256', secret()).update(payload).digest();
  let actual;
  try { actual = Buffer.from(sig, 'base64url'); } catch { return null; }
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return null;
  try {
    const data = JSON.parse(unb64url(payload).toString('utf8'));
    if (Number(data.exp) <= Date.now()) return null;
    if (!/^[A-Za-z0-9_-]{43}$/.test(String(data.deviceHash || ''))) return null;
    return data;
  } catch {
    return null;
  }
}

function sessionKey() {
  return crypto.createHash('sha256').update(secret()).digest();
}

export function createSession(login, githubToken, boundDeviceHash) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(String(boundDeviceHash || ''))) {
    throw new Error('Invalid device binding');
  }
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', sessionKey(), iv);
  const plaintext = Buffer.from(JSON.stringify({
    login,
    githubToken,
    deviceHash: boundDeviceHash,
    exp: Date.now() + SESSION_TTL_SECONDS * 1000
  }), 'utf8');
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ['v2', iv.toString('base64url'), tag.toString('base64url'), encrypted.toString('base64url')].join('.');
}

export function readSession(token) {
  try {
    const [version, ivB64, tagB64, encryptedB64] = String(token || '').split('.');
    if (version !== 'v2') return null;
    const decipher = crypto.createDecipheriv('aes-256-gcm', sessionKey(), Buffer.from(ivB64, 'base64url'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64url'));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(encryptedB64, 'base64url')),
      decipher.final()
    ]).toString('utf8');
    const data = JSON.parse(plaintext);
    if (!data.exp || data.exp < Date.now()) return null;
    if (String(data.login).toLowerCase() !== ADMIN.toLowerCase()) return null;
    if (!/^[A-Za-z0-9_-]{43}$/.test(String(data.deviceHash || ''))) return null;
    return data;
  } catch {
    return null;
  }
}

function parseCookies(req) {
  const result = {};
  const raw = String(req.headers.cookie || '');
  raw.split(';').forEach(part => {
    const index = part.indexOf('=');
    if (index < 0) return;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (!key) return;
    try { result[key] = decodeURIComponent(value); } catch { result[key] = value; }
  });
  return result;
}

export function setSessionCookie(res, token) {
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=${SESSION_TTL_SECONDS}; HttpOnly; Secure; SameSite=Lax`);
}

export function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`);
}

export function requireSession(req, res) {
  const session = readSession(parseCookies(req)[SESSION_COOKIE]);
  const requestDeviceHash = deviceHash(req.headers['x-everflow-device']);
  if (!session || !requestDeviceHash || session.deviceHash !== requestDeviceHash) {
    json(req, res, 401, { error: 'Unauthorized' });
    return null;
  }
  return session;
}

export async function githubRequest(path, token, options = {}) {
  const response = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      'Accept': 'application/vnd.github+json',
      'Authorization': `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'Everflow-Blog-Admin',
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!response.ok) {
    const message = data?.message || `GitHub API ${response.status}`;
    throw new Error(message);
  }
  return data;
}

export async function loadPosts(githubToken) {
  const file = await githubRequest(`/repos/${REPO_OWNER}/${REPO_NAME}/contents/${DATA_PATH}?ref=main`, githubToken);
  const content = Buffer.from(String(file.content || '').replace(/\n/g, ''), 'base64').toString('utf8');
  return { sha: file.sha, posts: JSON.parse(content || '[]') };
}

export async function savePosts(githubToken, posts, sha, message) {
  const content = Buffer.from(JSON.stringify(posts, null, 2) + '\n', 'utf8').toString('base64');
  return githubRequest(`/repos/${REPO_OWNER}/${REPO_NAME}/contents/${DATA_PATH}`, githubToken, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, content, sha, branch: 'main' })
  });
}

export function parseBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return {};
}
