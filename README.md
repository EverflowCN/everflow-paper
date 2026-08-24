# Everflow · 彼时流年若水

个人博客静态站点。

- `site/`：GitHub Pages 发布目录
- `.github/workflows/deploy-pages-v2.yml`：当前 GitHub Pages 自动部署工作流
- `docs/PAGES_DEPLOY_RUNBOOK.md`：Pages 部署故障记录、排查顺序与预防规则

部署异常时，先检查最新一次 Actions 的第一个红色步骤；只有部署成功后再排查浏览器/CDN/Service Worker 缓存。
