# @supriyadies-work/rn-devtools

**Supr - Devtools** — host-agnostic React Native DevTools panel with:
- Route inspector
- HTTP logger + global network simulator
- Storage/state viewer
- Deep link launcher
- Debug bundle export

## Quick Start (5 menit)

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

## Adapter Contract

`DevToolsHost` memakai single config object.

### Required

- `enabled: boolean`
- `appInfo`

### Optional adapters

- `route`
  - `getCurrentRoute()`
  - `subscribe?(listener)`
- `state`
  - `getSnapshot()`
  - `subscribe?(listener)`
  - `onRefresh?()`
  - `onFullReset?()`
- `network`
  - `initialState` untuk simulator global (`throttleProfile`, `delayMs`, `forcedError`)
- `deeplink`
  - `open(url)`
  - `presets?`, `loadRecent?`, `saveRecent?`, `recentLimit?`
- `export`
  - `getExtraBundleData?()`
  - `onShareBundle?(json)`

Jika adapter tidak diisi, fitur fallback ke disabled/read-only state dan tidak crash.

## Network Bridge (Axios/fetch/api-slice)

Simulator global hanya butuh dipanggil sebelum request dieksekusi:

```ts
import { maybeSimulateNetworkFailure } from "@supriyadies-work/rn-devtools";

const simulated = await maybeSimulateNetworkFailure();
if (simulated) {
  return {
    ok: false,
    status: simulated.status,
    error: simulated.error,
  };
}
```

Pattern ini bisa dipasang di axios interceptor, fetch wrapper, RTK `baseQuery`, atau API layer lain.

## Security Guarantees

- Library tidak pull data host secara otomatis.
- Library tidak mengirim telemetry/upload pihak ketiga secara default.
- Data dianggap potentially sensitive, sanitization wajib sebelum render/copy/export.

## Host Responsibility

- Tentukan allowlist data yang aman untuk di-push ke devtools.
- Terapkan redaction policy domain app (token, session, PII).
- Pastikan devtools hanya aktif di build yang diizinkan (mis. dev-only).

