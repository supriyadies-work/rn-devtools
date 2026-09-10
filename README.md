# @supriyadies-work/rn-devtools

**Supr - Devtools** — host-agnostic React Native DevTools panel. Mount once at the app root, wire optional adapters, and get a floating debug panel without coupling to your domain logic.

## Features

### Floating panel (FAB)

- Draggable floating action button with persisted position (`initialFabPosition` / `onFabPositionChange`).
- Opens a full-screen modal panel with tabs (Push/Call appears only when `pushCall` is wired).
- Gated by `config.enabled` — mount stays safe in production when disabled.

### Route inspector

Inspect the current navigation state in real time (when `route` adapter is wired):

| Field | Description |
|-------|-------------|
| Pathname | Current URL path |
| Segments | Route segment list |
| Route file | Mapped route file path (e.g. Expo Router) |
| Screen file | Optional screen component path |
| Params | Route params as JSON |

Copy route/screen file paths to clipboard. Updates live when `route.subscribe` is provided.

### HTTP logger

Capture and inspect outbound HTTP traffic from your API layer:

- **Request list** — method, status, duration, path (newest first, max 100 entries).
- **Detail view** — request/response body (formatted JSON), status, error, duration.
- **Copy curl** — generate a reproducible `curl` command from a log entry.
- **Clear** — wipe the in-memory log buffer.

Wire your fetch/axios/RTK layer to `httpLogStore.upsert` / `httpLogStore.patch` (see [HTTP logging bridge](#http-logging-bridge)).

### Socket logger

Capture and inspect Socket.IO traffic when the host wires `instrumentSocketIoClient`:

- **Connection banner** — state (`connected` / `disconnected` / `reconnecting`), `socketId`, transport, `businessId`, joined room count.
- Expand rooms to list each joined room. When `socket.resolveRoomLabel` is wired, show the human label with the raw id as a muted subtitle; otherwise show the raw id.
- **Event list** — direction (`IN` / `OUT` / `SYS`), event name, timestamp (newest first, max 100 entries).
- **Detail view** — full payload (formatted JSON), copy to clipboard.
- **Filters** — direction chips (`All`, `In`, `Out`, `System`) + event name search.
- **Clear** — wipe the in-memory socket log buffer.

Wire your `socket.io-client` instance via `instrumentSocketIoClient` (see [Socket logging bridge](#socket-logging-bridge)).

### Push/Call logger (QA handoff)

Opt-in logging for push and call pipelines (visible only when `pushCall` adapter is wired):

- **Activate** shows terms; after **Accept**, the host requests OS notification permission, then bridges may push allowlisted events into `pushCallLogStore`.
- **Deactivate** revokes consent, stops capture, and **clears** the in-memory buffer.
- QA-readable rows with outcome chips: `RECEIVED` / `SHOWN` / `FAILED` / `SKIPPED` / `CALL`.
- Banner: logging ON/OFF, **OS permission** (refreshed on Accept and consent restore), and **`?` diagnostics** popup (app/build, package versions, mic/phone/notif perms, FCM token while logging ON + Copy all).
- List previews: FCM/Notifee show **title + body**; CallKit shows **caller name** (uuid/room_id only in detail).
- Filter chips stay visible when the All list is long.
- **Copy all** (banner) exports sanitized logs + app identity; FCM token included only when logging is ON.
- Host must allowlist event payloads before `pushCallLogStore.push` — never pass raw FCM/VoIP/CallKit objects into log rows (no tokens, SDP, phones in event payloads).

### Network simulator (global)

Simulate network conditions for **all** requests that call `maybeSimulateNetworkFailure()` before executing:

| Control | Options |
|---------|---------|
| Toggle | ON / OFF |
| Throttle profile | `none`, `fast3g` (+350ms), `slow3g` (+1200ms), `offline` |
| Extra delay | `+0ms`, `+300ms`, `+1000ms` (added on top of profile delay) |
| Forced error | `NoErr`, `ERR 401`, `ERR 500` |

`offline` returns a simulated network failure without hitting the server. Forced errors short-circuit before the real request runs.

### Storage & state viewer

Two layers in one tab:

**App / Build** (always shown from `appInfo`):

- App variant, API URL, Supabase URL, bundle ID, app name, **version name**, **build identifier**, `__DEV__` flag.

**Custom sections** (from `state` adapter):

- Collapsible sections with key/value entries.
- Expand entry to see full value; copy to clipboard.
- `redacted: true` entries show a lock icon and disable copy.
- **Refresh all** — calls `state.onRefresh` (e.g. re-read MMKV / React Query).
- **Full reset** — calls `state.onFullReset` with confirmation (host defines what gets cleared).

### Deep link launcher

Test deep links without leaving the app (when `deeplink` adapter is wired):

- Text input + **Open** to launch any URL/scheme.
- **Presets** — one-tap shortcuts defined by host (`presets: DeepLinkPreset[]`).
- **Recent** — last N opened links, persisted via `loadRecent` / `saveRecent`.
- **Copy** — copy the current input value.

### Debug bundle export

Generate a single JSON snapshot for bug reports or QA handoff:

```json
{
  "createdAt": "...",
  "devtools": { "brand": "Supr - Devtools", "version": "0.3.1" },
  "appInfo": { ... },
  "routeInfo": { ... },
  "networkSimulator": { ... },
  "httpLogs": [ ... ],
  "socketConnection": { "state": "connected", "joinedRooms": [], ... },
  "socketLogs": [ ... ],
  "pushCallLoggingEnabled": false,
  "pushCallLogs": [ ... ],
  "stateSnapshot": { ... },
  "extra": null
}
```

Actions: **Generate**, **Copy** to clipboard, **Share** (via host `export.onShareBundle` hook, e.g. `Share.share`).

Host can attach extra context with `export.getExtraBundleData()`.

---

## Quick Start

```tsx
import { DevToolsHost, resolveDevToolsEnabled } from "@supriyadies-work/rn-devtools";

const config = {
  enabled: resolveDevToolsEnabled({ isDev: __DEV__, appVariant: "dev" }),
  appInfo: {
    appVariant: "dev",
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? "(unset)",
    isDev: __DEV__,
  },
};

export const AppRoot = () => <DevToolsHost config={config} />;
```

`resolveDevToolsEnabled` returns `true` when `isDev && appVariant === "dev"`. Override `enabled` directly if your gating logic differs.

## Adapter contract

`DevToolsHost` accepts a single `DevToolsConfig` object. All adapters are optional — missing adapters degrade gracefully (empty/read-only/disabled UI, no crash).

### Required

| Field | Type | Description |
|-------|------|-------------|
| `enabled` | `boolean` | Master switch; when `false`, FAB and panel are not rendered |
| `appInfo` | `AppInfo` | Build metadata shown in Storage tab and export bundle |

### Optional

| Adapter | Methods | Enables |
|---------|---------|---------|
| `route` | `getCurrentRoute()`, `subscribe?()` | Route tab + route section in export |
| `state` | `getSnapshot()`, `subscribe?()`, `onRefresh?()`, `onFullReset?()` | Storage sections + refresh/reset actions |
| `network` | `initialState?` | Default simulator settings on boot |
| `deeplink` | `open()`, `presets?`, `loadRecent?`, `saveRecent?`, `recentLimit?` | Deep link tab |
| `export` | `getExtraBundleData?()`, `onShareBundle?()` | Extra export fields + native share |
| `pushCall` | `requestOsNotificationPermission()`, `loadConsent()`, `saveConsent()`, `onLoggingChange()`, `termsText?`, diagnostics helpers | Push/Call tab (hidden if omitted) |
| `socket` | `resolveRoomLabel?(roomId)` | Socket joined-rooms labels (fallback: raw id) |
| `instrumentSocketIoClient` | `enabled?`, `url?`, `sanitizePayload?`, `maxPayloadChars?` | Socket tab + socket sections in export |
| `initialFabPosition` | `FabPosition` | Restore FAB position across sessions |
| `onFabPositionChange` | `(pos) => void` | Persist FAB drag position |

### Example: full config

```tsx
import type { DevToolsConfig } from "@supriyadies-work/rn-devtools";

const config: DevToolsConfig = {
  enabled: true,
  appInfo: {
    appVariant: "dev",
    apiBaseUrl: "https://api.example.com",
    bundleId: "com.example.app.dev",
    versionName: "1.0.0",
    buildNumber: "42",
    isDev: __DEV__,
  },
  pushCall: {
    loadConsent: () => storage.getBoolean("devtools.pushCall") ?? false,
    saveConsent: (enabled) => storage.set("devtools.pushCall", enabled),
    onLoggingChange: (enabled) => setPushCallLoggingEnabled(enabled),
    requestOsNotificationPermission: () => requestNotificationPermission(),
    getOsNotificationPermission: () => getNotificationPermissionStatus(),
    getFcmToken: () => getFcmToken(),
    getDiagnostics: () => getPushCallDiagnostics(),
  },
  socket: {
    resolveRoomLabel: (roomId) => lookupConversationDisplayName(roomId),
  },
  route: {
    getCurrentRoute: () => ({ pathname, segments, params, routeFile }),
    subscribe: (listener) => { /* return unsubscribe */ },
  },
  state: {
    getSnapshot: () => ({ sections: [{ id: "mmkv", title: "MMKV", entries: [...] }] }),
    subscribe: (listener) => { /* return unsubscribe */ },
    onRefresh: () => { /* re-read stores */ },
    onFullReset: async () => { /* clear cache + sign out */ },
  },
  network: {
    initialState: { enabled: false, throttleProfile: "none", delayMs: 0 },
  },
  deeplink: {
    open: (url) => Linking.openURL(url),
    presets: [{ id: "home", label: "Home", url: "myapp://home" }],
    loadRecent: () => JSON.parse(storage.getString("devtools:deeplinks") ?? "[]"),
    saveRecent: (recent) => storage.set("devtools:deeplinks", JSON.stringify(recent)),
    recentLimit: 10,
  },
  export: {
    getExtraBundleData: () => ({ featureFlags: getFlags() }),
    onShareBundle: (json) => Share.share({ message: json }),
  },
};
```

## HTTP logging bridge

Push entries from your HTTP client into the logger:

```ts
import { httpLogStore, type HttpLogEntry } from "@supriyadies-work/rn-devtools";

const id = crypto.randomUUID();

// Before request
httpLogStore.upsert({
  id,
  phase: "pending",
  timestamp: Date.now(),
  method: "GET",
  url: fullUrl,
  host,
  path,
  params,
  requestHeaders,
  requestBody,
});

// After response
httpLogStore.patch(id, {
  status: response.status,
  durationMs: Date.now() - start,
  responseBody: await response.json(),
  ok: response.ok,
});
```

Works with axios interceptors, fetch wrappers, RTK Query `baseQuery`, or any custom API layer.

## Network simulator bridge

Call once before every outbound request:

```ts
import { maybeSimulateNetworkFailure } from "@supriyadies-work/rn-devtools";

const simulated = await maybeSimulateNetworkFailure();
if (simulated) {
  return { ok: false, status: simulated.status, error: simulated.error };
}
// proceed with real request
```

The simulator is global — one toggle affects all bridged requests.

## Socket logging bridge

Instrument a `socket.io-client` instance once (e.g. after `io()`):

```ts
import {
  instrumentSocketIoClient,
  socketLogStore,
  socketConnectionStore,
} from "@supriyadies-work/rn-devtools";

const uninstrument = instrumentSocketIoClient(socket, {
  enabled: () => isDevToolsEnabled(),
  url: process.env.EXPO_PUBLIC_API_BASE_URL,
  sanitizePayload: (event, payload) => redactSensitiveData(payload),
});

// On teardown (optional)
uninstrument();
socketConnectionStore.reset();
socketLogStore.clear();
```

The instrumentor logs:

- **Outbound** — wrapped `socket.emit` calls
- **Inbound** — `socket.onAny` (excluding lifecycle events)
- **System** — `connect`, `disconnect`, `connect_error`, `reconnect`, `reconnect_attempt`, `reconnect_failed`

Room/business tracking is derived from `join_conversation_room`, `leave_conversation_room`, `join_business`, and `leave_business` emits.

## Public API

| Export | Purpose |
|--------|---------|
| `DevToolsHost` | Root component — mount once in your app tree |
| `resolveDevToolsEnabled` | Helper for dev-only gating |
| `httpLogStore` | Push/patch/clear HTTP log entries |
| `socketLogStore` | Push/clear socket log entries |
| `pushCallLogStore` | Push/clear Push/Call QA log entries |
| `createPushCallLogEntryId` | Generate unique Push/Call log entry IDs |
| `DEFAULT_PUSH_CALL_TERMS` | Default English TnC body for Activate |
| `socketConnectionStore` | Read/update/reset live connection snapshot |
| `instrumentSocketIoClient` | Instrument `socket.io-client` for logging |
| `createSocketLogEntryId` | Generate unique socket log entry IDs |
| `toCurl` | Convert `HttpLogEntry` to curl string |
| `maybeSimulateNetworkFailure` | Apply simulator before requests |
| `networkSimulatorStore` | Read/write simulator state programmatically |
| `configureNetworkSimulator` | Set initial simulator state on boot |
| `segmentsToRouteFile` | Map Expo Router segments to file path |
| `DEVTOOLS_BRAND_NAME`, `DEVTOOLS_VERSION`, `DEVTOOLS_VERSION_LABEL` | Brand constants |

## Security guarantees

- Library does **not** pull data from the host automatically.
- Library does **not** send telemetry or upload to third parties.
- All displayed/exported data is supplied explicitly by the host via adapters, `httpLogStore`, `pushCallLogStore`, and `instrumentSocketIoClient`.
- Treat all data as potentially sensitive — sanitize before pushing to devtools.
- Push/Call logging is opt-in (TnC Accept); Deactivate clears the buffer.

## Host responsibility

- Define an allowlist of safe data for devtools (tokens, sessions, PII must be redacted).
- Wire `StorageEntry.redacted: true` for sensitive keys.
- Keep devtools disabled in production builds (`enabled: false`).
- Own persistence for FAB position, deep link history, Push/Call consent, and export share behavior.

## What's New — v0.3.1

- Push/Call **?** diagnostics popup (app/build, Notifee/Firebase versions, mic/phone/notif perms, FCM token while logging ON) with Copy all.
- OS permission refreshes on Accept and consent restore (no stuck `unknown`).
- Filter chips no longer clip under a long All list.
- FCM/Notifee rows: title + body; CallKit rows: caller name (ids in detail only).

## What's New — v0.3.0

- Push/Call logging tab for QA: see whether a notification or call was received, shown, failed, or skipped — on device, without Metro.
- Opt-in only: Activate shows terms; after Accept, the app may request notification permission. Deactivate revokes logging and clears the log buffer.
- App / Build now shows version name and build identifier so QA can report exactly which build was tested.
- Export / Copy all includes sanitized push/call traces (event payloads stay allowlisted — no tokens/SDP/phones in log rows).

## Contributing

All changes to `main` must go through a Pull Request. See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

Private / unpublished — check repository settings for current license terms.
