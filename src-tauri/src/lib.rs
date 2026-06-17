use std::{
    collections::VecDeque,
    fs::{self, OpenOptions},
    io::{BufRead, BufReader, Write},
    path::{Path, PathBuf},
    process::{Child, Command as StdCommand, Stdio},
    sync::{Arc, Mutex},
    thread,
    time::Duration,
};

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::{AppHandle, Emitter, Manager, State};

const WORKER_EVENT_NAME: &str = "worker-event";
const MAX_EVENT_BUFFER: usize = 800;
const WORKER_DEBUG_DIR_NAME: &str = "tk-danmu-translator";
const WORKER_DEBUG_LOG_NAME: &str = "worker-launch.log";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct TranslatorConfig {
    api_key: String,
    region: Option<String>,
    workspace: Option<String>,
    base_url: Option<String>,
    model: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct WorkerStartConfig {
    room_input: String,
    proxy_url: String,
    translator_provider: String,
    translator_config: TranslatorConfig,
    source_language: String,
    target_language: String,
}

#[derive(Debug, Serialize)]
struct SessionStatus {
    running: bool,
}

struct RunningWorker {
    child: Arc<Mutex<Child>>,
}

struct SharedState {
    events: Arc<Mutex<VecDeque<Value>>>,
    worker: Arc<Mutex<Option<RunningWorker>>>,
}

fn now_iso() -> String {
    chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true)
}

fn push_event(app: &AppHandle, state: &SharedState, value: Value) -> Result<(), String> {
    {
        let mut events = state
            .events
            .lock()
            .map_err(|_| "事件缓冲区状态异常".to_string())?;
        if events.len() >= MAX_EVENT_BUFFER {
            events.pop_front();
        }
        events.push_back(value.clone());
    }

    app.emit(WORKER_EVENT_NAME, value)
        .map_err(|error| error.to_string())
}

fn emit_error(app: &AppHandle, state: &SharedState, message: impl Into<String>) {
    let payload = serde_json::json!({
        "type": "error",
        "message": message.into(),
        "timestamp": now_iso()
    });
    let _ = push_event(app, state, payload);
}

fn emit_status(app: &AppHandle, state: &SharedState, level: &str, message: impl Into<String>) {
    let payload = serde_json::json!({
        "type": "status",
        "level": level,
        "message": message.into(),
        "timestamp": now_iso()
    });
    let _ = push_event(app, state, payload);
}

fn worker_debug_log_path() -> PathBuf {
    std::env::temp_dir()
        .join(WORKER_DEBUG_DIR_NAME)
        .join(WORKER_DEBUG_LOG_NAME)
}

fn append_worker_debug_log(line: impl AsRef<str>) {
    let log_path = worker_debug_log_path();

    if let Some(parent) = log_path.parent() {
        let _ = fs::create_dir_all(parent);
    }

    let content = format!("[{}] {}\n", now_iso(), line.as_ref());

    if let Ok(mut file) = OpenOptions::new().create(true).append(true).open(&log_path) {
        let _ = file.write_all(content.as_bytes());
    }
}

fn should_surface_stderr_line(line: &str) -> bool {
    let trimmed = line.trim();
    if trimmed.is_empty() {
        return false;
    }

    let noisy_prefixes = [
        "at ",
        "requireStack:",
        "Require stack:",
        "Node.js ",
        "code:",
        "syscall:",
        "path:",
        "errno:",
        "{",
        "}",
        "]",
        "'",
    ];

    if noisy_prefixes
        .iter()
        .any(|prefix| trimmed.starts_with(prefix))
    {
        return false;
    }

    true
}

fn resolve_worker_script(app: &AppHandle) -> Result<PathBuf, String> {
    let resource_dir = app
        .path()
        .resource_dir()
        .map_err(|error| error.to_string())?;
    resolve_worker_script_in_resource_dir(&resource_dir)
}

fn resolve_worker_script_in_resource_dir(resource_dir: &Path) -> Result<PathBuf, String> {
    let candidates = [
        resource_dir.join("worker").join("bundle").join("index.cjs"),
        resource_dir
            .join("_up_")
            .join("worker")
            .join("bundle")
            .join("index.cjs"),
        resource_dir.join("worker").join("dist").join("index.js"),
        resource_dir
            .join("_up_")
            .join("worker")
            .join("dist")
            .join("index.js"),
    ];

    candidates
        .iter()
        .find(|path| path.exists())
        .cloned()
        .ok_or_else(|| {
            let checked_paths = candidates
                .iter()
                .map(|path| path.display().to_string())
                .collect::<Vec<_>>()
                .join(" | ");
            format!("找不到 worker 产物，已检查路径：{checked_paths}")
        })
}

fn resolve_node_runtime(app: &AppHandle) -> Result<PathBuf, String> {
    let resource_dir = app
        .path()
        .resource_dir()
        .map_err(|error| error.to_string())?;
    resolve_node_runtime_in_resource_dir(&resource_dir)
}

fn resolve_node_runtime_in_resource_dir(resource_dir: &Path) -> Result<PathBuf, String> {
    let candidates = [resource_dir.join("node.exe"), resource_dir.join("node")];

    candidates
        .iter()
        .find(|path| path.exists())
        .cloned()
        .ok_or_else(|| {
            let checked_paths = candidates
                .iter()
                .map(|path| path.display().to_string())
                .collect::<Vec<_>>()
                .join(" | ");
            format!("找不到 Node 运行时，已检查路径：{checked_paths}")
        })
}

fn resolve_worker_cwd(script_path: &Path) -> PathBuf {
    script_path
        .parent()
        .map(Path::to_path_buf)
        .unwrap_or_else(|| PathBuf::from("."))
}

/// Strip the Windows verbatim (`\\?\`) prefix from a path.
/// Node.js's module resolver (specifically `realpathSync` in
/// `resolveMainPath`) does not handle `\\?\`-prefixed paths correctly and
/// silently truncates them to the drive letter (e.g. `D:`), which then
/// fails with `EISDIR`. Tauri returns these prefixed paths from
/// `resource_dir()` on Windows, so we must clean them before passing to
/// the child process.
fn normalize_win32_path(path: &Path) -> PathBuf {
    let s = path.to_string_lossy();
    let cleaned = if let Some(unc) = s.strip_prefix(r"\\?\UNC\") {
        format!(r"\\{}", unc)
    } else if let Some(verbatim) = s.strip_prefix(r"\\?\") {
        verbatim.to_string()
    } else {
        s.to_string()
    };
    PathBuf::from(cleaned)
}

const CREATE_NO_WINDOW: u32 = 0x08000000;

fn create_worker_command(node_path: &Path, script_path: &Path) -> StdCommand {
    let mut command = StdCommand::new(normalize_win32_path(node_path));
    command
        .arg(normalize_win32_path(script_path))
        .current_dir(normalize_win32_path(&resolve_worker_cwd(script_path)))
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    #[cfg(target_os = "windows")]
    command.creation_flags(CREATE_NO_WINDOW);
    command
}

fn clear_running_worker_if_current(
    worker_state: &Arc<Mutex<Option<RunningWorker>>>,
    child_handle: &Arc<Mutex<Child>>,
) -> bool {
    match worker_state.lock() {
        Ok(mut worker) => {
            let should_clear = worker
                .as_ref()
                .map(|running| Arc::ptr_eq(&running.child, child_handle))
                .unwrap_or(false);

            if should_clear {
                *worker = None;
            }

            should_clear
        }
        Err(_) => false,
    }
}

fn spawn_stdout_pump(
    app_handle: AppHandle,
    shared: SharedState,
    stdout: impl std::io::Read + Send + 'static,
) {
    thread::spawn(move || {
        let reader = BufReader::new(stdout);

        for line in reader.lines() {
            match line {
                Ok(line) => {
                    let trimmed = line.trim();
                    if trimmed.is_empty() {
                        continue;
                    }

                    append_worker_debug_log(format!("stdout: {trimmed}"));

                    match serde_json::from_str::<Value>(trimmed) {
                        Ok(value) => {
                            let _ = push_event(&app_handle, &shared, value);
                        }
                        Err(error) => {
                            emit_error(
                                &app_handle,
                                &shared,
                                format!("worker 输出解析失败：{error}"),
                            );
                        }
                    }
                }
                Err(error) => {
                    emit_error(
                        &app_handle,
                        &shared,
                        format!("读取 worker 标准输出失败：{error}"),
                    );
                    break;
                }
            }
        }
    });
}

fn spawn_stderr_pump(
    app_handle: AppHandle,
    shared: SharedState,
    stderr: impl std::io::Read + Send + 'static,
) {
    thread::spawn(move || {
        let reader = BufReader::new(stderr);

        for line in reader.lines() {
            match line {
                Ok(line) => {
                    let trimmed = line.trim();
                    if trimmed.is_empty() {
                        continue;
                    }

                    append_worker_debug_log(format!("stderr: {trimmed}"));

                    if !should_surface_stderr_line(trimmed) {
                        continue;
                    }

                    if trimmed.starts_with("Error:") {
                        emit_error(
                            &app_handle,
                            &shared,
                            trimmed.trim_start_matches("Error: ").trim(),
                        );
                    } else {
                        emit_status(&app_handle, &shared, "warning", trimmed);
                    }
                }
                Err(error) => {
                    emit_error(
                        &app_handle,
                        &shared,
                        format!("读取 worker 标准错误失败：{error}"),
                    );
                    break;
                }
            }
        }
    });
}

fn spawn_exit_watcher(
    app_handle: AppHandle,
    shared: SharedState,
    worker_state: Arc<Mutex<Option<RunningWorker>>>,
    child_handle: Arc<Mutex<Child>>,
) {
    thread::spawn(move || loop {
        let try_wait_result = match child_handle.lock() {
            Ok(mut child) => child.try_wait(),
            Err(_) => {
                emit_error(&app_handle, &shared, "worker 状态锁异常");
                break;
            }
        };

        match try_wait_result {
            Ok(Some(status)) => {
                let was_current = clear_running_worker_if_current(&worker_state, &child_handle);
                append_worker_debug_log(format!(
                    "worker terminated: code={:?}, success={}",
                    status.code(),
                    status.success()
                ));

                if was_current {
                    let level = if status.success() { "info" } else { "warning" };
                    emit_status(
                        &app_handle,
                        &shared,
                        level,
                        format!("worker 已退出 (code: {:?}, signal: None)", status.code()),
                    );
                }

                break;
            }
            Ok(None) => thread::sleep(Duration::from_millis(200)),
            Err(error) => {
                let was_current = clear_running_worker_if_current(&worker_state, &child_handle);
                append_worker_debug_log(format!("worker try_wait failed: {error}"));

                if was_current {
                    emit_error(
                        &app_handle,
                        &shared,
                        format!("检查 worker 状态失败：{error}"),
                    );
                }

                break;
            }
        }
    });
}

#[tauri::command]
async fn get_recent_events(state: State<'_, SharedState>) -> Result<Vec<Value>, String> {
    let events = state
        .events
        .lock()
        .map_err(|_| "事件缓冲区状态异常".to_string())?;
    Ok(events.iter().cloned().collect())
}

#[tauri::command]
async fn get_session_status(state: State<'_, SharedState>) -> Result<SessionStatus, String> {
    let worker = state
        .worker
        .lock()
        .map_err(|_| "worker 状态异常".to_string())?;
    Ok(SessionStatus {
        running: worker.is_some(),
    })
}

#[tauri::command]
async fn stop_session(state: State<'_, SharedState>) -> Result<(), String> {
    let mut worker = state
        .worker
        .lock()
        .map_err(|_| "worker 状态异常".to_string())?;

    if let Some(running) = worker.take() {
        let mut child = running
            .child
            .lock()
            .map_err(|_| "worker 状态异常".to_string())?;
        child.kill().map_err(|error| error.to_string())?;
    }

    Ok(())
}

#[tauri::command]
async fn start_session(
    app: AppHandle,
    state: State<'_, SharedState>,
    config: WorkerStartConfig,
) -> Result<(), String> {
    {
        let worker = state
            .worker
            .lock()
            .map_err(|_| "worker 状态异常".to_string())?;
        if worker.is_some() {
            return Err("已有会话正在运行，请先停止当前连接。".to_string());
        }
    }

    {
        let mut events = state
            .events
            .lock()
            .map_err(|_| "事件缓冲区状态异常".to_string())?;
        events.clear();
    }

    let script_path = resolve_worker_script(&app)?;
    let node_path = resolve_node_runtime(&app)?;
    if !script_path.exists() {
        return Err(format!(
            "找不到 worker 脚本：{}，请先完成构建。",
            script_path.display()
        ));
    }

    let worker_cwd = resolve_worker_cwd(&script_path);
    append_worker_debug_log(format!(
        "launch request: node={}, script={}, cwd={}, roomInput={}, provider={}, log={}",
        node_path.display(),
        script_path.display(),
        worker_cwd.display(),
        config.room_input,
        config.translator_provider,
        worker_debug_log_path().display()
    ));

    let config_json = serde_json::to_string(&config).map_err(|error| error.to_string())?;
    let mut worker_command = create_worker_command(&node_path, &script_path);
    let mut child = worker_command.spawn().map_err(|error| {
        append_worker_debug_log(format!("spawn failed: {error}"));
        error.to_string()
    })?;
    append_worker_debug_log(format!("spawned pid={}", child.id()));

    let mut stdin = child
        .stdin
        .take()
        .ok_or_else(|| "worker stdin 不可用".to_string())?;
    stdin
        .write_all(format!("{config_json}\n").as_bytes())
        .map_err(|error| error.to_string())?;
    stdin.flush().map_err(|error| error.to_string())?;
    drop(stdin);

    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| "worker stdout 不可用".to_string())?;
    let stderr = child
        .stderr
        .take()
        .ok_or_else(|| "worker stderr 不可用".to_string())?;
    let child_handle = Arc::new(Mutex::new(child));

    {
        let mut worker = state
            .worker
            .lock()
            .map_err(|_| "worker 状态异常".to_string())?;
        *worker = Some(RunningWorker {
            child: child_handle.clone(),
        });
    }

    let app_handle = app.clone();
    let state_handle = state.inner().worker.clone();
    let shared = SharedState {
        events: state.inner().events.clone(),
        worker: state_handle.clone(),
    };

    spawn_stdout_pump(
        app_handle.clone(),
        SharedState {
            events: shared.events.clone(),
            worker: shared.worker.clone(),
        },
        stdout,
    );
    spawn_stderr_pump(
        app_handle.clone(),
        SharedState {
            events: shared.events.clone(),
            worker: shared.worker.clone(),
        },
        stderr,
    );
    spawn_exit_watcher(app_handle, shared, state_handle, child_handle);

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(SharedState {
            events: Arc::new(Mutex::new(VecDeque::new())),
            worker: Arc::new(Mutex::new(None)),
        })
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            start_session,
            stop_session,
            get_recent_events,
            get_session_status
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use std::{
        fs,
        io::Write,
        path::PathBuf,
        time::{SystemTime, UNIX_EPOCH},
    };

    use serde_json::Value;

    use super::{
        create_worker_command, resolve_node_runtime_in_resource_dir, resolve_worker_cwd,
        resolve_worker_script_in_resource_dir, should_surface_stderr_line,
    };

    fn unique_temp_dir(name: &str) -> std::path::PathBuf {
        let suffix = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time should be after unix epoch")
            .as_nanos();

        std::env::temp_dir().join(format!("{}_{}", name, suffix))
    }

    #[test]
    fn resolves_worker_script_from_direct_resource_layout() {
        let base = unique_temp_dir("worker_direct");
        let direct = base.join("worker").join("dist");
        fs::create_dir_all(&direct).expect("should create direct worker dir");
        fs::write(direct.join("index.js"), "console.log('ok');")
            .expect("should create direct worker script");

        let resolved = resolve_worker_script_in_resource_dir(&base)
            .expect("should resolve direct worker script");

        assert_eq!(resolved, direct.join("index.js"));
    }

    #[test]
    fn resolves_worker_bundle_from_direct_resource_layout() {
        let base = unique_temp_dir("worker_bundle_direct");
        let bundle = base.join("worker").join("bundle");
        fs::create_dir_all(&bundle).expect("should create direct worker bundle dir");
        fs::write(bundle.join("index.cjs"), "console.log('ok');")
            .expect("should create direct worker bundle");

        let resolved = resolve_worker_script_in_resource_dir(&base)
            .expect("should resolve direct worker bundle");

        assert_eq!(resolved, bundle.join("index.cjs"));
    }

    #[test]
    fn resolves_worker_script_from_up_resource_layout() {
        let base = unique_temp_dir("worker_up");
        let fallback = base.join("_up_").join("worker").join("dist");
        fs::create_dir_all(&fallback).expect("should create fallback worker dir");
        fs::write(fallback.join("index.js"), "console.log('ok');")
            .expect("should create fallback worker script");

        let resolved = resolve_worker_script_in_resource_dir(&base)
            .expect("should resolve fallback worker script");

        assert_eq!(resolved, fallback.join("index.js"));
    }

    #[test]
    fn resolves_worker_bundle_from_up_resource_layout() {
        let base = unique_temp_dir("worker_bundle_up");
        let fallback = base.join("_up_").join("worker").join("bundle");
        fs::create_dir_all(&fallback).expect("should create fallback worker bundle dir");
        fs::write(fallback.join("index.cjs"), "console.log('ok');")
            .expect("should create fallback worker bundle");

        let resolved = resolve_worker_script_in_resource_dir(&base)
            .expect("should resolve fallback worker bundle");

        assert_eq!(resolved, fallback.join("index.cjs"));
    }

    #[test]
    fn resolves_node_runtime_from_resource_layout() {
        let base = unique_temp_dir("node_runtime");
        fs::create_dir_all(&base).expect("should create resource dir");
        fs::write(base.join("node.exe"), "binary").expect("should create node runtime");

        let resolved =
            resolve_node_runtime_in_resource_dir(&base).expect("should resolve node runtime");

        assert_eq!(resolved, base.join("node.exe"));
    }

    #[test]
    fn resolves_worker_cwd_from_script_parent() {
        let script_path =
            PathBuf::from(r"Z:\fake-project\_up_\worker\bundle\index.cjs");
        assert_eq!(
            resolve_worker_cwd(&script_path),
            PathBuf::from(r"Z:\fake-project\_up_\worker\bundle")
        );
    }

    #[test]
    fn filters_noisy_node_stderr_lines() {
        assert!(!should_surface_stderr_line("syscall: 'lstat',"));
        assert!(!should_surface_stderr_line("path: 'D:'"));
        assert!(!should_surface_stderr_line("errno: -4068,"));
    }

    #[test]
    fn keeps_primary_error_lines() {
        assert!(should_surface_stderr_line(
            "Error: Cannot find module 'https-proxy-agent'"
        ));
        assert!(should_surface_stderr_line(
            "EISDIR: illegal operation on a directory, lstat 'D:'"
        ));
    }

    #[cfg(target_os = "windows")]
    fn bundled_node_binary() -> std::path::PathBuf {
        let binaries_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("binaries");
        fs::read_dir(&binaries_dir)
            .expect("should read binaries dir")
            .filter_map(|entry| entry.ok())
            .map(|entry| entry.path())
            .find(|path| {
                path.file_name()
                    .and_then(|name| name.to_str())
                    .map(|name| name.starts_with("node-") && name.ends_with(".exe"))
                    .unwrap_or(false)
            })
            .expect("should find bundled node sidecar")
    }

    #[cfg(target_os = "windows")]
    #[test]
    fn bundled_node_handles_space_path_and_stdin() {
        let base = unique_temp_dir("worker smoke with spaces");
        fs::create_dir_all(&base).expect("should create smoke test dir");

        let script_path = base.join("echo worker.js");
        fs::write(
            &script_path,
            r#"
process.stdin.setEncoding('utf8');
let buffer = '';
process.stdin.on('data', (chunk) => {
  buffer += chunk;
  if (buffer.includes('\n')) {
    const line = buffer.split(/\r?\n/)[0];
    console.log(JSON.stringify({ cwd: process.cwd(), line }));
    process.exit(0);
  }
});
"#,
        )
        .expect("should write smoke test script");

        let node_path = bundled_node_binary();
        let mut child = create_worker_command(&node_path, &script_path)
            .spawn()
            .expect("should spawn bundled node");

        let mut stdin = child.stdin.take().expect("stdin should be piped");
        stdin
            .write_all(b"hello from rust\n")
            .expect("should write config line");
        drop(stdin);

        let output = child
            .wait_with_output()
            .expect("should wait for smoke test output");
        assert!(
            output.status.success(),
            "smoke test should succeed, stderr: {}",
            String::from_utf8_lossy(&output.stderr)
        );

        let parsed: Value =
            serde_json::from_slice(&output.stdout).expect("stdout should be valid json");
        assert_eq!(parsed["line"], "hello from rust");
        assert_eq!(parsed["cwd"], base.display().to_string());
    }

    #[test]
    fn normalizes_verbatim_win32_path() {
        let p = super::normalize_win32_path(&PathBuf::from(r"\\?\D:\path\to\file.js"));
        assert_eq!(p, PathBuf::from(r"D:\path\to\file.js"));
    }

    #[test]
    fn normalizes_verbatim_unc_path() {
        let p = super::normalize_win32_path(&PathBuf::from(r"\\?\UNC\server\share\file.js"));
        assert_eq!(p, PathBuf::from(r"\\server\share\file.js"));
    }

    #[test]
    fn leaves_regular_path_unchanged() {
        let p = super::normalize_win32_path(&PathBuf::from(r"D:\path\to\file.js"));
        assert_eq!(p, PathBuf::from(r"D:\path\to\file.js"));
    }
}
