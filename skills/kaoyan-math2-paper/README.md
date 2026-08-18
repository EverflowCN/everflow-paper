# kaoyan-math2-paper

面向 **2027 考研数学二** 的智能组卷 Skill。

当前版本：`0.1.0`

## 已包含

- `SKILL.md`：主工作流与触发规则
- `references/2027-baseline.md`：2027 大纲核验基线
- `references/paper-blueprints.md`：章节卷/专题卷/弱点卷/综合卷/仿真卷蓝图
- `references/question-schema.md`：题库 JSONL 数据规范
- `references/generation-rules.md`：真题风格、自编题、变式题与答案校验规则
- `references/latex-output.md`：LaTeX 成卷约束
- `scripts/validate_bank.py`：题库/试卷 JSONL 基础校验器
- `templates/question.example.jsonl`：最小示例

## 设计原则

1. 先做双向细目表，再选题；
2. 仿真卷必须以最新官方大纲为准；
3. 真题风格重在设问方式、综合度和计算量，不机械模仿表面数据；
4. 原题、改编题、自编题严格区分来源；
5. 每题必须有可验证答案与完整解析；
6. 题库层与 LaTeX 版式层解耦。

## 下一阶段

- 接入历年数学二真题标签库；
- 增加章节/知识点 taxonomy；
- 增加相似题去重与难度评分脚本；
- 增加自动蓝图生成器；
- 接入 Everflow 的 LaTeX 试卷模板；
- 在 2027 官方大纲发布/核验后更新正式结构。
