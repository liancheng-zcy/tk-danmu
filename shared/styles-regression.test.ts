import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const stylesPath = join(process.cwd(), 'src', 'styles.css');
const styles = readFileSync(stylesPath, 'utf8');

describe('styles regression', () => {
  it('constrains the overlay window to scroll inside the message list', () => {
    expect(styles).toMatch(
      /(^|\n)[^{]*\.overlay-shell[^{]*\{[^}]*\n\s*height:\s*100dvh;[^}]*\}/m
    );
    expect(styles).toMatch(
      /\.message-list-shell\s*\{[^}]*height:\s*100%;[^}]*overflow:\s*hidden;[^}]*\}/m
    );
  });
});
