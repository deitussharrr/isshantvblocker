// ========================
// Channel Types
// ========================
export interface ChannelEntry {
  id: string;
  name: string;
  category: BlockCategory;
  enabled: boolean;
  builtin: boolean;
}

// ========================
// Keyword Types
// ========================
export interface KeywordEntry {
  keyword: string;
  category: BlockCategory;
  enabled: boolean;
  builtin: boolean;
}

// ========================
// Video Types
// ========================
export interface VideoEntry {
  id: string;
  title: string;
  channelId?: string;
  channelName?: string;
  category: BlockCategory;
  enabled: boolean;
  builtin: boolean;
}

// ========================
// Playlist Types
// ========================
export interface PlaylistEntry {
  id: string;
  title: string;
  channelId?: string;
  category: BlockCategory;
  enabled: boolean;
  builtin: boolean;
}

// ========================
// Regex Types
// ========================
export interface RegexEntry {
  pattern: string;
  flags: string;
  description: string;
  category: BlockCategory;
  enabled: boolean;
  builtin: boolean;
}

// ========================
// Allowlist Types
// ========================
export interface AllowlistEntry {
  id: string;
  type: 'channel' | 'video' | 'playlist' | 'keyword' | 'regex';
  value: string;
  label?: string;
  reason?: string;
  enabled: boolean;
}

// ========================
// Settings Types
// ========================
export type BlockAction = 'hide' | 'blur' | 'replace' | 'redirect' | 'warning';
export type BlockCategory =
  | 'nursery'
  | 'educational'
  | 'kids'
  | 'cartoons'
  | 'toyReviews'
  | 'brainrot'
  | 'italianBrainrot'
  | 'gaming'
  | 'music'
  | 'shorts'
  | 'familyVlogs'
  | 'clickbait'
  | 'memeCulture'
  | 'aiKidsContent'
  | 'pretendPlay'
  | 'slime'
  | 'surpriseEggs'
  | 'custom';

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

// ========================
// Log Types
// ========================
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

// ========================
// Filter Engine Types
// ========================
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

// ========================
// Import/Export Types
// ========================
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

// ========================
// Server Bridge Types
// ========================

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

// ========================
// Message Types (Chrome Runtime)
// ========================
export type MessageType =
  | 'CHECK_PASSWORD'
  | 'SET_PASSWORD'
  | 'CHANGE_PASSWORD'
  | 'VERIFY_PASSWORD'
  | 'TEMPORARY_UNLOCK'
  | 'LOCK'
  | 'GET_SETTINGS'
  | 'UPDATE_SETTINGS'
  | 'GET_BLOCKLISTS'
  | 'ADD_BLOCKLIST_ITEM'
  | 'REMOVE_BLOCKLIST_ITEM'
  | 'TOGGLE_BLOCKLIST_ITEM'
  | 'UPDATE_BLOCKLIST_ITEM'
  | 'IMPORT_DATA'
  | 'EXPORT_DATA'
  | 'CLEAR_LOGS'
  | 'GET_LOGS'
  | 'ADD_LOG'
  | 'GET_STATS'
  | 'CHECK_UNLOCK'
  | 'PASSWORD_CREATED'
  | 'GET_INIT_DATA'
  | 'REINITIALIZE'
  | 'REFRESH_BLOCKS'
  | 'REMOVE_ALL_BLOCKS'
  | 'GET_STATUS'
  | 'MEDIA_PAUSE'
  | 'MEDIA_RESUME'
  | 'MEDIA_BLOCK'
  | 'GET_MEDIA_STATUS'
  | 'ADD_CHANNEL_TO_BLOCKLIST'
  | 'ADD_VIDEO_TO_BLOCKLIST'
  | 'NETWORK_BLOCK_TOGGLE'
  | 'GET_NETWORK_BLOCK_STATUS'
  | 'MEDIA_CONTROL'
  | 'GET_LAST_CHANGE'
  | 'CHECK_CHANNEL_BY_ID'
  | 'CHECK_CHANNEL_BY_HANDLE'
  | 'CHECK_PAGE'
  | 'REINITIALIZE_UNIVERSAL';

export interface ExtensionMessage {
  type: MessageType;
  payload?: unknown;
}

export interface ExtensionResponse {
  success: boolean;
  data?: unknown;
  error?: string;
}

// ========================
// Storage Keys
// ========================
export const STORAGE_KEYS = {
  CHANNELS: 'guardian_channels',
  KEYWORDS: 'guardian_keywords',
  VIDEOS: 'guardian_videos',
  PLAYLISTS: 'guardian_playlists',
  REGEX: 'guardian_regex',
  ALLOWLIST: 'guardian_allowlist',

  SETTINGS: 'guardian_settings',
  LOGS: 'guardian_logs',
  INSTALLED: 'guardian_installed',
} as const;

// ========================
// Constants
// ========================
export const YOUTUBE_DOMAINS = [
  'www.youtube.com',
  'm.youtube.com',
  'youtube.com',
  'www.youtube-nocookie.com',
];

export const DEFAULT_BLOCK_MESSAGE = 'This content has been blocked by your parent. Please contact your parent if you believe this is a mistake.';

export const UNLOCK_DURATIONS = [
  { label: '10 minutes', value: 10 * 60 * 1000 },
  { label: '30 minutes', value: 30 * 60 * 1000 },
  { label: '1 hour', value: 60 * 60 * 1000 },
  { label: '4 hours', value: 4 * 60 * 60 * 1000 },
] as const;

export const BLOCK_CATEGORIES: Record<BlockCategory, string> = {
  nursery: 'Nursery Rhymes',
  educational: 'Educational',
  kids: 'Kids Content',
  cartoons: 'Cartoons',
  toyReviews: 'Toy Reviews',
  brainrot: 'Brainrot',
  italianBrainrot: 'Italian Brainrot',
  gaming: 'Gaming',
  music: 'Music',
  shorts: 'Shorts',
  familyVlogs: 'Family Vlogs',
  clickbait: 'Clickbait',
  memeCulture: 'Meme Culture',
  aiKidsContent: 'AI Kids Content',
  pretendPlay: 'Pretend Play',
  slime: 'Slime',
  surpriseEggs: 'Surprise Eggs',
  custom: 'Custom',
};
