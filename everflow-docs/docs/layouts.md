# Book 六种版式

| 模式 | 页面 | 适合场景 |
|---|---|---|
| `standard` | A4 | 日常主力做题本 |
| `compact` | A4 | 高频速刷，减少留白 |
| `loose` | A4 | 更大草稿空间 |
| `single` | A4 | 一题一页 |
| `padl` | 200×150mm 横版 | 平板选择题 |
| `padp` | 200×250mm 竖版 | 平板解答题 |

```tex
\providecommand{\ZeroOneBookLayout}{compact}
```

### 同页保护

默认会尽量保证题目与选项同页；超长题允许安全分页，并记录降级警告，不会为了强行同页导致内容消失。
