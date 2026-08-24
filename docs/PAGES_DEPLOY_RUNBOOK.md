# GitHub Pages 部署故障记录与预防手册

更新时间：2026-08-24

## 这次故障的根因

本次出现“代码已提交，但 evera.top 长时间不更新、/graph-next/ 无法访问、提交右侧连续红叉”的直接原因不是缓存，也不是 Pages 来源设置错误，而是 GitHub Actions 在发布前失败。

共有两个独立问题：

1. **Architecture audit 误报**
   - 旧规则把“可自动判分题数量”硬编码为 `>= 720`。
   - 当前实际可自动判分题为 `642`，导致 `quality` 失败。
   - 修复：改为相对阈值，`autoChoice >= verified * 70%`，避免数据规模变化时出现无意义硬失败。

2. **Privacy audit 阻止正式发布**
   - 构建后的公开 artifact 中仍残留题库来源名称/仓库标识。
   - 旧清洗逻辑主要删除 URL 型字段，没有覆盖 `source` / `sourceName` / `provider` / `vendor` 等普通字符串字段。
   - 最终隐私 grep 正确拦截了发布，所以 `Setup Pages`、`Upload site artifact`、`Deploy to GitHub Pages` 都被跳过。
   - 修复：扩展 `DROP_KEYS` 与 `SENSITIVE_MARKERS`，先清洗来源字段和来源字符串，再执行最终隐私硬扫描。

## 以后看到“网站没有更新”时的排查顺序

不要先改 CSS、Service Worker 或继续重复提交。按下面顺序排查：

1. 打开 GitHub → **操作（Actions）** → `Deploy Everflow Site to GitHub Pages v2`。
2. 看最新一次运行是否为绿色 `Success`。
3. 如果是红叉，先看 `deploy`，再看 `quality`。
4. 在失败 job 中找到**第一个红色步骤**，不要只看 Summary。
5. 只有 `Deploy to GitHub Pages` 已成功，才继续考虑浏览器/CDN/Service Worker 缓存问题。

### 常见失败位置

- `Architecture audit`：检查审计规则是否写死了数据数量或旧架构约束。
- `Checkout question assets`：检查外部题库仓库、路径和权限。
- `Verify site`：检查新增页面/CSS/JS 是否真的存在。
- `Build privacy-safe static artifact`：优先检查隐私清洗和最终 grep。
- `Setup Pages`：检查 Pages 是否启用且 Source 为 `GitHub Actions`。
- `Upload site artifact`：检查 artifact 大小/路径。
- `Deploy to GitHub Pages`：检查 Pages 环境和权限。

## 预防规则

### 1. 审计不要再写死题目数量

数据型阈值优先使用比例或由 manifest 推导。例如：

```js
const autoFloor = Math.floor(verified * 0.70);
assert(autoChoice >= autoFloor, ...);
```

除非是 408 固定结构（如年份 2009—2026、单套 47 题），否则不要把动态语料数量写成绝对值。

### 2. 隐私规则采用“两阶段”

**第一阶段：清洗**

删除来源相关字段，包括但不限于：

- `repository`, `repo`, `github`
- `source`, `sourceName`, `sourceLabel`, `sourceKey`, `sourcePath`, `sourceUrl`
- `origin`, `provider`, `provenance`, `vendor`

同时清理普通字符串中的仓库名、用户名和 Raw/GitHub 地址。

**第二阶段：硬扫描**

构建完成后继续对公开 `site/` 执行 grep。发现隐私标识时必须阻止部署，不能为了上线直接关闭隐私检查。

### 3. 新页面必须进入 Verify site

新增正式或预览页面时，同时验证：

- HTML 入口
- 对应 JS
- 对应 CSS

例如本次 `graph-next`：

```bash
test -s site/graph-next/index.html
test -s site/assets/js/graph-next.js
test -s site/assets/css/graph-next.css
```

这样可以区分“仓库里有代码”和“生产 artifact 真的包含页面”。

### 4. 连续提交时注意 concurrency

当前部署使用：

```yaml
concurrency:
  group: pages
  cancel-in-progress: true
```

连续提交会取消前一轮部署，因此历史提交出现红叉/取消并不一定代表代码错误。判断线上版本时只看**最新一次**工作流。

### 5. 不要先把问题归因于缓存

只有满足下面条件后才排查缓存：

- 最新 workflow 已 `Success`；
- `Deploy to GitHub Pages` 已成功；
- 生产 artifact 已包含目标文件；
- 线上仍然显示旧内容。

否则优先级始终是部署日志，而不是 Service Worker。

## 当前关键部署约束

- Pages Source：`GitHub Actions`
- 正式 workflow：`.github/workflows/deploy-pages-v2.yml`
- `quality` 用于架构审计，不应因为动态题库数量变化产生硬编码误报。
- `deploy` 中的隐私扫描是生产硬门禁，必须保留。
- 发布完成后可用 `/build.json` 判断当前 artifact 版本，但不要写入仓库名、GitHub 用户名或 commit SHA。

## 一句话复盘

以后如果出现“GitHub 已提交但网站没更新”：**先看最新 Actions 的第一个红色步骤；只有部署成功后，才查缓存。**
