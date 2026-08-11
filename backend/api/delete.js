import { handleOptions, json, loadPosts, requireSession, savePosts } from '../lib/common.js';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  if (req.method !== 'DELETE') return json(req, res, 405, { error: 'Method not allowed' });
  const session = requireSession(req, res);
  if (!session) return;

  try {
    const url = new URL(req.url, 'https://api.evera.top');
    const slug = String(url.searchParams.get('slug') || '').trim().toLowerCase();
    if (!slug) return json(req, res, 400, { error: '缺少 slug' });

    const { sha, posts } = await loadPosts(session.githubToken);
    const nextPosts = posts.filter(p => p.slug !== slug);
    if (nextPosts.length === posts.length) return json(req, res, 404, { error: '文章不存在' });

    await savePosts(session.githubToken, nextPosts, sha, `Delete blog post: ${slug}`);
    return json(req, res, 200, { ok: true, slug });
  } catch (error) {
    return json(req, res, 500, { error: error.message || '删除失败' });
  }
}
