export function parseRoomInput(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) {
    return '';
  }

  if (/^https?:\/\//i.test(trimmed)) {
    const liveMatch = trimmed.match(/@([^/?#]+)(?:\/live)?/i);
    if (liveMatch?.[1]) {
      return liveMatch[1].trim();
    }
  }

  return trimmed.replace(/^@+/, '').trim();
}
