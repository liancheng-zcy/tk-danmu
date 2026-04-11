import { AxiosRequestConfig } from 'axios';
import * as tikTokSchema from '../types/tiktok-schema';
import { MessageFns, ProtoMessageFetchResult, WebcastPushFrame } from '../types/tiktok-schema';
import { ClientOptions } from 'ws';
export declare type TikTokLiveConnectionBundledOptions = {
    useMobile: true;
    sessionId?: string | null;
    ttTargetIdc?: string | null;
    oauthToken?: string | null;
    authenticateWs: true;
} | {
    useMobile?: false;
    sessionId?: string | null;
    ttTargetIdc?: string | null;
    oauthToken?: string | null;
    authenticateWs?: boolean;
};
export declare type TikTokLiveConnectionOptions = TikTokLiveConnectionBundledOptions & {
    processInitialData: boolean;
    fetchRoomInfoOnConnect: boolean;
    enableExtendedGiftInfo: boolean;
    enableRequestPolling: boolean;
    requestPollingIntervalMs: number;
    signApiKey: string | null;
    connectWithUniqueId: boolean;
    disableEulerFallbacks: boolean;
    webClientParams: Record<string, string>;
    webClientHeaders: Record<string, string>;
    webClientOptions: AxiosRequestConfig;
    wsClientHeaders: Record<string, string>;
    wsClientParams: Record<string, string>;
    wsClientOptions: ClientOptions;
    signedWebSocketProvider?: (props: FetchSignedWebSocketParams) => Promise<ProtoMessageFetchResult>;
};
export declare type TikTokLiveConstructorConnectionOptions = Partial<TikTokLiveConnectionOptions> & TikTokLiveConnectionBundledOptions;
export declare type RoomInfo = Record<string, any> & {
    data: {
        status: number;
    };
};
export declare type RoomGiftInfo = any;
export declare type FetchSignedWebSocketParams = {
    roomId?: string;
    uniqueId?: string;
    ttTargetIdc?: string;
    sessionId?: string;
    oauthToken?: string;
    useMobile?: boolean;
};
export declare type WebcastHttpClientConfig = {
    customHeaders: Record<string, string>;
    axiosOptions: AxiosRequestConfig;
    clientParams: Record<string, string>;
    authenticateWs?: boolean;
    signApiKey?: string;
    oauthToken?: string;
};
export declare type DecodedWebcastPushFrame = WebcastPushFrame & {
    protoMessageFetchResult?: ProtoMessageFetchResult;
};
export interface WebcastConfig {
    TIKTOK_HOST_WEB: string;
    TIKTOK_HOST_WEBCAST: string;
    TIKTOK_HTTP_ORIGIN: string;
    DEFAULT_HTTP_CLIENT_COOKIES: Record<string, string>;
    DEFAULT_HTTP_CLIENT_PARAMS: Record<string, string>;
    DEFAULT_HTTP_CLIENT_OPTIONS: AxiosRequestConfig;
    DEFAULT_WS_CLIENT_PARAMS_APPEND_PARAMETER: string;
    DEFAULT_HTTP_CLIENT_HEADERS: Record<string, string> & {
        'User-Agent': string;
    };
    DEFAULT_WS_CLIENT_PARAMS: Record<string, string>;
    DEFAULT_WS_CLIENT_HEADERS: Record<string, string> & {
        'User-Agent': string;
    };
}
declare type ExtractMessageType<T> = T extends MessageFns<infer U> ? U : never;
export declare type WebcastMessage = {
    [K in keyof typeof tikTokSchema as ExtractMessageType<typeof tikTokSchema[K]> extends never ? never : K]: ExtractMessageType<typeof tikTokSchema[K]>;
};
declare type HasCommon<T> = T extends {
    common: any;
} ? T : never;
export declare type WebcastEventMessage = {
    [K in keyof WebcastMessage as HasCommon<WebcastMessage[K]> extends never ? never : K]: WebcastMessage[K];
};
export interface IWebcastDeserializeConfig {
    skipMessageTypes: (keyof WebcastEventMessage)[];
    showBase64OnDecodeError: boolean;
}
export interface IWebcastDeserializeConfig {
    skipMessageTypes: (keyof WebcastEventMessage)[];
}
export declare type DecodedData = {
    [K in keyof WebcastEventMessage]: {
        type: K;
        data: WebcastEventMessage[K];
    };
}[keyof WebcastEventMessage];
declare module '../types/tiktok-schema' {
    interface BaseProtoMessage {
        decodedData?: DecodedData;
        decodeError?: any;
    }
    interface WebcastGiftMessage {
        extendedGiftInfo?: any;
    }
}
export declare type WebcastHttpClientRequestParams = Omit<Omit<AxiosRequestConfig, 'url'>, 'baseURL'> & {
    host: string;
    path: string;
    params?: Record<string, string>;
    signRequest: boolean;
};
export declare type WebSocketParams = {
    [key: string]: string;
    compress?: string;
    room_id: string;
    internal_ext: string;
    cursor: string;
};
export {};
//# sourceMappingURL=client.d.ts.map