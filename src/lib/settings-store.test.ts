import { describe, expect, it } from 'vitest';
import { getSettingsStoreFileName } from './settings-store';

describe('getSettingsStoreFileName', () => {
  it('uses a separate store file in development', () => {
    expect(getSettingsStoreFileName(true)).toBe('settings.dev.json');
  });

  it('keeps the release store file stable in production', () => {
    expect(getSettingsStoreFileName(false)).toBe('settings.release.json');
  });
});
