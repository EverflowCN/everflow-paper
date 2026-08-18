# 题目标准化 Schema

每道题建议使用 JSONL 保存，一行一个 JSON 对象。

## 必需字段

```json
{
  "id": "M2-CALC-INT-0001",
  "subject": "高等数学",
  "chapter": "定积分",
  "knowledge_points": ["换元积分", "区间变换"],
  "type": "解答题",
  "difficulty": "real-exam",
  "source": {
    "kind": "adapted",
    "label": "由公开真题结构改编"
  },
  "stem": "题干 LaTeX/Markdown",
  "answer": "最终答案",
  "solution": "完整解析",
  "estimated_minutes": 10,
  "tags": ["计算", "换元", "真题级"]
}
```

## 字段约束

### id

全库唯一。建议格式：

`M2-{SUBJECT}-{TOPIC}-{NUMBER}`

### subject

允许值：

- `高等数学`
- `线性代数`

### type

不得预设为永久固定枚举；正式仿真卷应以最新官方考试结构为准。题库内部可使用：

- `选择题`
- `填空题`
- `解答题`
- `证明题`

### difficulty

允许值：

- `foundation`
- `standard`
- `real-exam`
- `hard`

### source.kind

允许值：

- `real_exam`：可确认的真题
- `bank`：授权/自有题库
- `adapted`：改编题
- `generated`：自编题

不得把无法确认来源的题标成 `real_exam`。

### answer / solution

- 客观题必须有唯一答案；
- 解答题必须给最终结论；
- 证明题 `answer` 可写结论，但 `solution` 必须有完整证明链；
- 不允许 `略`、`同理可得` 代替关键步骤。

## 可选字段

```json
{
  "year": 2025,
  "question_no": 17,
  "score": 10,
  "methods": ["换元法", "区间再现"],
  "common_errors": ["换元后上下限未变", "遗漏绝对值"],
  "prerequisites": ["定积分换元公式"],
  "similarity_group": "INT-SYMMETRY-A",
  "latex_assets": ["figures/q0001.tikz"],
  "verified": true
}
```

## 去重字段

`similarity_group` 用于标识本质同构题。若两题满足以下多数条件，应考虑归为同组：

- 主方法相同；
- 关键构造相同；
- 区间/矩阵/函数只做数值替换；
- 设问只做表面改写；
- 解题步骤高度一致。
