export type CommonLanguageId =
  | 'auto'
  | 'zh-CN'
  | 'zh-TW'
  | 'en'
  | 'ja'
  | 'ko'
  | 'es'
  | 'fr'
  | 'de'
  | 'ru'
  | 'pt'
  | 'vi'
  | 'th'
  | 'id'
  | 'ar';

export type ManualLanguageId = Exclude<CommonLanguageId, 'auto'>;

export interface LanguageOption {
  id: CommonLanguageId;
  label: string;
  promptLabel: string;
}

export const COMMON_LANGUAGE_OPTIONS: LanguageOption[] = [
  { id: 'auto', label: '自动检测', promptLabel: 'Auto Detect' },
  { id: 'zh-CN', label: '简体中文', promptLabel: 'Simplified Chinese' },
  { id: 'zh-TW', label: '繁体中文', promptLabel: 'Traditional Chinese' },
  { id: 'en', label: '英语', promptLabel: 'English' },
  { id: 'ja', label: '日语', promptLabel: 'Japanese' },
  { id: 'ko', label: '韩语', promptLabel: 'Korean' },
  { id: 'es', label: '西班牙语', promptLabel: 'Spanish' },
  { id: 'fr', label: '法语', promptLabel: 'French' },
  { id: 'de', label: '德语', promptLabel: 'German' },
  { id: 'ru', label: '俄语', promptLabel: 'Russian' },
  { id: 'pt', label: '葡萄牙语', promptLabel: 'Portuguese' },
  { id: 'vi', label: '越南语', promptLabel: 'Vietnamese' },
  { id: 'th', label: '泰语', promptLabel: 'Thai' },
  { id: 'id', label: '印尼语', promptLabel: 'Indonesian' },
  { id: 'ar', label: '阿拉伯语', promptLabel: 'Arabic' }
];

export const SOURCE_LANGUAGE_OPTIONS = COMMON_LANGUAGE_OPTIONS;
export const TARGET_LANGUAGE_OPTIONS = COMMON_LANGUAGE_OPTIONS.filter(
  (language) => language.id !== 'auto'
);

export function isCommonLanguageId(value: string): value is CommonLanguageId {
  return COMMON_LANGUAGE_OPTIONS.some((language) => language.id === value);
}

export function isManualLanguageId(value: string): value is ManualLanguageId {
  return TARGET_LANGUAGE_OPTIONS.some((language) => language.id === value);
}

export function getLanguageOption(id: CommonLanguageId): LanguageOption {
  return (
    COMMON_LANGUAGE_OPTIONS.find((language) => language.id === id) ??
    COMMON_LANGUAGE_OPTIONS[0]
  );
}
