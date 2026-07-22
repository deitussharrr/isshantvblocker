export interface ChannelEntry {
    id: string;
    name: string;
    category: BlockCategory;
    enabled: boolean;
    builtin: boolean;
}
export interface KeywordEntry {
    keyword: string;
    category: BlockCategory;
    enabled: boolean;
    builtin: boolean;
}
export interface VideoEntry {
    id: string;
    title: string;
    channelId?: string;
    channelName?: string;
    category: BlockCategory;
    enabled: boolean;
    builtin: boolean;
}
export interface PlaylistEntry {
    id: string;
    title: string;
    channelId?: string;
    category: BlockCategory;
    enabled: boolean;
    builtin: boolean;
}
export interface RegexEntry {
    pattern: string;
    flags: string;
    description: string;
    category: BlockCategory;
    enabled: boolean;
    builtin: boolean;
}
export interface AllowlistEntry {
    id: string;
    type: 'channel' | 'video' | 'playlist' | 'keyword' | 'regex';
    value: string;
    label?: string;
    reason?: string;
    enabled: boolean;
}
export type BlockAction = 'hide' | 'blur' | 'replace' | 'redirect' | 'warning';
export type BlockCategory = 'nursery' | 'educational' | 'kids' | 'cartoons' | 'toyReviews' | 'brainrot' | 'italianBrainrot' | 'gaming' | 'music' | 'shorts' | 'familyVlogs' | 'clickbait' | 'memeCulture' | 'aiKidsContent' | 'pretendPlay' | 'slime' | 'surpriseEggs' | 'custom';
export interface CategorySettings {
    enabled: boolean;
    action: BlockAction;
}
export interface GeneralSettings {
    enabled: boolean;
    blockingAction: BlockAction;
    showWarning: boolean;
    blockShorts: boolean;
    blockLiveStreams: boolean;
    blockPlaylists: boolean;
    enableLogging: boolean;
    logRetentionDays: number;
    blockAllTraffic: boolean;
}
export interface PasswordSettings {
    hash: string;
    salt: string;
    created: boolean;
}
export interface TemporaryUnlock {
    active: boolean;
    expiresAt: number;
}
export interface UISettings {
    theme: 'dark' | 'light';
    compactMode: boolean;
    showStats: boolean;
}
export interface AppSettings {
    general: GeneralSettings;
    password: PasswordSettings;
    categories: Record<BlockCategory, CategorySettings>;
    temporaryUnlock: TemporaryUnlock;
    ui: UISettings;
    version: number;
}
export interface BlockLog {
    timestamp: number;
    videoId?: string;
    videoTitle?: string;
    channelId?: string;
    channelName?: string;
    reason: string;
    category: BlockCategory;
    page: string;
    action: BlockAction;
}
export interface FilterResult {
    blocked: boolean;
    reason?: string;
    category?: BlockCategory;
    action?: BlockAction;
}
export interface YouTubePageData {
    videoId?: string;
    channelId?: string;
    channelName?: string;
    handle?: string;
    playlistId?: string;
    videoTitle?: string;
    description?: string;
    tags?: string[];
    searchQuery?: string;
    url?: string;
    isShorts: boolean;
    isLive: boolean;
    isPlaylist: boolean;
}
export interface ExportData {
    version: number;
    exportedAt: number;
    channels: ChannelEntry[];
    keywords: KeywordEntry[];
    videos: VideoEntry[];
    playlists: PlaylistEntry[];
    regex: RegexEntry[];
    allowlist: AllowlistEntry[];
    settings: AppSettings;
    logs: BlockLog[];
}
export interface ImportResult {
    success: boolean;
    imported: {
        channels: number;
        keywords: number;
        videos: number;
        playlists: number;
        regex: number;
        allowlist: number;
    };
    errors: string[];
}
export interface ServerBridgeRequest {
    type: 'request' | 'event';
    requestId: string;
    action: string;
    params?: any;
}
export interface ServerBridgeResponse {
    type: 'response' | 'event';
    requestId?: string;
    success?: boolean;
    data?: any;
    error?: string;
    event?: string;
}
export type MessageType = 'CHECK_PASSWORD' | 'SET_PASSWORD' | 'CHANGE_PASSWORD' | 'VERIFY_PASSWORD' | 'TEMPORARY_UNLOCK' | 'LOCK' | 'GET_SETTINGS' | 'UPDATE_SETTINGS' | 'GET_BLOCKLISTS' | 'ADD_BLOCKLIST_ITEM' | 'REMOVE_BLOCKLIST_ITEM' | 'TOGGLE_BLOCKLIST_ITEM' | 'UPDATE_BLOCKLIST_ITEM' | 'IMPORT_DATA' | 'EXPORT_DATA' | 'CLEAR_LOGS' | 'GET_LOGS' | 'ADD_LOG' | 'GET_STATS' | 'CHECK_UNLOCK' | 'PASSWORD_CREATED' | 'GET_INIT_DATA' | 'REINITIALIZE' | 'REFRESH_BLOCKS' | 'REMOVE_ALL_BLOCKS' | 'GET_STATUS' | 'MEDIA_PAUSE' | 'MEDIA_RESUME' | 'MEDIA_BLOCK' | 'GET_MEDIA_STATUS' | 'ADD_CHANNEL_TO_BLOCKLIST' | 'ADD_VIDEO_TO_BLOCKLIST' | 'NETWORK_BLOCK_TOGGLE' | 'GET_NETWORK_BLOCK_STATUS' | 'MEDIA_CONTROL' | 'GET_LAST_CHANGE' | 'CHECK_CHANNEL_BY_ID' | 'CHECK_CHANNEL_BY_HANDLE' | 'CHECK_PAGE' | 'REINITIALIZE_UNIVERSAL';
export interface ExtensionMessage {
    type: MessageType;
    payload?: unknown;
}
export interface ExtensionResponse {
    success: boolean;
    data?: unknown;
    error?: string;
}
export declare const STORAGE_KEYS: {
    readonly CHANNELS: "guardian_channels";
    readonly KEYWORDS: "guardian_keywords";
    readonly VIDEOS: "guardian_videos";
    readonly PLAYLISTS: "guardian_playlists";
    readonly REGEX: "guardian_regex";
    readonly ALLOWLIST: "guardian_allowlist";
    readonly SETTINGS: "guardian_settings";
    readonly LOGS: "guardian_logs";
    readonly INSTALLED: "guardian_installed";
};
export declare const YOUTUBE_DOMAINS: string[];
export declare const DEFAULT_BLOCK_MESSAGE = "This content has been blocked by your parent. Please contact your parent if you believe this is a mistake.";
export declare const UNLOCK_DURATIONS: readonly [{
    readonly label: "10 minutes";
    readonly value: number;
}, {
    readonly label: "30 minutes";
    readonly value: number;
}, {
    readonly label: "1 hour";
    readonly value: number;
}, {
    readonly label: "4 hours";
    readonly value: number;
}];
export declare const BLOCK_CATEGORIES: Record<BlockCategory, string>;
//# sourceMappingURL=index.d.ts.map