import { parseRoomInput } from './room';

describe('parseRoomInput', () => {
  it('支持纯用户名和带 @ 的用户名', () => {
    expect(parseRoomInput('himmathyturner')).toBe('himmathyturner');
    expect(parseRoomInput('@himmathyturner')).toBe('himmathyturner');
    expect(parseRoomInput('@@himmathyturner')).toBe('himmathyturner');
  });

  it('支持从直播 URL 中提取用户名', () => {
    expect(
      parseRoomInput('https://www.tiktok.com/@himmathyturner/live')
    ).toBe('himmathyturner');
    expect(
      parseRoomInput('https://www.tiktok.com/@himmathyturner?lang=en')
    ).toBe('himmathyturner');
  });

  it('空输入时返回空字符串', () => {
    expect(parseRoomInput('   ')).toBe('');
  });
});
