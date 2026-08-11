import { ADMIN, CALLBACK, FRONTEND, createSession, verifyState } from '../../lib/common.js';

export default async function handler(req, res) {
  try {
    const url = new URL(req.url, 'https://api.evera.top');
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    if (!code || !verifyState(state)) {
      res.statusCode = 400;
      return res.end('Invalid OAuth callback');
    }

    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: CALLBACK
      })
    });
    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok || !tokenData.access_token) {
      res.statusCode = 502;
      return res.end('GitHub token exchange failed');
    }

    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${tokenData.access_token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'Everflow-Blog-Admin'
      }
    });
    const user = await userResponse.json();
    if (!userResponse.ok || String(user.login || '').toLowerCase() !== ADMIN.toLowerCase()) {
      res.statusCode = 403;
      return res.end('This GitHub account is not allowed');
    }

    const session = createSession(user.login, tokenData.access_token);
    res.statusCode = 302;
    res.setHeader('Location', `${FRONTEND}/admin/#token=${encodeURIComponent(session)}`);
    res.end();
  } catch (error) {
    res.statusCode = 500;
    res.end('OAuth callback failed');
  }
}
