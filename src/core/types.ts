export type SocketLogDirection = "in" | "out" | "system";

export type SocketConnectionState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "reconnecting";

export type SocketLogEntry = {
  id: string;
  timestamp: number;
  direction: SocketLogDirection;
  event: string;
  payload?: unknown;
  redacted?: boolean;
};

export type SocketConnectionSnapshot = {
  state: SocketConnectionState;
  socketId?: string;
  url?: string;
  transport?: string;
  reconnectAttempt?: number;
  joinedRooms: string[];
  businessId?: string;
  updatedAt: number;
};

export type HttpLogPhase = "pending" | "done";

export type HttpLogEntry = {
  id: string;
  phase: HttpLogPhase;
  timestamp: number;
  method: string;
  url: string;
  host: string;
  path: string;
  params: Record<string, string>;
  requestHeaders?: Record<string, string>;
  requestBody?: unknown;
  status?: number;
  durationMs?: number;
  responseBody?: unknown;
  ok?: boolean;
  error?: string;
};

export type AppInfo = {
  appVariant: string;
  apiBaseUrl: string;
  supabaseUrl?: string;
  bundleId?: string;
  appName?: string;
  /** Marketing / short version (e.g. CFBundleShortVersionString). */
  versionName?: string;
  /** Build identifier (e.g. CFBundleVersion / Android versionCode). */
  buildNumber?: string;
  isDev: boolean;
};

export type PushCallLogSource =
  | "fcm"
  | "notifee"
  | "voip"
  | "callkit"
  | "system";

export type PushCallLogOutcome =
  | "received"
  | "display_ok"
  | "display_fail"
  | "skipped"
  | "lifecycle";

export type PushCallLogEntry = {
  id: string;
  timestamp: number;
  source: PushCallLogSource;
  event: string;
  outcome?: PushCallLogOutcome;
  summary?: string;
  payload?: unknown;
  redacted?: boolean;
};

export type PushCallOsPermission = "granted" | "denied" | "unknown";

export type PushCallDiagnostics = {
  notifeeVersion?: string;
  firebaseMessagingVersion?: string;
  firebaseAppVersion?: string;
  microphone?: PushCallOsPermission;
  callPhone?: PushCallOsPermission | "n/a";
  readPhone?: PushCallOsPermission | "n/a";
};

export type PushCallAdapter = {
  /** Host-provided TnC body (English). Library shows default if omitted. */
  termsText?: string;
  /** After Accept: request OS notif permission; return granted boolean. */
  requestOsNotificationPermission: () => Promise<boolean>;
  /** Load/save consent across sessions (MMKV recommended). */
  loadConsent: () => boolean | Promise<boolean>;
  saveConsent: (enabled: boolean) => void | Promise<void>;
  /** Called when logging flips ON/OFF so host arms/disarms bridges. */
  onLoggingChange: (enabled: boolean) => void;
  /**
   * Optional: current FCM registration token for QA handoff.
   * Only fetched/shown while logging consent is ON — do not call when OFF.
   */
  getFcmToken?: () => Promise<string | null | undefined>;
  /** Optional: read-only OS notification permission (no prompt). */
  getOsNotificationPermission?: () => Promise<PushCallOsPermission>;
  /** Optional: package versions + mic/phone permission snapshot for ? popup. */
  getDiagnostics?: () => Promise<PushCallDiagnostics> | PushCallDiagnostics;
};

export type FabPosition = {
  x: number;
  y: number;
};

export type NetworkThrottleProfile = "none" | "slow3g" | "fast3g" | "offline";

export type NetworkForcedError = {
  status: number;
  message?: string;
};

export type NetworkSimulatorState = {
  enabled: boolean;
  throttleProfile: NetworkThrottleProfile;
  delayMs: number;
  forcedError?: NetworkForcedError;
};

export type DeepLinkPreset = {
  id: string;
  label: string;
  url: string;
};

export type RouteInfo = {
  pathname: string;
  segments: string[];
  params: Record<string, string | string[]>;
  routeFile: string;
  screenFile?: string;
};

export type StorageEntry = {
  key: string;
  value: string;
  label?: string;
  redacted?: boolean;
};

export type StateSection = {
  id: string;
  title: string;
  entries: StorageEntry[];
};

export type StateSnapshot = {
  sections: StateSection[];
};

export type NetworkAdapter = {
  initialState?: Partial<NetworkSimulatorState>;
};

export type DeepLinkAdapter = {
  open: (url: string) => void | Promise<void>;
  presets?: DeepLinkPreset[];
  loadRecent?: () => string[] | Promise<string[]>;
  saveRecent?: (recent: string[]) => void | Promise<void>;
  recentLimit?: number;
};

export type ExportAdapter = {
  getExtraBundleData?: () => unknown | Promise<unknown>;
  onShareBundle?: (json: string) => void | Promise<void>;
};

export type StateAdapter = {
  getSnapshot: () => StateSnapshot;
  subscribe?: (listener: () => void) => () => void;
  onRefresh?: () => void;
  onFullReset?: () => void | Promise<void>;
};

export type RouteAdapter = {
  getCurrentRoute: () => RouteInfo | null;
  subscribe?: (listener: () => void) => () => void;
};

export type DevToolsConfig = {
  enabled: boolean;
  appInfo: AppInfo;
  initialFabPosition?: FabPosition;
  onFabPositionChange?: (position: FabPosition) => void;
  route?: RouteAdapter;
  state?: StateAdapter;
  network?: NetworkAdapter;
  deeplink?: DeepLinkAdapter;
  export?: ExportAdapter;
  pushCall?: PushCallAdapter;
};
