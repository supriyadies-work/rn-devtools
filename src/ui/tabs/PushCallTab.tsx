import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import type {
  AppInfo,
  PushCallAdapter,
  PushCallDiagnostics,
  PushCallLogEntry,
  PushCallLogOutcome,
  PushCallLogSource,
  PushCallOsPermission,
} from "../../core/types";
import { DEFAULT_PUSH_CALL_TERMS } from "../../pushCall/defaultTerms";
import {
  createPushCallLogEntryId,
  pushCallLogStore,
} from "../../pushCall/pushCallLogStore";
import { copyToClipboard } from "../copyToClipboard";
import { CopyIconButton } from "../CopyIconButton";
import { formatJsonBody } from "../formatJsonBody";
import { usePushCallLogEntries } from "../hooks/usePushCallLogEntries";
import { SectionHeader } from "../SectionHeader";
import { colors } from "../theme";

type PushCallTabProps = {
  appInfo: AppInfo;
  adapter: PushCallAdapter;
};

type FilterId = "all" | "failed" | PushCallLogSource;

const outcomeChip = (
  outcome?: PushCallLogOutcome,
): { label: string; color: string } => {
  switch (outcome) {
    case "display_ok":
      return { label: "SHOWN", color: colors.success };
    case "display_fail":
      return { label: "FAILED", color: colors.danger };
    case "skipped":
      return { label: "SKIPPED", color: colors.muted };
    case "lifecycle":
      return { label: "CALL", color: colors.accent };
    case "received":
      return { label: "RECEIVED", color: colors.warning };
    default:
      return { label: "EVENT", color: colors.muted };
  }
};

const sourceLabel: Record<PushCallLogSource, string> = {
  fcm: "FCM",
  notifee: "Notifee",
  voip: "VoIP",
  callkit: "CallKit",
  system: "System",
};

const formatTime = (timestamp: number) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

const asRecord = (payload: unknown): Record<string, unknown> | null => {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    return payload as Record<string, unknown>;
  }
  return null;
};

const strField = (
  record: Record<string, unknown> | null,
  ...keys: string[]
): string | undefined => {
  if (!record) return undefined;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
};

type RowPreview = { title?: string; subtitle?: string; fallback: string };

const rowPreview = (entry: PushCallLogEntry): RowPreview => {
  const payload = asRecord(entry.payload);
  const fallback = entry.summary || entry.event;

  if (entry.source === "fcm" || entry.source === "notifee") {
    const title = strField(payload, "title");
    const body = strField(payload, "body");
    if (title || body) {
      return { title, subtitle: body, fallback };
    }
  }

  if (entry.source === "callkit") {
    const caller =
      strField(payload, "caller_name", "handle", "title") ?? "Incoming call";
    const label =
      entry.outcome === "display_fail"
        ? "Incoming call UI failed"
        : entry.outcome === "display_ok"
          ? "Incoming call UI"
          : entry.summary && !/uuid=|room_id=/i.test(entry.summary)
            ? entry.summary
            : entry.event;
    return { title: caller, subtitle: label, fallback: caller };
  }

  return { fallback };
};

const pushSystemLog = (event: string, payload?: unknown) => {
  pushCallLogStore.push({
    id: createPushCallLogEntryId(),
    timestamp: Date.now(),
    source: "system",
    event,
    outcome: "lifecycle",
    summary: event,
    payload,
  });
};

export const PushCallTab = ({ appInfo, adapter }: PushCallTabProps) => {
  const entries = usePushCallLogEntries();
  const [loggingEnabled, setLoggingEnabled] = useState(false);
  const [osPermission, setOsPermission] =
    useState<PushCallOsPermission>("unknown");
  const [showTerms, setShowTerms] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [activating, setActivating] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterId>("all");
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<PushCallDiagnostics | null>(
    null,
  );

  const refreshOsPermission = useCallback(async () => {
    if (!adapter.getOsNotificationPermission) return;
    try {
      const status = await adapter.getOsNotificationPermission();
      setOsPermission(status);
    } catch {
      setOsPermission("unknown");
    }
  }, [adapter]);

  const refreshFcmToken = useCallback(async () => {
    if (!adapter.getFcmToken) {
      setFcmToken(null);
      return;
    }
    try {
      const token = await adapter.getFcmToken();
      setFcmToken(token ?? null);
    } catch {
      setFcmToken(null);
    }
  }, [adapter]);

  const refreshDiagnostics = useCallback(async () => {
    if (!adapter.getDiagnostics) {
      setDiagnostics(null);
      return;
    }
    try {
      const value = await Promise.resolve(adapter.getDiagnostics());
      setDiagnostics(value ?? null);
    } catch {
      setDiagnostics(null);
    }
  }, [adapter]);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve(adapter.loadConsent()).then(async (enabled) => {
      if (cancelled) return;
      setLoggingEnabled(Boolean(enabled));
      if (enabled) {
        adapter.onLoggingChange(true);
        await refreshOsPermission();
        await refreshFcmToken();
      }
    });
    return () => {
      cancelled = true;
    };
  }, [adapter, refreshFcmToken, refreshOsPermission]);

  const filtered = useMemo(() => {
    return entries.filter((entry) => {
      if (filter === "all") return true;
      if (filter === "failed") return entry.outcome === "display_fail";
      return entry.source === filter;
    });
  }, [entries, filter]);

  const reversed = [...filtered].reverse();
  const selected = entries.find((entry) => entry.id === selectedId) ?? null;

  const handleAcceptTerms = async () => {
    setActivating(true);
    try {
      setShowTerms(false);
      await adapter.saveConsent(true);
      adapter.onLoggingChange(true);
      setLoggingEnabled(true);
      pushSystemLog("consent_accepted");
      const granted = await adapter.requestOsNotificationPermission();
      setOsPermission(granted ? "granted" : "denied");
      if (adapter.getOsNotificationPermission) {
        await refreshOsPermission();
      }
      pushSystemLog(
        granted ? "os_permission_granted" : "os_permission_denied",
        { granted },
      );
      await refreshFcmToken();
    } finally {
      setActivating(false);
    }
  };

  const handleDeactivate = async () => {
    await adapter.saveConsent(false);
    adapter.onLoggingChange(false);
    pushCallLogStore.clear();
    setLoggingEnabled(false);
    setOsPermission("unknown");
    setSelectedId(null);
    setFcmToken(null);
  };

  const handleCopyAll = async () => {
    const payload = {
      appInfo: {
        versionName: appInfo.versionName,
        buildNumber: appInfo.buildNumber,
        bundleId: appInfo.bundleId,
        appVariant: appInfo.appVariant,
      },
      loggingEnabled,
      osPermission,
      ...(loggingEnabled && fcmToken ? { fcmToken } : {}),
      pushCallLogs: entries,
    };
    await copyToClipboard(formatJsonBody(payload));
  };

  const openInfoPopup = async () => {
    setShowInfo(true);
    await Promise.all([
      refreshOsPermission(),
      refreshDiagnostics(),
      loggingEnabled ? refreshFcmToken() : Promise.resolve(),
    ]);
  };

  const infoRows = useMemo(() => {
    const rows: [string, string][] = [
      ["Variant", appInfo.appVariant],
      ["API URL", appInfo.apiBaseUrl],
      ["Supabase URL", appInfo.supabaseUrl ?? "(unset)"],
      ["Bundle ID", appInfo.bundleId ?? "(unset)"],
      ["App name", appInfo.appName ?? "(unset)"],
      ["Version", appInfo.versionName ?? "(unset)"],
      ["Build identifier", appInfo.buildNumber ?? "(unset)"],
      ["__DEV__", String(appInfo.isDev)],
      ["Logging", loggingEnabled ? "ON" : "OFF"],
      ["OS notification", osPermission],
      ["Notifee", diagnostics?.notifeeVersion ?? "(unset)"],
      [
        "Firebase Messaging",
        diagnostics?.firebaseMessagingVersion ?? "(unset)",
      ],
      ["Firebase App", diagnostics?.firebaseAppVersion ?? "(unset)"],
      ["Microphone", diagnostics?.microphone ?? "(unset)"],
      ["Call phone", diagnostics?.callPhone ?? "n/a"],
      ["Read phone", diagnostics?.readPhone ?? "n/a"],
      [
        "FCM token",
        loggingEnabled
          ? fcmToken ?? "(unavailable)"
          : "(logging OFF)",
      ],
    ];
    return rows;
  }, [appInfo, diagnostics, fcmToken, loggingEnabled, osPermission]);

  const handleCopyInfo = async () => {
    const obj = Object.fromEntries(infoRows);
    await copyToClipboard(formatJsonBody(obj));
  };

  if (selected) {
    const payloadText = formatJsonBody(selected.payload);
    const chip = outcomeChip(selected.outcome);
    return (
      <View style={styles.flex}>
        <Pressable onPress={() => setSelectedId(null)} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <ScrollView contentContainerStyle={styles.detail}>
          <View style={styles.endpointRow}>
            <Text style={[styles.chip, { color: chip.color }]}>{chip.label}</Text>
            <Text style={styles.detailTitle}>
              {sourceLabel[selected.source]} · {selected.event}
            </Text>
            <CopyIconButton
              accessibilityLabel="Copy event"
              text={`${selected.source} ${selected.event}`}
            />
          </View>
          <Text style={styles.muted}>{formatTime(selected.timestamp)}</Text>
          {selected.summary ? (
            <Text style={styles.summary}>{selected.summary}</Text>
          ) : null}
          <SectionHeader copyText={payloadText} label="Payload" />
          <Text selectable style={styles.mono}>
            {payloadText || "(empty)"}
          </Text>
        </ScrollView>
      </View>
    );
  }

  const filters: { id: FilterId; label: string }[] = [
    { id: "all", label: "All" },
    { id: "failed", label: "Failed" },
    { id: "fcm", label: "FCM" },
    { id: "voip", label: "VoIP" },
    { id: "callkit", label: "CallKit" },
    { id: "notifee", label: "Notifee" },
    { id: "system", label: "System" },
  ];

  return (
    <View style={styles.flex}>
      <View style={styles.banner}>
        <View style={styles.bannerRow}>
          <Text
            style={[
              styles.statusText,
              { color: loggingEnabled ? colors.success : colors.muted },
            ]}
          >
            Logging {loggingEnabled ? "ON" : "OFF"}
          </Text>
          <Pressable
            accessibilityLabel="Push and call diagnostics"
            onPress={() => void openInfoPopup()}
            style={styles.infoBtn}
          >
            <Text style={styles.infoBtnText}>?</Text>
          </Pressable>
        </View>
        <Text style={styles.muted}>OS permission: {osPermission}</Text>
        <View style={styles.actions}>
          {loggingEnabled ? (
            <Pressable
              onPress={() => void handleDeactivate()}
              style={styles.dangerBtn}
            >
              <Text style={styles.dangerText}>Deactivate</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => setShowTerms(true)}
              disabled={activating}
              style={styles.primaryBtn}
            >
              <Text style={styles.primaryText}>Activate logging</Text>
            </Pressable>
          )}
          <Pressable
            onPress={() => void handleCopyAll()}
            style={styles.secondaryBtn}
          >
            <Text style={styles.secondaryText}>Copy all</Text>
          </Pressable>
          <Pressable
            onPress={() => pushCallLogStore.clear()}
            style={styles.secondaryBtn}
          >
            <Text style={styles.secondaryText}>Clear</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.filterBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {filters.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => setFilter(item.id)}
              style={[
                styles.filterChip,
                filter === item.id && styles.filterChipActive,
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  filter === item.id && styles.filterTextActive,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View style={styles.listWrap}>
        {!loggingEnabled && entries.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              Logging is off — Activate to capture push/call events for QA.
            </Text>
          </View>
        ) : loggingEnabled && reversed.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              Waiting for push or call events…
            </Text>
          </View>
        ) : (
          <FlatList
            data={reversed}
            keyExtractor={(item) => item.id}
            style={styles.flex}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => {
              const chip = outcomeChip(item.outcome);
              const preview = rowPreview(item);
              return (
                <Pressable
                  onPress={() => setSelectedId(item.id)}
                  style={styles.row}
                >
                  <View style={styles.rowTop}>
                    <Text style={[styles.chip, { color: chip.color }]}>
                      {chip.label}
                    </Text>
                    <Text style={styles.source}>
                      {sourceLabel[item.source]}
                    </Text>
                    <Text style={styles.time}>
                      {formatTime(item.timestamp)}
                    </Text>
                  </View>
                  {preview.title || preview.subtitle ? (
                    <>
                      {preview.title ? (
                        <Text numberOfLines={1} style={styles.rowTitle}>
                          {preview.title}
                        </Text>
                      ) : null}
                      {preview.subtitle ? (
                        <Text numberOfLines={1} style={styles.rowSubtitle}>
                          {preview.subtitle}
                        </Text>
                      ) : null}
                    </>
                  ) : (
                    <Text numberOfLines={2} style={styles.rowSummary}>
                      {preview.fallback}
                    </Text>
                  )}
                </Pressable>
              );
            }}
          />
        )}
      </View>

      <Modal
        visible={showTerms}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowTerms(false)}
      >
        <View style={styles.termsRoot}>
          <Text style={styles.termsTitle}>Terms — Push/Call logging</Text>
          <ScrollView contentContainerStyle={styles.termsBody}>
            <Text style={styles.termsText}>
              {adapter.termsText ?? DEFAULT_PUSH_CALL_TERMS}
            </Text>
          </ScrollView>
          <View style={styles.termsActions}>
            <Pressable
              onPress={() => setShowTerms(false)}
              style={styles.secondaryBtn}
            >
              <Text style={styles.secondaryText}>Decline</Text>
            </Pressable>
            <Pressable
              onPress={() => void handleAcceptTerms()}
              disabled={activating}
              style={styles.primaryBtn}
            >
              <Text style={styles.primaryText}>Accept</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showInfo}
        transparent
        animationType="fade"
        onRequestClose={() => setShowInfo(false)}
      >
        <Pressable style={styles.infoBackdrop} onPress={() => setShowInfo(false)}>
          <Pressable style={styles.infoCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.infoHeader}>
              <Text style={styles.infoTitle}>Push / Call diagnostics</Text>
              <Pressable onPress={() => setShowInfo(false)}>
                <Text style={styles.infoClose}>✕</Text>
              </Pressable>
            </View>
            <ScrollView style={styles.infoScroll}>
              {infoRows.map(([key, value]) => (
                <View key={key} style={styles.infoRow}>
                  <Text style={styles.infoKey}>{key}</Text>
                  <Text selectable style={styles.infoValue}>
                    {value}
                  </Text>
                </View>
              ))}
            </ScrollView>
            <Pressable
              onPress={() => void handleCopyInfo()}
              style={styles.primaryBtn}
            >
              <Text style={styles.primaryText}>Copy all</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  banner: {
    flexShrink: 0,
    padding: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  bannerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  statusText: { fontWeight: "700", fontSize: 14 },
  infoBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  infoBtnText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: "800",
  },
  muted: { color: colors.muted, fontSize: 12 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  primaryBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  primaryText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  secondaryBtn: {
    backgroundColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  secondaryText: { color: colors.accent, fontWeight: "600", fontSize: 13 },
  dangerBtn: {
    backgroundColor: colors.danger,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  dangerText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  filterBar: {
    flexGrow: 0,
    flexShrink: 0,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterRow: { paddingHorizontal: 8, paddingVertical: 8, gap: 6 },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.surface,
    marginRight: 6,
  },
  filterChipActive: { backgroundColor: colors.accent },
  filterText: { color: colors.muted, fontSize: 12, fontWeight: "600" },
  filterTextActive: { color: "#fff" },
  listWrap: { flex: 1, minHeight: 0 },
  list: { padding: 12, gap: 8 },
  row: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    gap: 4,
  },
  rowTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  chip: { fontSize: 11, fontWeight: "800", letterSpacing: 0.3 },
  source: { color: colors.muted, fontSize: 11, fontWeight: "600", flex: 1 },
  time: { color: colors.muted, fontSize: 11, fontFamily: "Menlo" },
  rowTitle: { color: colors.text, fontSize: 13, fontWeight: "600" },
  rowSubtitle: { color: colors.muted, fontSize: 12 },
  rowSummary: { color: colors.text, fontSize: 13 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  emptyText: { color: colors.muted, textAlign: "center", fontSize: 14 },
  backBtn: { padding: 12 },
  backText: { color: colors.accent, fontWeight: "600" },
  detail: { padding: 16, gap: 8 },
  endpointRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  detailTitle: { color: colors.text, fontWeight: "700", flex: 1 },
  summary: { color: colors.text, fontSize: 13 },
  mono: {
    color: colors.text,
    fontSize: 11,
    fontFamily: "Menlo",
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 10,
  },
  termsRoot: { flex: 1, backgroundColor: colors.bg, paddingTop: 24 },
  termsTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  termsBody: { padding: 16 },
  termsText: { color: colors.text, fontSize: 14, lineHeight: 22 },
  termsActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  infoBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    padding: 20,
  },
  infoCard: {
    backgroundColor: colors.bg,
    borderRadius: 12,
    padding: 16,
    maxHeight: "80%",
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  infoTitle: { color: colors.text, fontSize: 16, fontWeight: "700" },
  infoClose: { color: colors.muted, fontSize: 18, paddingHorizontal: 4 },
  infoScroll: { flexGrow: 0 },
  infoRow: { marginBottom: 10, gap: 2 },
  infoKey: { color: colors.muted, fontSize: 11, fontWeight: "700" },
  infoValue: { color: colors.text, fontSize: 12, fontFamily: "Menlo" },
});
