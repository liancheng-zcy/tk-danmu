import { formatGiftEvent } from './gift-format';

describe('formatGiftEvent', () => {
  it('优先使用礼物详情字段生成结构化事件', () => {
    const event = formatGiftEvent({
      user: {
        uniqueId: 'viewer-1',
        nickname: '观众 A'
      },
      giftId: 1001,
      repeatCount: 3,
      giftDetails: {
        giftName: '玫瑰',
        diamondCount: 5
      }
    });

    expect(event.username).toBe('观众 A');
    expect(event.userId).toBe('viewer-1');
    expect(event.giftName).toBe('玫瑰');
    expect(event.repeatCount).toBe(3);
    expect(event.diamondCount).toBe(5);
  });

  it('字段不完整时降级到礼物编号', () => {
    const event = formatGiftEvent({
      user: {
        uniqueId: 'viewer-2'
      },
      giftId: 42
    });

    expect(event.username).toBe('viewer-2');
    expect(event.giftName).toBe('礼物 #42');
    expect(event.repeatCount).toBe(1);
    expect(event.diamondCount).toBe(0);
  });
});
