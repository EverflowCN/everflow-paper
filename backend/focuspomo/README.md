# 私人番茄页面

- 入口 `/me/focus/`；公共导航与站点地图不挂链接。
- GitHub Pages 只发布身份验证壳层，不包含番茄 HTML/脚本/素材或个人记录。
- `owner-focus` 在服务器调用 `auth.getUser(token)`，同时验证唯一 owner ID 和 app_metadata.role；通过后才返回内嵌应用。
- `owner_focus_state` 表开启 RLS，撤销 PUBLIC/anon/authenticated 的全部权限。只能由已验证 owner 的服务端函数访问。安全检查中的“RLS 无策略”信息项是有意默认拒绝。
- iframe 使用 allow-scripts allow-downloads，不授予同源访问；会话凭据始终留在父页面。接口 no-store，站点 Service Worker 排除本路径。
- 每次保存按 revision 做乐观锁；跨设备发生冲突时停止写入并提供导出，避免覆盖对方数据。同步失败保留当前页修改并重试。
- 无演示统计：初次使用空记录，所有统计、日历和番茄来自真实记录。

## 构建和验证

`node backend/focuspomo/build-bundle.mjs` 生成私有函数 bundle；`node --test backend/focuspomo/*.test.mjs` 运行计时与权限测试。函数更新需单独部署，GitHub Pages workflow 只部署入口。数据库 schema.sql 对应线上迁移 owner_focus_private_state。

## 本次验证

12 项 Node 回归测试通过；脚本语法和静态引用检查通过。线上匿名 boot 返回 404、伪造 token 返回 401、匿名数据库查询被拒绝；数据库明确确认 anon/authenticated 无表权限。未使用真实 owner 会话模拟登录，未执行浏览器视觉/真机测试。

## 范围

沿用找回的 Mac Web v08 视觉并将演示逻辑替换为真实计时、休息循环、标签管理、补录/编辑/删除、趋势/番茄统计、按日/周日历、白噪声、记录云存储及导入导出。手机做响应式适配。不是已经通过逐像素比对的完整原版。

网页关闭或被 iOS 挂起时不能保证实时响铃，恢复页面后会按真实时间结算；网页不等于 IPA，App 屏蔽、Watch、HealthKit 和原生实时活动未包含。体感取决于浏览器权限；不支持时仍可拖动番茄。

## 2026-09-06 修复

修复 HTML 打包替换将 $$ 压成 $、导致整个应用无法启动的问题；打包过程现在校验最终内嵌脚本语法。记录 ID 增加 getRandomValues 兼容路径，避免缺少 randomUUID 时开始/新标签失败。根据用户手机截图调整首页、计时状态、单列标签和时长选择界面；其他原版细节仍待逐页对齐。

390×844 的隔离浏览器中实际点击通过开始、正计时、暂停、结束、完成弹窗、新标签保存、统计和时间轴导航。使用空白测试数据，没有写入线上账户。12 项回归测试通过；真实 owner 登录及云端保存尚未端到端验证。
