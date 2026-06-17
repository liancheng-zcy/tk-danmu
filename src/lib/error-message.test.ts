import { describe, expect, it } from 'vitest';
import { getErrorMessage } from './error-message';

describe('getErrorMessage', () => {
  it('reads standard Error instances', () => {
    expect(getErrorMessage(new Error('worker failed'), 'fallback')).toBe(
      'worker failed'
    );
  });

  it('reads direct string errors', () => {
    expect(getErrorMessage('missing worker script', 'fallback')).toBe(
      'missing worker script'
    );
  });

  it('reads plain objects that include a message field', () => {
    expect(
      getErrorMessage({ message: 'sidecar spawn failed' }, 'fallback')
    ).toBe('sidecar spawn failed');
  });

  it('falls back for unknown payloads', () => {
    expect(getErrorMessage({ reason: 'unknown' }, 'fallback')).toBe('fallback');
  });
});
