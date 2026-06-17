import type { CommonLanguageId } from './protocol';

const CJK = /[\u4e00-\u9fff]/;
const HIRAGANA_OR_KATAKANA = /[\u3040-\u30ff]/;
const HANGUL = /[\uac00-\ud7af]/;
const THAI = /[\u0e00-\u0e7f]/;
const ARABIC = /[\u0600-\u06ff]/;
const CYRILLIC = /[\u0400-\u04ff]/;

export function detectLanguageFromText(text: string): CommonLanguageId {
  if (HIRAGANA_OR_KATAKANA.test(text)) {
    return 'ja';
  }

  if (HANGUL.test(text)) {
    return 'ko';
  }

  if (THAI.test(text)) {
    return 'th';
  }

  if (ARABIC.test(text)) {
    return 'ar';
  }

  if (CYRILLIC.test(text)) {
    return 'ru';
  }

  if (CJK.test(text)) {
    return 'zh-CN';
  }

  return 'en';
}
