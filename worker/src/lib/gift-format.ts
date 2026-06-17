import type { GiftEvent } from './protocol';

interface RawGiftData {
  common?: {
    msgId?: string;
  };
  user?: {
    id?: string;
    uniqueId?: string;
    displayId?: string;
    nickname?: string;
  };
  giftId?: number;
  repeatCount?: number;
  comboCount?: number;
  repeatEnd?: number;
  giftDetails?: {
    giftName?: string;
    name?: string;
    diamondCount?: number;
  };
  gift?: {
    name?: string;
    diamondCount?: number;
  };
}

export function formatGiftEvent(data: RawGiftData): GiftEvent {
  const userId =
    data.user?.id?.trim() ||
    data.user?.uniqueId?.trim() ||
    data.user?.displayId?.trim() ||
    'unknown-user';
  const giftId = data.giftId ?? 0;
  const repeatCount = data.repeatCount ?? data.comboCount ?? 1;
  const diamondCount =
    data.giftDetails?.diamondCount ?? data.gift?.diamondCount ?? 0;
  const giftName =
    data.giftDetails?.giftName?.trim() ||
    data.giftDetails?.name?.trim() ||
    data.gift?.name?.trim() ||
    `礼物 #${giftId}`;

  return {
    type: 'gift',
    id: data.common?.msgId || `${userId}-${giftId}-${Date.now()}`,
    username: data.user?.nickname?.trim() || data.user?.displayId?.trim() || userId,
    userId,
    giftId,
    giftName,
    repeatCount,
    diamondCount,
    timestamp: new Date().toISOString()
  };
}
