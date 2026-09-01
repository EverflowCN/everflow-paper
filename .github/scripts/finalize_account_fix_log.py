from pathlib import Path

p = Path('docs/FIX_LOG.md')
text = p.read_text(encoding='utf-8')
heading = '## 2026-09-02 · 账户认证流程纠正：注册验证码、旧密码改密与原按钮交互恢复'
start = text.index(heading)
end = text.index('\n---\n', start)
section = text[start:end]
section = section.replace(
    '**状态：代码已纠正并通过本地 CI 门禁；等待 GitHub Pages 最终部署与真实设备复测。**',
    '**状态：代码已纠正并部署成功；等待真实设备复测。**'
)
marker = '- `git diff --check`。\n\n### 真实设备结果'
insert = """- `git diff --check`。

### GitHub Pages 部署

- corrective workflow run `33535498735`：代码修正、architecture audit 与 `git diff --check` 全部成功；
- 最终发布提交：`21988ffadcb5e731b111598df97b687687e13153`；
- GitHub Pages **#217**，run `33535688124`：**success**；
- quality：Architecture audit、账户/资源/工作台/cache 脚本检查全部成功；
- deploy：课程目录、题库资源、算法可视化 build、Verify site、privacy artifact、Pages upload 与 Deploy to GitHub Pages 全部成功；
- workflow 完成时间：2026-09-01 17:06:10 UTC；
- 日志收尾 run `33535849040` 因一次性 workflow YAML 解析失败而未产生 job；该失败只影响文档收尾，不影响已经成功的 Pages #217，随后改用短 YAML + 独立 Python 脚本修正。

CI / Pages 成功只代表自动验证和部署完成，真实设备认证流程仍需用户复测。

### 真实设备结果"""
assert marker in section
section = section.replace(marker, insert)
text = text[:start] + section + text[end:]
p.write_text(text, encoding='utf-8')
