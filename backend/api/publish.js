import { handleOptions, json, loadPosts, parseBody, requireSession, savePosts } from '../lib/common.js';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  if (req.method !== 'POST') return json(req, res, 405, { error: 'Method not allowed' });
  const session = requireSession(req, res);
  if (!session) return;

  try {
    const body = parseBody(req);
    const title = String(body.title || '').trim();
    const slug = String(body.slug || '').trim().toLowerCase();
    const date = String(body.date || '').trim();
    const excerpt = String(body.excerpt || '').trim();
    const content = String(body.content || '');
    const tags = Array.isArray(body.tags)
      ? body.tags.map(x => String(x).trim()).filter(Boolean)
      : String(body.tags || '').split(',').map(x => x.trim()).filter(Boolean);

    if (!title || !slug || !date) return json(req, res, 400, { error: '标题、Slug 和日期不能为空' });
    if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) return json(req, res, 400, { error: 'Slug 只能使用小写英文、数字和连字符' });

    const { sha, posts } = await loadPosts(session.githubToken);
    const post = { slug, title, excerpt, content, tags, date, updatedAt: new Date().toISOString() };
    const index = posts.findIndex(p => p.slug === slug);
    if (index >= 0) posts[index] = post;
    else posts.unshift(post);
    posts.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')) || String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));

    await savePosts(session.githubToken, posts, sha, index >= 0 ? `Update blog post: ${slug}` : `Publish blog post: ${slug}`);
    return json(req, res, 200, { ok: true, post });
  } catch (error) {
    return json(req, res, 500, { error: error.message || '发布失败' });
  }
}
