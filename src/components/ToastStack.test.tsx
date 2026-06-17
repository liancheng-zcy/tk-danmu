import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { ToastStack } from './ToastStack';

describe('ToastStack', () => {
  it('显示提醒并支持手动关闭', () => {
    const dismiss = vi.fn();

    render(
      <ToastStack
        notices={[
          {
            id: 'notice-1',
            level: 'warning',
            message: '弹幕过多，部分消息已直接显示原文',
            timestamp: '2026-06-16T00:00:00.000Z'
          }
        ]}
        onDismiss={dismiss}
      />
    );

    expect(screen.getByText('弹幕过多，部分消息已直接显示原文')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '关闭提示' }));
    expect(dismiss).toHaveBeenCalledWith('notice-1');
  });
});
