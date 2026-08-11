# 快速开始

## 1. 环境

推荐 **TeX Live + XeLaTeX + latexmk**。工程不要求 `shell-escape`。

```bash
latexmk -xelatex ZeroOne-Book.tex
latexmk -xelatex ZeroOne-Exam.tex
latexmk -xelatex ZeroOne-Public.tex
```

## 2. 三个正文入口

| 入口 | 用途 | 默认输出 |
|---|---|---|
| `ZeroOne-Book.tex` | 做题本 / 刷题本 | A4 standard |
| `ZeroOne-Exam.tex` | 正式试卷 | mixed |
| `ZeroOne-Public.tex` | 出版习题册 | A4 Public |

## 3. 高频修改位置

1. 入口文件顶部：选择 Book/Exam/Public 的输出模式。
2. `00-user-config/`：修改页边距、页眉页脚、题目、目录、水印、封面。
3. `questions/`：只维护题目内容。
4. `assets/brand/`：Everflow SVG/PDF 矢量标志。

## 4. Brand 资源

LaTeX 内使用 `assets/brand/everflow-logo.pdf` 和 `everflow-icon.pdf`，网站和设计稿使用对应 SVG。这样 PDF 编译不依赖 SVG 包，也不需要开启 `shell-escape`。
