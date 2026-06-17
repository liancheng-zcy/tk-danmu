import { fireEvent, render, screen } from '@testing-library/react';
import { DEFAULT_SETTINGS } from '../../shared/config';
import { ControlPanel } from './ControlPanel';

describe('ControlPanel', () => {
  it('切换主题、源语言、目标语言和礼物显示', () => {
    const changes: Array<{ field: string; value: unknown }> = [];

    render(
      <ControlPanel
        settings={DEFAULT_SETTINGS}
        isRunning={false}
        onStart={() => undefined}
        onStop={() => undefined}
        onOpenOverlay={() => undefined}
        onChange={(field, value) => changes.push({ field, value })}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '深色' }));
    fireEvent.change(screen.getByLabelText('源语言'), {
      target: { value: 'en' }
    });
    fireEvent.change(screen.getByLabelText('目标语言'), {
      target: { value: 'ja' }
    });
    fireEvent.click(screen.getByLabelText('显示礼物'));

    expect(changes).toEqual([
      { field: 'themeMode', value: 'dark' },
      { field: 'sourceLanguage', value: 'en' },
      { field: 'targetLanguage', value: 'ja' },
      { field: 'showGifts', value: false }
    ]);
  });

  it('根据运行状态切换主按钮', () => {
    const { rerender } = render(
      <ControlPanel
        settings={DEFAULT_SETTINGS}
        isRunning={false}
        onStart={() => undefined}
        onStop={() => undefined}
        onOpenOverlay={() => undefined}
        onChange={() => undefined}
      />
    );

    expect(screen.getByRole('button', { name: '开始监听' })).toBeInTheDocument();

    rerender(
      <ControlPanel
        settings={DEFAULT_SETTINGS}
        isRunning
        onStart={() => undefined}
        onStop={() => undefined}
        onOpenOverlay={() => undefined}
        onChange={() => undefined}
      />
    );

    expect(screen.getByRole('button', { name: '停止监听' })).toBeInTheDocument();
  });

  it('provider 区不再显示研发测试导向文案', () => {
    render(
      <ControlPanel
        settings={DEFAULT_SETTINGS}
        isRunning={false}
        onStart={() => undefined}
        onStop={() => undefined}
        onOpenOverlay={() => undefined}
        onChange={() => undefined}
      />
    );

    expect(screen.queryByText('推荐先测')).not.toBeInTheDocument();
    expect(
      screen.getByText('填写 API Key 后即可启用翻译；未填完整时将只显示原文。')
    ).toBeInTheDocument();
  });
});
