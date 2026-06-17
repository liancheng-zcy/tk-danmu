import { SOURCE_LANGUAGE_OPTIONS, TARGET_LANGUAGE_OPTIONS } from '../../shared/languages';
import type {
  AppSettings,
  ThemeMode,
  TranslatorConfig,
  TranslatorProviderId
} from '../../shared/events';
import {
  getProviderConfigLabelMap,
  getProviderHelperText,
  isProviderConfigReady,
  PROVIDER_OPTIONS
} from '../lib/provider-meta';

type ChangeField = keyof AppSettings;

interface ControlPanelProps {
  settings: AppSettings;
  isRunning: boolean;
  onStart: () => void;
  onStop: () => void;
  onOpenOverlay: () => void;
  onChange: <K extends ChangeField>(field: K, value: AppSettings[K]) => void;
  onTranslatorConfigChange?: (
    provider: TranslatorProviderId,
    field: keyof TranslatorConfig,
    value: string
  ) => void;
}

function renderThemeButton(
  currentTheme: ThemeMode,
  targetTheme: ThemeMode,
  label: string,
  onChange: ControlPanelProps['onChange']
) {
  const active = currentTheme === targetTheme;
  return (
    <button
      key={targetTheme}
      type="button"
      className={`segmented-button${active ? ' segmented-button-active' : ''}`}
      aria-pressed={active}
      onClick={() => onChange('themeMode', targetTheme)}
    >
      {label}
    </button>
  );
}

export function ControlPanel({
  settings,
  isRunning,
  onStart,
  onStop,
  onOpenOverlay,
  onChange,
  onTranslatorConfigChange
}: ControlPanelProps) {
  const activeProvider = settings.translatorProvider;
  const providerConfig = settings.translatorConfig[activeProvider];
  const configFields = getProviderConfigLabelMap(activeProvider);
  const providerMeta = PROVIDER_OPTIONS.find((option) => option.id === activeProvider);
  const providerReady = isProviderConfigReady(activeProvider, providerConfig);

  return (
    <section className="control-panel">
      <div className="panel-topbar">
        <div className="brand-block">
          <p className="eyebrow">Desktop Console</p>
          <h1>TK 弹幕翻译</h1>
          <p className="panel-description">
            实时抓取弹幕，智能翻译，悬浮窗展示。
          </p>
        </div>
      </div>

      <div className="session-toolbar">
        <div className="status-ribbon">
          <span className={`status-pill ${isRunning ? 'status-live' : 'status-idle'}`}>
            {isRunning ? '会话运行中' : '等待连接'}
          </span>
          <span className="status-pill status-subtle">
            {settings.showGifts ? '显示礼物' : '仅看弹幕'}
          </span>
          <span className="status-pill status-subtle">
            {settings.overlayMode === 'translation-only'
              ? '悬浮窗仅显示译文'
              : '悬浮窗双语模式'}
          </span>
        </div>

        <div className="action-row action-row-primary">
          {isRunning ? (
            <button type="button" className="primary-button" onClick={onStop}>
              停止监听
            </button>
          ) : (
            <button type="button" className="primary-button" onClick={onStart}>
              开始监听
            </button>
          )}

          <button type="button" className="ghost-button" onClick={onOpenOverlay}>
            打开悬浮窗
          </button>
        </div>
      </div>

      <div className="section-card">
        <div className="section-header">
          <div>
            <p className="eyebrow">Theme</p>
            <h2>外观模式</h2>
          </div>
          <div className="segmented-control" role="group" aria-label="主题模式">
            {renderThemeButton(settings.themeMode, 'light', '浅色', onChange)}
            {renderThemeButton(settings.themeMode, 'dark', '深色', onChange)}
          </div>
        </div>
      </div>

      <div className="section-card">
        <div className="section-header">
          <div>
            <p className="eyebrow">Source</p>
            <h2>直播连接</h2>
          </div>
        </div>

        <div className="field-grid field-grid-single">
          <label className="field">
            <span className="field-label">直播间</span>
            <input
              aria-label="直播间"
              value={settings.roomInput}
              onChange={(event) => onChange('roomInput', event.target.value)}
              placeholder="@username 或完整直播链接"
            />
          </label>

          <label className="field">
            <span className="field-label">代理地址</span>
            <input
              aria-label="代理地址"
              value={settings.proxyUrl}
              onChange={(event) => onChange('proxyUrl', event.target.value)}
              placeholder="可选，例如 http://127.0.0.1:7890"
            />
          </label>
        </div>
      </div>

      <div className="section-card">
        <div className="section-header">
          <div>
            <p className="eyebrow">Translation</p>
            <h2>翻译设置</h2>
          </div>
        </div>

        <div className="field-grid">
          <label className="field">
            <span className="field-label">翻译服务</span>
            <select
              aria-label="翻译服务"
              value={activeProvider}
              onChange={(event) =>
                onChange('translatorProvider', event.target.value as TranslatorProviderId)
              }
            >
              {PROVIDER_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span className="field-label">源语言</span>
            <select
              aria-label="源语言"
              value={settings.sourceLanguage}
              onChange={(event) =>
                onChange('sourceLanguage', event.target.value as AppSettings['sourceLanguage'])
              }
            >
              {SOURCE_LANGUAGE_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span className="field-label">目标语言</span>
            <select
              aria-label="目标语言"
              value={settings.targetLanguage}
              onChange={(event) =>
                onChange('targetLanguage', event.target.value as AppSettings['targetLanguage'])
              }
            >
              {TARGET_LANGUAGE_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="section-card provider-spotlight">
        <div className="provider-header">
          <div>
            <p className="eyebrow">Provider</p>
            <h2>{providerMeta?.label ?? '翻译服务'}</h2>
          </div>
          <span className="provider-badge">
            {providerReady ? '翻译已启用' : '未完成配置'}
          </span>
        </div>

        <p className="provider-description">{providerMeta?.description}</p>
        <p className="helper-note">{getProviderHelperText(activeProvider)}</p>

        <div className="field-grid field-grid-single">
          {configFields.map((field) => (
            <label className="field" key={field.field}>
              <span className="field-label">
                {field.label}
                {field.required ? <span className="required-mark">必填</span> : null}
              </span>
              <input
                aria-label={field.label}
                type={field.secret ? 'password' : 'text'}
                value={providerConfig[field.field] ?? ''}
                placeholder={field.placeholder}
                onChange={(event) =>
                  onTranslatorConfigChange?.(
                    activeProvider,
                    field.field,
                    event.target.value
                  )
                }
              />
            </label>
          ))}
        </div>

        <div className="notice-banner notice-banner-muted">
          未填完整配置也可以抓取弹幕，但此时只会显示原文，不会调用翻译服务。
        </div>
      </div>

      <div className="section-card">
        <div className="section-header">
          <div>
            <p className="eyebrow">Display</p>
            <h2>显示偏好</h2>
          </div>
        </div>

        <div className="field-grid field-grid-single">
          <label className="switch-field">
            <span className="switch-copy">
              <strong>显示礼物</strong>
              <small>关闭后只看用户弹幕。</small>
            </span>
            <input
              aria-label="显示礼物"
              checked={settings.showGifts}
              type="checkbox"
              onChange={(event) => onChange('showGifts', event.target.checked)}
            />
            <span className="switch-slider" />
          </label>

          <div className="section-card" style={{ padding: '14px', display: 'grid', gap: '10px' }}>
            <span className="switch-copy">
              <strong>悬浮窗模式</strong>
              <small>切换悬浮窗中弹幕的显示方式。</small>
            </span>
            <div className="segmented-control" role="group" aria-label="悬浮窗模式">
              <button
                type="button"
                className={`segmented-button${
                  settings.overlayMode === 'translation-only'
                    ? ' segmented-button-active'
                    : ''
                }`}
                aria-pressed={settings.overlayMode === 'translation-only'}
                onClick={() => onChange('overlayMode', 'translation-only')}
              >
                仅显示译文
              </button>
              <button
                type="button"
                className={`segmented-button${
                  settings.overlayMode === 'bilingual'
                    ? ' segmented-button-active'
                    : ''
                }`}
                aria-pressed={settings.overlayMode === 'bilingual'}
                onClick={() => onChange('overlayMode', 'bilingual')}
              >
                原文 + 译文
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
