use std::{fs, path::PathBuf};

fn ensure_worker_bundle_placeholder() {
    let bundle_path = PathBuf::from("../worker/bundle/index.cjs");

    if bundle_path.exists() {
        return;
    }

    if let Some(parent) = bundle_path.parent() {
        let _ = fs::create_dir_all(parent);
    }

    let placeholder = "throw new Error('worker bundle missing; run npm run build:worker');\n";
    let _ = fs::write(bundle_path, placeholder);
}

fn main() {
    ensure_worker_bundle_placeholder();
    tauri_build::build()
}
