import type { WorkerEvent, WorkerStartConfig } from '../../shared/events';
import { getErrorMessage } from './error-message';

const WORKER_EVENT_NAME = 'worker-event';

export function isTauriRuntime() {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export async function getCurrentWindowLabel(): Promise<string> {
  if (!isTauriRuntime()) {
    return 'main';
  }

  const { getCurrentWebviewWindow } = await import('@tauri-apps/api/webviewWindow');
  return getCurrentWebviewWindow().label;
}

export async function openOverlayWindow() {
  if (!isTauriRuntime()) {
    return;
  }

  const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');
  const existing = await WebviewWindow.getByLabel('overlay');
  if (existing) {
    await existing.setFocus();
    return;
  }

  new WebviewWindow('overlay', {
    title: 'TK 弹幕悬浮窗',
    width: 560,
    height: 720,
    alwaysOnTop: true,
    resizable: true,
    center: true,
    decorations: false
  });
}

export async function minimizeWindow() {
  if (!isTauriRuntime()) return;
  const { getCurrentWebviewWindow } = await import('@tauri-apps/api/webviewWindow');
  await getCurrentWebviewWindow().minimize();
}

export async function toggleMaximizeWindow() {
  if (!isTauriRuntime()) return;
  const { getCurrentWebviewWindow } = await import('@tauri-apps/api/webviewWindow');
  await getCurrentWebviewWindow().toggleMaximize();
}

export async function closeWindow() {
  if (!isTauriRuntime()) return;
  const { getCurrentWebviewWindow } = await import('@tauri-apps/api/webviewWindow');
  await getCurrentWebviewWindow().close();
}

/** Start native window dragging from the current mouse position.
 *  Requires core:window:allow-start-dragging in capabilities. */
export async function startDraggingWindow() {
  if (!isTauriRuntime()) return;
  const { getCurrentWebviewWindow } = await import('@tauri-apps/api/webviewWindow');
  await getCurrentWebviewWindow().startDragging();
}

async function invokeCommand<T>(
  command: string,
  payload?: Record<string, unknown>
): Promise<T> {
  if (!isTauriRuntime()) {
    throw new Error('当前不在 Tauri 运行环境中');
  }

  const { invoke } = await import('@tauri-apps/api/core');

  try {
    return await invoke<T>(command, payload);
  } catch (error) {
    throw new Error(getErrorMessage(error, `${command} 执行失败`));
  }
}

export async function getRecentEvents(): Promise<WorkerEvent[]> {
  if (!isTauriRuntime()) {
    return [];
  }

  return invokeCommand<WorkerEvent[]>('get_recent_events');
}

export async function getSessionStatus(): Promise<{ running: boolean }> {
  if (!isTauriRuntime()) {
    return { running: false };
  }

  return invokeCommand<{ running: boolean }>('get_session_status');
}

export async function startSession(config: WorkerStartConfig): Promise<void> {
  return invokeCommand('start_session', { config });
}

export async function stopSession(): Promise<void> {
  if (!isTauriRuntime()) {
    return;
  }

  return invokeCommand('stop_session');
}

export async function listenWorkerEvents(
  listener: (event: WorkerEvent) => void
): Promise<() => void> {
  if (!isTauriRuntime()) {
    return () => undefined;
  }

  const { listen } = await import('@tauri-apps/api/event');
  const unlisten = await listen<WorkerEvent>(WORKER_EVENT_NAME, (event) => {
    listener(event.payload);
  });
  return unlisten;
}
