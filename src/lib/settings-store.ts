import { DEFAULT_SETTINGS, normalizeSettings } from '../../shared/config';
import type { AppSettings } from '../../shared/events';

interface StoreLike {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown): Promise<void>;
  save?(): Promise<void>;
}

class MemoryStore implements StoreLike {
  async get<T>(key: string): Promise<T | null> {
    if (typeof window === 'undefined') {
      return null;
    }

    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  }

  async set(key: string, value: unknown) {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(key, JSON.stringify(value));
  }

  async save() {
    return;
  }
}

let storePromise: Promise<StoreLike> | null = null;

function isTauriRuntime() {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export function getSettingsStoreFileName(isDev: boolean) {
  return isDev ? 'settings.dev.json' : 'settings.release.json';
}

async function getStore(): Promise<StoreLike> {
  if (!storePromise) {
    storePromise = (async () => {
      if (!isTauriRuntime()) {
        return new MemoryStore();
      }

      const { load } = await import('@tauri-apps/plugin-store');
      return load(getSettingsStoreFileName(import.meta.env.DEV), {
        autoSave: 100,
        defaults: {
          settings: DEFAULT_SETTINGS
        }
      }) as unknown as StoreLike;
    })();
  }

  return storePromise;
}

export async function loadSettings(): Promise<AppSettings> {
  const store = await getStore();
  const settings = await store.get<AppSettings>('settings');
  return normalizeSettings(settings ?? DEFAULT_SETTINGS);
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const store = await getStore();
  await store.set('settings', settings);
  await store.save?.();
}
