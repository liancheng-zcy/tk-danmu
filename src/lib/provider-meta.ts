import type {
  TranslatorConfig,
  TranslatorProviderId
} from '../../shared/events';

export const PROVIDER_OPTIONS: Array<{
  id: TranslatorProviderId;
  label: string;
  description: string;
}> = [
  {
    id: 'aliyun-mt',
    label: '阿里云 MT',
    description: '用于阿里云 DashScope 的文本翻译服务。'
  },
  {
    id: 'microsoft-translator',
    label: '微软翻译',
    description: '用于 Azure Translator 的文本翻译服务。'
  },
  {
    id: 'openai-compatible',
    label: 'OpenAI 兼容',
    description: '用于接入兼容 OpenAI Chat Completions 的模型服务。'
  }
];

export function getProviderConfigLabelMap(provider: TranslatorProviderId): Array<{
  field: keyof TranslatorConfig;
  label: string;
  placeholder: string;
  secret?: boolean;
  required?: boolean;
}> {
  switch (provider) {
    case 'aliyun-mt':
      return [
        {
          field: 'apiKey',
          label: 'API Key',
          placeholder: '阿里云 DashScope API Key',
          secret: true,
          required: true
        }
      ];
    case 'microsoft-translator':
      return [
        {
          field: 'apiKey',
          label: 'API Key',
          placeholder: 'Azure Translator API Key',
          secret: true,
          required: true
        },
        {
          field: 'region',
          label: 'Region',
          placeholder: '例如 eastasia / japanwest',
          required: true
        }
      ];
    case 'openai-compatible':
      return [
        {
          field: 'apiKey',
          label: 'API Key',
          placeholder: '兼容服务 API Key',
          secret: true,
          required: true
        },
        {
          field: 'baseUrl',
          label: 'Base URL',
          placeholder: '例如 https://api.example.com/v1',
          required: true
        },
        {
          field: 'model',
          label: 'Model',
          placeholder: '例如 gpt-4.1-mini',
          required: true
        }
      ];
    default:
      return [];
  }
}

export function getProviderHelperText(provider: TranslatorProviderId): string {
  switch (provider) {
    case 'aliyun-mt':
      return '填写 API Key 后即可启用翻译；未填完整时将只显示原文。';
    case 'microsoft-translator':
      return '需填写 API Key 和 Region；未填完整时将只显示原文。';
    case 'openai-compatible':
      return '需填写 API Key、Base URL 和模型名；未填完整时将只显示原文。';
    default:
      return '';
  }
}

function hasValue(value?: string) {
  return Boolean(value?.trim());
}

export function isProviderConfigReady(
  provider: TranslatorProviderId,
  config: TranslatorConfig
): boolean {
  if (!hasValue(config.apiKey)) {
    return false;
  }

  if (provider === 'microsoft-translator') {
    return hasValue(config.region);
  }

  if (provider === 'openai-compatible') {
    return hasValue(config.baseUrl) && hasValue(config.model);
  }

  return true;
}
