# Everflow Study 云同步接入

本目录只保存数据库结构与 Edge Function 源码。浏览器端只能使用 Supabase 的 **Project URL** 与 **Publishable / anon key**；`service_role` / Secret key 绝不能写入 `site/`、HTML、浏览器 JS、localStorage 或公开 GitHub 仓库。

## 1. 创建 Supabase Free 项目

创建项目后保留：

- Project URL
- Publishable key（或旧项目里的 anon/public key）

不要复制 Secret / service-role key 到前端。

## 2. 初始化数据库

在 Supabase SQL Editor 中完整执行：

`supabase/schema.sql`

它会创建：

- `profiles`
- `focus_sessions`
- `course_states`
- `admin_audit`
- RLS 策略
- Owner 判断函数

该 SQL 已按可重复执行方式编写，后续升级可再次运行。

## 3. 先在单台设备测试

打开站点 `/account/`。当正式云配置为空时，会显示“连接 Supabase”区域。

填入：

- Project URL
- Publishable / anon key

点击“仅在本机保存并重载”。配置只写入当前浏览器的 `localStorage`，用于先验证注册、登录、同步是否正常。

确认无误后，把相同的两个**公开值**写入：

`site/assets/js/cloud-config.js`

中的 `BAKED`：

```js
const BAKED={
  url:'https://YOUR_PROJECT.supabase.co',
  publishableKey:'YOUR_PUBLIC_KEY'
};
```

然后提交到 `main`。正式值存在后会优先于设备上的测试配置。

## 4. 设置 Owner 账户

先通过站点正常注册你的管理员账户，再在 Supabase SQL Editor 中执行 `schema.sql` 最后的 Owner 设置示例，把邮箱换成你的管理员邮箱：

```sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
  || '{"role":"owner"}'::jsonb
where email = 'YOUR_OWNER_EMAIL@example.com';
```

执行后退出站点账户并重新登录，以刷新 JWT 中的 `app_metadata.role`。

管理权限的真正边界是数据库 RLS + Owner JWT，不依赖隐藏网址。

## 5. 部署账户管理 Edge Function

高权限操作（列出 Auth 用户、停用、解除停用、删除账户）不能在浏览器直接使用 service-role key，因此使用：

`supabase/functions/owner-users/index.ts`

部署函数名必须保持：

`owner-users`

Supabase Edge Function 运行环境使用服务端环境变量读取 `SUPABASE_URL` 和 `SUPABASE_SERVICE_ROLE_KEY`。不要把这两个服务端 Secret 写回网站源码。

## 6. 验收顺序

1. 游客模式创建一条专注记录。
2. 勾选一条 408 课程并填写备注。
3. `/stats/` 能看到专注统计与热力图变化。
4. `/account/` 导出 JSON 备份。
5. 注册账户并登录。
6. 点击“立即同步”。
7. 换浏览器或设备登录同一账户，确认云端记录能合并回来。
8. 断网后新增专注记录，恢复网络后确认自动同步。
9. Owner 账户进入控制台，普通用户无法读取控制台数据。
10. 测试停用 / 解除停用；删除账户只用测试账号验证。

## 数据保护原则

Everflow Study 使用 offline-first：

- 专注记录先写 IndexedDB，再尝试云同步。
- 408 勾选状态仍兼容旧 `localStorage`，同时镜像到 IndexedDB。
- 登录后按每条记录的 `updatedAt` 合并本地与云端，不做整库无条件覆盖。
- 网络失败不会删除本地记录。
- 可随时导出 JSON 作为第三份人工备份。
