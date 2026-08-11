# 题目录入

Everflow 继续使用小写 `bbox`，不改为大写环境。

## 标准选择题

```tex
\begin{qitems}[startnum=1]
  \begin{bbox}
    \qitem 题干内容
    \fourchoices
      {选项 A}
      {选项 B}
      {选项 C}
      {选项 D}
    \begin{solution}
      这里写解析。
    \end{solution}
  \end{bbox}
\end{qitems}
```

## 选项数量

支持 3 / 4 / 5 / 6 选项，以及 1 / 2 / 3 / 4 列布局。长选项会自动换行，图片选项也有独立命令。

## 图片位置

题目图片可以位于题干上方、下方、左侧、右侧、选项内或选项旁。工程不会把所有图片强制移动到同一个位置。
