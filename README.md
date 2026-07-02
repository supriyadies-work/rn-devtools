# @supriyadies-work/rn-devtools

**Supr - Devtools** — host-agnostic React Native DevTools panel. Mount once at the app root, wire optional adapters, and get a floating debug panel without coupling to your domain logic.

## Features

### Floating panel (FAB)

- Draggable floating action button with persisted position (`initialFabPosition` / `onFabPositionChange`).
- Opens a full-screen modal panel with five tabs.
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

- App variant, API URL, Supabase URL, bundle ID, app name, `__DEV__` flag.

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
  "devtools": { "brand": "Supr - Devtools", "version": "0.1.0" },
  "appInfo": { ... },
  "routeInfo": { ... },
  "networkSimulator": { ... },
  "httpLogs": [ ... ],
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
    isDev: __DEV__,
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

## Public API

| Export | Purpose |
|--------|---------|
| `DevToolsHost` | Root component — mount once in your app tree |
| `resolveDevToolsEnabled` | Helper for dev-only gating |
| `httpLogStore` | Push/patch/clear HTTP log entries |
| `toCurl` | Convert `HttpLogEntry` to curl string |
| `maybeSimulateNetworkFailure` | Apply simulator before requests |
| `networkSimulatorStore` | Read/write simulator state programmatically |
| `configureNetworkSimulator` | Set initial simulator state on boot |
| `segmentsToRouteFile` | Map Expo Router segments to file path |
| `DEVTOOLS_BRAND_NAME`, `DEVTOOLS_VERSION`, `DEVTOOLS_VERSION_LABEL` | Brand constants |

## Security guarantees

- Library does **not** pull data from the host automatically.
- Library does **not** send telemetry or upload to third parties.
- All displayed/exported data is supplied explicitly by the host via adapters and `httpLogStore`.
- Treat all data as potentially sensitive — sanitize before pushing to devtools.

## Host responsibility

- Define an allowlist of safe data for devtools (tokens, sessions, PII must be redacted).
- Wire `StorageEntry.redacted: true` for sensitive keys.
- Keep devtools disabled in production builds (`enabled: false`).
- Own persistence for FAB position, deep link history, and export share behavior.

## Contributing

All changes to `main` must go through a Pull Request. See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

Private / unpublished — check repository settings for current license terms.
