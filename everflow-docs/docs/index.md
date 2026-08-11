# Everflow · 彼时流年若水

> 一份题源，三种输出。把 408 刷题、模拟考试与出版排版放进同一套 LaTeX 工程。

Everflow 是面向 **计算机考研 408** 的三合一排版系统。它在同一工程中提供 **Book 做题本、Exam 正式试卷、Public 出版习题册** 三种输出，同时保留小写 `bbox` 题目内核、六种 Book 版式、A4/A3/mixed Exam、目录、页眉页脚、水印、统一封面和 Public 出版组件。

## 为什么是三合一

- **同一题源**：题目只录入一次，Book / Exam / Public 共用。
- **统一题目内核**：继续使用小写 `bbox`、`qitems`、自动选项排版与解析环境。
- **多版式切换**：Book 支持 `standard / compact / loose / single / padl / padp`。
- **正式考试输出**：Exam 支持 A4、A3 双栏和 mixed A4/A3 插页。
- **出版模式**：Public 提供扉页、版权、前言、目录、附录、参考文献、后记、版本记录等独立组件。
- **品牌视觉统一**：封面、书脊、扉页和分部页均可使用 Everflow 矢量标志。

## 三种输出

### Book · 做题本
适合日常刷题、专项训练、错题二刷。六种版式由同一题源切换，无需重新排版。

### Exam · 模拟试卷
适合正式模拟、A3 双栏试卷和 mixed 插页。支持逻辑页码、前置页、目录和统一页眉页脚。

### Public · 出版习题册
适合正式成书。支持出版前置页、奇偶页、书口、独立页眉页脚以及完整封面展开图。

## 快速开始

```tex
% Book 入口：ZeroOne-Book.tex
\providecommand{\ZeroOneBookLayout}{standard}

% 一份题源在 questions/ 中维护
\begin{qitems}[startnum=1]
  \begin{bbox}
    \qitem 下列说法正确的是（  ）
    \fourchoices{A}{B}{C}{D}
  \end{bbox}
\end{qitems}
```

下一步请阅读 [快速开始](start.md)。
