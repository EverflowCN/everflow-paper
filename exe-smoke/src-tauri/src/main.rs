use serde::Serialize;
use std::{
    env, fs,
    path::{Path, PathBuf},
    process::{Command, Stdio},
    time::Instant,
};
use tauri_plugin_dialog::DialogExt;

const TEST_TEX: &str = r#"\documentclass[UTF8,a4paper,fontset=fandol]{ctexart}
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
\item 同一底层现在也用于桌面界面的 question.tex 工程编译。
\end{itemize}
\end{document}
"#;

const AUX_EXTENSIONS: &[&str] = &[
    "aux", "bbl", "bcf", "blg", "fdb_latexmk", "fls", "idx", "ilg", "ind", "lof",
    "log", "lot", "nav", "out", "run.xml", "snm", "synctex.gz", "toc", "vrb",
];

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ProjectInfo {
    project_dir: String,
    template_label: String,
    adapter_id: String,
    entries: Vec<String>,
    selected_entry: String,
    question_path: Option<String>,
    question_preview: String,
    tex_file_count: usize,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct CompileResult {
    pdf_path: String,
    xelatex_path: String,
    distribution: String,
    elapsed_ms: u128,
    passes: u8,
    log: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct CleanResult {
    removed: usize,
    locations: Vec<String>,
}

fn display_path(path: &Path) -> String {
    path.to_string_lossy().into_owned()
}

fn normalize_project_dir(raw: &str) -> Result<PathBuf, String> {
    let trimmed = raw.trim().trim_matches('"');
    if trimmed.is_empty() {
        return Err("请先选择或输入 LaTeX 工程文件夹".to_string());
    }
    let path = PathBuf::from(trimmed);
    let canonical = path
        .canonicalize()
        .map_err(|e| format!("无法访问工程文件夹：{e}"))?;
    if !canonical.is_dir() {
        return Err("所选路径不是文件夹".to_string());
    }
    Ok(canonical)
}

fn should_skip_dir(name: &str) -> bool {
    matches!(
        name.to_ascii_lowercase().as_str(),
        ".git" | ".idea" | ".vscode" | "node_modules" | "target" | "artifacts"
    )
}

fn collect_tex_files(
    root: &Path,
    current: &Path,
    depth: u8,
    output: &mut Vec<PathBuf>,
) -> Result<(), String> {
    if depth > 6 || output.len() >= 500 {
        return Ok(());
    }
    let entries = fs::read_dir(current)
        .map_err(|e| format!("读取目录 {} 失败：{e}", current.display()))?;
    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        let file_type = entry.file_type().map_err(|e| e.to_string())?;
        if file_type.is_dir() {
            let name = entry.file_name().to_string_lossy().into_owned();
            if !should_skip_dir(&name) {
                collect_tex_files(root, &path, depth + 1, output)?;
            }
        } else if file_type.is_file()
            && path
                .extension()
                .is_some_and(|ext| ext.to_string_lossy().eq_ignore_ascii_case("tex"))
        {
            if let Ok(relative) = path.strip_prefix(root) {
                output.push(relative.to_path_buf());
            }
        }
    }
    Ok(())
}

fn normalized_relative(path: &Path) -> String {
    path.components()
        .map(|part| part.as_os_str().to_string_lossy())
        .collect::<Vec<_>>()
        .join("/")
}

fn entry_priority(path: &Path) -> (u8, usize, String) {
    let relative = normalized_relative(path);
    let lower = relative.to_ascii_lowercase();
    let file = path
        .file_name()
        .map(|value| value.to_string_lossy().to_ascii_lowercase())
        .unwrap_or_default();
    let rank = if lower == "question.tex" {
        0
    } else if file == "question.tex" {
        1
    } else if lower == "main.tex" {
        2
    } else if matches!(file.as_str(), "book.tex" | "exam.tex" | "public.tex") {
        3
    } else {
        10
    };
    (rank, path.components().count(), lower)
}

fn read_preview(path: &Path) -> String {
    match fs::read_to_string(path) {
        Ok(content) => {
            let mut end = content.len().min(20_000);
            while !content.is_char_boundary(end) {
                end -= 1;
            }
            let suffix = if end < content.len() {
                "\n\n% ……预览已截断，编译时仍会读取完整文件"
            } else {
                ""
            };
            format!("{}{}", &content[..end], suffix)
        }
        Err(error) => format!("% 无法读取预览：{error}"),
    }
}

fn inspect_project_impl(project_dir: &str) -> Result<ProjectInfo, String> {
    let root = normalize_project_dir(project_dir)?;
    let mut tex_files = Vec::new();
    collect_tex_files(&root, &root, 0, &mut tex_files)?;
    tex_files.sort_by_key(|path| entry_priority(path));
    if tex_files.is_empty() {
        return Err("该文件夹及其子目录中没有找到 .tex 文件".to_string());
    }

    let selected = tex_files[0].clone();
    let question = tex_files
        .iter()
        .find(|path| {
            path.file_name()
                .is_some_and(|name| name.to_string_lossy().eq_ignore_ascii_case("question.tex"))
        })
        .cloned();
    let has_modes = ["book.tex", "exam.tex", "public.tex"].iter().any(|name| {
        tex_files.iter().any(|path| {
            path.file_name()
                .is_some_and(|file| file.to_string_lossy().eq_ignore_ascii_case(name))
        })
    });
    let (adapter_id, template_label) = if question.is_some() {
        ("everflow-question", "Everflow question.tex 工程")
    } else if has_modes {
        ("everflow-three-mode", "Everflow Book / Exam / Public 工程")
    } else {
        ("generic-xelatex", "通用 XeLaTeX 工程")
    };
    let preview_target = question.as_ref().unwrap_or(&selected);
    let question_path = question.as_ref().map(|path| normalized_relative(path));

    Ok(ProjectInfo {
        project_dir: display_path(&root),
        template_label: template_label.to_string(),
        adapter_id: adapter_id.to_string(),
        entries: tex_files.iter().map(|path| normalized_relative(path)).collect(),
        selected_entry: normalized_relative(&selected),
        question_path,
        question_preview: read_preview(&root.join(preview_target)),
        tex_file_count: tex_files.len(),
    })
}

fn find_xelatex() -> Result<PathBuf, String> {
    #[cfg(windows)]
    let mut lookup = Command::new("where.exe");
    #[cfg(not(windows))]
    let mut lookup = Command::new("which");

    let output = lookup
        .arg("xelatex")
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .map_err(|e| format!("无法查询 XeLaTeX 路径：{e}"))?;
    if !output.status.success() {
        return Err(format!(
            "PATH 中未找到 XeLaTeX。请先安装 TeX Live 或 MiKTeX，并重新启动 Everflow。\n{}",
            String::from_utf8_lossy(&output.stderr)
        ));
    }
    String::from_utf8_lossy(&output.stdout)
        .lines()
        .map(str::trim)
        .find(|line| !line.is_empty())
        .map(PathBuf::from)
        .ok_or_else(|| "XeLaTeX 路径查询成功但结果为空".to_string())
}

fn detect_distribution(xelatex: &Path) -> String {
    let output = Command::new(xelatex).arg("--version").output();
    let text = output
        .map(|result| {
            format!(
                "{}{}",
                String::from_utf8_lossy(&result.stdout),
                String::from_utf8_lossy(&result.stderr)
            )
        })
        .unwrap_or_default();
    if text.to_ascii_lowercase().contains("miktex") {
        "MiKTeX".to_string()
    } else if text.to_ascii_lowercase().contains("tex live") {
        "TeX Live".to_string()
    } else {
        "XeLaTeX".to_string()
    }
}

fn resolve_entry(root: &Path, relative: &str) -> Result<PathBuf, String> {
    let candidate = root.join(relative.trim().trim_matches('"'));
    let canonical = candidate
        .canonicalize()
        .map_err(|e| format!("无法访问入口文件：{e}"))?;
    if !canonical.starts_with(root) {
        return Err("入口文件必须位于所选工程文件夹内".to_string());
    }
    if canonical
        .extension()
        .is_none_or(|ext| !ext.to_string_lossy().eq_ignore_ascii_case("tex"))
    {
        return Err("入口文件必须是 .tex 文件".to_string());
    }
    Ok(canonical)
}

fn resolve_output_dir(root: &Path, raw: &str) -> Result<PathBuf, String> {
    let trimmed = raw.trim().trim_matches('"');
    let path = if trimmed.is_empty() {
        root.join("build").join("everflow")
    } else {
        PathBuf::from(trimmed)
    };
    fs::create_dir_all(&path).map_err(|e| format!("创建输出文件夹失败：{e}"))?;
    path.canonicalize()
        .map_err(|e| format!("无法访问输出文件夹：{e}"))
}

fn is_auxiliary(path: &Path) -> bool {
    let name = path
        .file_name()
        .map(|value| value.to_string_lossy().to_ascii_lowercase())
        .unwrap_or_default();
    AUX_EXTENSIONS
        .iter()
        .any(|extension| name.ends_with(&format!(".{extension}")))
}

fn clean_cache_impl(root: &Path, output_dir: &Path) -> Result<CleanResult, String> {
    let mut removed = 0usize;
    let mut locations = Vec::new();
    let mut dirs = vec![root.to_path_buf()];
    if output_dir != root {
        dirs.push(output_dir.to_path_buf());
    }
    for dir in dirs {
        if !dir.is_dir() {
            continue;
        }
        let mut touched = false;
        for entry in fs::read_dir(&dir).map_err(|e| e.to_string())? {
            let path = entry.map_err(|e| e.to_string())?.path();
            if path.is_file() && is_auxiliary(&path) {
                fs::remove_file(&path)
                    .map_err(|e| format!("删除缓存 {} 失败：{e}", path.display()))?;
                removed += 1;
                touched = true;
            }
        }
        if touched {
            locations.push(display_path(&dir));
        }
    }
    Ok(CleanResult { removed, locations })
}

fn run_xelatex_pass(
    xelatex: &Path,
    distribution: &str,
    root: &Path,
    entry: &Path,
    output_dir: &Path,
    pass: u8,
    log: &mut String,
) -> Result<(), String> {
    let mut command = Command::new(xelatex);
    if distribution == "MiKTeX" {
        command.arg("--enable-installer");
    }
    let output_argument = format!("-output-directory={}", output_dir.display());
    let output = command
        .current_dir(root)
        .args([
            "-interaction=nonstopmode",
            "-halt-on-error",
            "-file-line-error",
            "-synctex=1",
        ])
        .arg(output_argument)
        .arg(entry)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .map_err(|e| format!("无法启动 XeLaTeX：{e}"))?;
    let code = output.status.code().unwrap_or(-1);
    log.push_str(&format!(
        "\n=== XeLaTeX 第 {pass} 遍 / exit {code} ===\n{}{}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    ));
    println!("EVERFLOW_XELATEX_EXIT=pass={pass};code={code}");
    if !output.status.success() {
        return Err(format!("XeLaTeX 第 {pass} 遍编译失败\n{log}"));
    }
    Ok(())
}

fn compile_project_impl(
    project_dir: &str,
    entry: &str,
    output_dir: &str,
    clean_before: bool,
) -> Result<CompileResult, String> {
    let started = Instant::now();
    let root = normalize_project_dir(project_dir)?;
    let entry_path = resolve_entry(&root, entry)?;
    let output_path = resolve_output_dir(&root, output_dir)?;
    if clean_before {
        clean_cache_impl(&root, &output_path)?;
    }
    let xelatex = find_xelatex()?;
    let distribution = detect_distribution(&xelatex);
    println!("EVERFLOW_XELATEX_RESOLVED={}", xelatex.display());
    println!("EVERFLOW_XELATEX_DISTRIBUTION={distribution}");

    let mut log = format!(
        "Everflow 编译任务\n工程：{}\n入口：{}\n输出：{}\n引擎：{} ({distribution})\n",
        root.display(),
        entry_path.display(),
        output_path.display(),
        xelatex.display()
    );
    for pass in 1..=2 {
        println!(
            "EVERFLOW_XELATEX_START=pass={pass};exe={}",
            xelatex.display()
        );
        run_xelatex_pass(
            &xelatex,
            &distribution,
            &root,
            &entry_path,
            &output_path,
            pass,
            &mut log,
        )?;
    }

    let stem = entry_path
        .file_stem()
        .ok_or_else(|| "无法确定 PDF 文件名".to_string())?;
    let pdf = output_path.join(stem).with_extension("pdf");
    if !pdf.is_file() {
        return Err(format!("XeLaTeX 返回成功但未找到 PDF：{}", pdf.display()));
    }
    Ok(CompileResult {
        pdf_path: display_path(&pdf),
        xelatex_path: display_path(&xelatex),
        distribution,
        elapsed_ms: started.elapsed().as_millis(),
        passes: 2,
        log,
    })
}

#[tauri::command]
async fn pick_folder(app: tauri::AppHandle) -> Result<Option<String>, String> {
    match app.dialog().file().blocking_pick_folder() {
        Some(selection) => selection
            .into_path()
            .map(|path| Some(display_path(&path)))
            .map_err(|e| format!("读取所选文件夹失败：{e}")),
        None => Ok(None),
    }
}

#[tauri::command]
fn inspect_project(project_dir: String) -> Result<ProjectInfo, String> {
    inspect_project_impl(&project_dir)
}

#[tauri::command]
fn compile_project(
    project_dir: String,
    entry: String,
    output_dir: String,
    clean_before: bool,
) -> Result<CompileResult, String> {
    compile_project_impl(&project_dir, &entry, &output_dir, clean_before)
}

#[tauri::command]
fn clean_cache(project_dir: String, output_dir: String) -> Result<CleanResult, String> {
    let root = normalize_project_dir(&project_dir)?;
    let output = resolve_output_dir(&root, &output_dir)?;
    clean_cache_impl(&root, &output)
}

fn argument_value(args: &[String], name: &str) -> Option<String> {
    args.iter()
        .position(|value| value == name)
        .and_then(|index| args.get(index + 1))
        .cloned()
}

fn self_test(output: Option<String>) -> Result<PathBuf, String> {
    let root = env::temp_dir().join("everflow-exe-smoke");
    if root.exists() {
        fs::remove_dir_all(&root).map_err(|e| format!("清理旧自检目录失败：{e}"))?;
    }
    fs::create_dir_all(&root).map_err(|e| e.to_string())?;
    fs::write(root.join("everflow-exe-self-test.tex"), TEST_TEX.as_bytes())
        .map_err(|e| e.to_string())?;
    let result = compile_project_impl(
        &display_path(&root),
        "everflow-exe-self-test.tex",
        &display_path(&root),
        true,
    )?;
    let generated = PathBuf::from(result.pdf_path);
    let target = output.map(PathBuf::from).unwrap_or_else(|| {
        env::current_dir()
            .unwrap_or_else(|_| PathBuf::from("."))
            .join("Everflow-EXE-self-test.pdf")
    });
    if let Some(parent) = target.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::copy(&generated, &target).map_err(|e| format!("复制 PDF 失败：{e}"))?;
    Ok(target)
}

fn main() {
    let args: Vec<String> = env::args().collect();
    if args.iter().any(|value| value == "--self-test-compile") {
        match self_test(argument_value(&args, "--output")) {
            Ok(path) => {
                println!("EVERFLOW_EXE_COMPILE_OK={}", path.display());
                std::process::exit(0);
            }
            Err(error) => {
                eprintln!("EVERFLOW_EXE_COMPILE_FAILED={error}");
                std::process::exit(2);
            }
        }
    }

    if args.iter().any(|value| value == "--compile-project") {
        let project = argument_value(&args, "--project").unwrap_or_default();
        let entry = argument_value(&args, "--entry").unwrap_or_else(|| "question.tex".into());
        let output = argument_value(&args, "--output-dir").unwrap_or_default();
        match compile_project_impl(&project, &entry, &output, true) {
            Ok(result) => {
                println!("{}", result.log);
                println!("EVERFLOW_EXE_PROJECT_COMPILE_OK={}", result.pdf_path);
                std::process::exit(0);
            }
            Err(error) => {
                eprintln!("EVERFLOW_EXE_PROJECT_COMPILE_FAILED={error}");
                std::process::exit(3);
            }
        }
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            pick_folder,
            inspect_project,
            compile_project,
            clean_cache
        ])
        .run(tauri::generate_context!())
        .expect("启动 Everflow 时发生错误");
}
