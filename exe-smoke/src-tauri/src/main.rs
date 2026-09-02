use std::{env, fs, path::{Path, PathBuf}, process::{Command, Stdio}};

const TEST_TEX: &str = r#"\documentclass[UTF8,a4paper]{ctexart}
\usepackage{amsmath,amssymb,booktabs,multirow,geometry,xcolor}
\geometry{margin=22mm}
\definecolor{everflow}{HTML}{345995}
\title{\textcolor{everflow}{Everflow EXE 编译自检}}
\author{由 Windows Everflow.exe 直接调用 XeLaTeX 生成}
\date{\today}
\begin{document}
\maketitle
\section*{端到端验证}
如果你正在查看这份 PDF，说明以下链路已经真实跑通：
\[
\texttt{Everflow.exe}\;\longrightarrow\;\texttt{XeLaTeX}\;\longrightarrow\;\texttt{PDF}
\]
这不是预先放好的 PDF，而是 Windows CI 先构建 Everflow 的 EXE，再运行该 EXE 后现场生成。

\section*{中文与数学公式}
设 $f(x)=x^2+2x+1$，则
\[
\int_0^1 f(x)\,dx=\frac{7}{3}.
\]

\section*{408 风格表格 / multirow}
\begin{center}
\begin{tabular}{cccc}
\toprule
进程 & \multicolumn{2}{c}{资源状态} & 备注\\
\cmidrule(lr){2-3}
 & A & B & \\
\midrule
\multirow{2}{*}{P1} & 1 & 2 & 第一行\\
 & 2 & 3 & 第二行\\
P2 & 0 & 1 & 可继续执行\\
\bottomrule
\end{tabular}
\end{center}

\section*{Everflow 测试结论}
\begin{itemize}
\item Windows EXE 已实际启动；
\item EXE 已找到并调用 XeLaTeX；
\item 中文、数学公式和 multirow 表格均参与真实编译；
\item 下一步才是把同一链路替换成完整默认母版的 288 道题。
\end{itemize}
\end{document}
"#;

fn run_xelatex(dir: &Path, tex_name: &str) -> Result<(), String> {
    let out = Command::new("xelatex")
        .current_dir(dir)
        .args(["--enable-installer", "-interaction=nonstopmode", "-halt-on-error", "-file-line-error", tex_name])
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .map_err(|e| format!("无法启动 XeLaTeX: {e}"))?;
    if !out.status.success() {
        return Err(format!("XeLaTeX 失败\nstdout:\n{}\nstderr:\n{}", String::from_utf8_lossy(&out.stdout), String::from_utf8_lossy(&out.stderr)));
    }
    Ok(())
}

fn self_test(output: Option<String>) -> Result<PathBuf, String> {
    let root = env::temp_dir().join("everflow-exe-smoke");
    if root.exists() { let _ = fs::remove_dir_all(&root); }
    fs::create_dir_all(&root).map_err(|e| e.to_string())?;
    let tex = root.join("everflow-exe-self-test.tex");
    fs::write(&tex, TEST_TEX.as_bytes()).map_err(|e| e.to_string())?;
    run_xelatex(&root, "everflow-exe-self-test.tex")?;
    run_xelatex(&root, "everflow-exe-self-test.tex")?;
    let pdf = root.join("everflow-exe-self-test.pdf");
    if !pdf.is_file() { return Err("XeLaTeX 返回成功但 PDF 不存在".into()); }
    let target = output.map(PathBuf::from).unwrap_or_else(|| env::current_dir().unwrap_or_else(|_| PathBuf::from(".")).join("Everflow-EXE-self-test.pdf"));
    if let Some(parent) = target.parent() { fs::create_dir_all(parent).map_err(|e|e.to_string())?; }
    fs::copy(&pdf, &target).map_err(|e| format!("复制 PDF 失败: {e}"))?;
    Ok(target)
}

fn main() {
    let args: Vec<String> = env::args().collect();
    if args.iter().any(|a| a == "--self-test-compile") {
        let output = args.iter().position(|a| a == "--output").and_then(|i| args.get(i + 1)).cloned();
        match self_test(output) {
            Ok(path) => { println!("EVERFLOW_EXE_COMPILE_OK={}", path.display()); std::process::exit(0); }
            Err(err) => { eprintln!("EVERFLOW_EXE_COMPILE_FAILED={err}"); std::process::exit(2); }
        }
    }

    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("启动 Everflow EXE smoke 时发生错误");
}
