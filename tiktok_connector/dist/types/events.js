"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebcastEventMap = exports.ConnectState = exports.WebcastEvent = exports.ControlEvent = void 0;
var ControlEvent;
(function (ControlEvent) {
    ControlEvent["CONNECTED"] = "connected";
    ControlEvent["DISCONNECTED"] = "disconnected";
    ControlEvent["ERROR"] = "error";
    ControlEvent["RAW_DATA"] = "rawData";
    ControlEvent["DECODED_DATA"] = "decodedData";
    ControlEvent["WEBSOCKET_CONNECTED"] = "websocketConnected";
    ControlEvent["WEBSOCKET_DATA"] = "websocketData";
    ControlEvent["ENTER_ROOM"] = "enterRoom";
})(ControlEvent = exports.ControlEvent || (exports.ControlEvent = {}));
var WebcastEvent;
(function (WebcastEvent) {
    // Old Events - Added 1.X.X
    WebcastEvent["CHAT"] = "chat";
    WebcastEvent["MEMBER"] = "member";
    WebcastEvent["GIFT"] = "gift";
    WebcastEvent["ROOM_USER"] = "roomUser";
    WebcastEvent["SOCIAL"] = "social";
    WebcastEvent["LIKE"] = "like";
    WebcastEvent["QUESTION_NEW"] = "questionNew";
    WebcastEvent["LINK_MIC_BATTLE"] = "linkMicBattle";
    WebcastEvent["LINK_MIC_ARMIES"] = "linkMicArmies";
    WebcastEvent["LIVE_INTRO"] = "liveIntro";
    WebcastEvent["EMOTE"] = "emote";
    WebcastEvent["ENVELOPE"] = "envelope";
    WebcastEvent["FOLLOW"] = "follow";
    WebcastEvent["SHARE"] = "share";
    WebcastEvent["STREAM_END"] = "streamEnd";
    WebcastEvent["CONTROL_MESSAGE"] = "controlMessage";
    WebcastEvent["BARRAGE"] = "barrage";
    // New Events - Added 2.0.4
    WebcastEvent["HOURLY_RANK"] = "hourlyRank";
    WebcastEvent["GOAL_UPDATE"] = "goalUpdate";
    WebcastEvent["ROOM_MESSAGE"] = "roomMessage";
    WebcastEvent["CAPTION_MESSAGE"] = "captionMessage";
    WebcastEvent["IM_DELETE"] = "imDelete";
    WebcastEvent["IN_ROOM_BANNER"] = "inRoomBanner";
    WebcastEvent["RANK_UPDATE"] = "rankUpdate";
    WebcastEvent["POLL_MESSAGE"] = "pollMessage";
    WebcastEvent["RANK_TEXT"] = "rankText";
    WebcastEvent["LINK_MIC_BATTLE_PUNISH_FINISH"] = "linkMicBattlePunishFinish";
    WebcastEvent["LINK_MIC_BATTLE_TASK"] = "linkMicBattleTask";
    WebcastEvent["LINK_MIC_FAN_TICKET_METHOD"] = "linkMicFanTicketMethod";
    WebcastEvent["LINK_MIC_METHOD"] = "linkMicMethod";
    WebcastEvent["UNAUTHORIZED_MEMBER"] = "unauthorizedMember";
    WebcastEvent["OEC_LIVE_SHOPPING"] = "oecLiveShopping";
    WebcastEvent["MSG_DETECT"] = "msgDetect";
    WebcastEvent["LINK_MESSAGE"] = "linkMessage";
    WebcastEvent["ROOM_VERIFY"] = "roomVerify";
    WebcastEvent["LINK_LAYER"] = "linkLayer";
    WebcastEvent["ROOM_PIN"] = "roomPin";
    // Added 2.0.8-beta1
    WebcastEvent["SUPER_FAN"] = "superFan";
    WebcastEvent["SUPER_FAN_BOX"] = "superFanBox";
})(WebcastEvent = exports.WebcastEvent || (exports.WebcastEvent = {}));
var ConnectState;
(function (ConnectState) {
    ConnectState["DISCONNECTED"] = "DISCONNECTED";
    ConnectState["CONNECTING"] = "CONNECTING";
    ConnectState["CONNECTED"] = "CONNECTED";
})(ConnectState = exports.ConnectState || (exports.ConnectState = {}));
exports.WebcastEventMap = {
    // Old Events - Added 1.X.X
    'WebcastChatMessage': WebcastEvent.CHAT,
    'WebcastMemberMessage': WebcastEvent.MEMBER,
    'WebcastRoomUserSeqMessage': WebcastEvent.ROOM_USER,
    'WebcastSocialMessage': WebcastEvent.SOCIAL,
    'WebcastLikeMessage': WebcastEvent.LIKE,
    'WebcastQuestionNewMessage': WebcastEvent.QUESTION_NEW,
    'WebcastLinkMicBattle': WebcastEvent.LINK_MIC_BATTLE,
    'WebcastLinkMicArmies': WebcastEvent.LINK_MIC_ARMIES,
    'WebcastLiveIntroMessage': WebcastEvent.LIVE_INTRO,
    'WebcastEmoteChatMessage': WebcastEvent.EMOTE,
    'WebcastEnvelopeMessage': WebcastEvent.ENVELOPE,
    'WebcastBarrageMessage': WebcastEvent.BARRAGE,
    // New Events - Added 2.0.4
    'WebcastHourlyRankMessage': WebcastEvent.HOURLY_RANK,
    'WebcastGoalUpdateMessage': WebcastEvent.GOAL_UPDATE,
    'WebcastRoomMessage': WebcastEvent.ROOM_MESSAGE,
    'WebcastCaptionMessage': WebcastEvent.CAPTION_MESSAGE,
    'WebcastControlMessage': WebcastEvent.CONTROL_MESSAGE,
    'WebcastImDeleteMessage': WebcastEvent.IM_DELETE,
    'WebcastInRoomBannerMessage': WebcastEvent.IN_ROOM_BANNER,
    'WebcastRankUpdateMessage': WebcastEvent.RANK_UPDATE,
    'WebcastPollMessage': WebcastEvent.POLL_MESSAGE,
    'WebcastRankTextMessage': WebcastEvent.RANK_TEXT,
    'WebcastLinkMicBattlePunishFinish': WebcastEvent.LINK_MIC_BATTLE_PUNISH_FINISH,
    'WebcastLinkmicBattleTaskMessage': WebcastEvent.LINK_MIC_BATTLE_TASK,
    'WebcastLinkMicFanTicketMethod': WebcastEvent.LINK_MIC_FAN_TICKET_METHOD,
    'WebcastLinkMicMethod': WebcastEvent.LINK_MIC_METHOD,
    'WebcastUnauthorizedMemberMessage': WebcastEvent.UNAUTHORIZED_MEMBER,
    'WebcastOecLiveShoppingMessage': WebcastEvent.OEC_LIVE_SHOPPING,
    'WebcastMsgDetectMessage': WebcastEvent.MSG_DETECT,
    'WebcastLinkMessage': WebcastEvent.LINK_MESSAGE,
    'RoomVerifyMessage': WebcastEvent.ROOM_VERIFY,
    'WebcastLinkLayerMessage': WebcastEvent.LINK_LAYER,
    'WebcastRoomPinMessage': WebcastEvent.ROOM_PIN
};
//# sourceMappingURL=events.js.map