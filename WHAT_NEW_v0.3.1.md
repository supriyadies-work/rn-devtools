# What's New — v0.3.1

- Push/Call **?** diagnostics popup: app/build identity, Notifee + Firebase package versions, notification/mic/phone permissions, FCM token while logging is ON; **Copy all** inside the popup.
- OS permission banner refreshes on Accept **and** when consent is restored (no more stuck `unknown` after remount).
- Filter chips no longer clip when the All list is long.
- FCM / Notifee list rows show **title** + **body** (one line each); CallKit rows show **caller name** (uuid/room_id only in detail).
- Optional adapters: `getFcmToken`, `getOsNotificationPermission`, `getDiagnostics`.
