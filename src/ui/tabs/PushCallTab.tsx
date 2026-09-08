import React, { useEffect, useMemo, useState } from "react";
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
  PushCallLogEntry,
  PushCallLogOutcome,
  PushCallLogSource,
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

type FilterId =
  | "all"
  | "failed"
  | PushCallLogSource;

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

const buildChipLabel = (appInfo: AppInfo) => {
  const version = appInfo.versionName ?? "?";
  const build = appInfo.buildNumber ?? "?";
  return `${version} (${build})`;
};

const rowSummary = (entry: PushCallLogEntry) => {
  if (entry.summary) return entry.summary;
  return entry.event;
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
  const [osPermission, setOsPermission] = useState<
    "unknown" | "granted" | "denied"
  >("unknown");
  const [showTerms, setShowTerms] = useState(false);
  const [activating, setActivating] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterId>("all");

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve(adapter.loadConsent()).then((enabled) => {
      if (cancelled) return;
      setLoggingEnabled(Boolean(enabled));
      if (enabled) {
        adapter.onLoggingChange(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [adapter]);

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
      pushSystemLog(
        granted ? "os_permission_granted" : "os_permission_denied",
        { granted },
      );
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
      pushCallLogs: entries,
    };
    await copyToClipboard(formatJsonBody(payload));
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
          <Text style={styles.buildChip}>{buildChipLabel(appInfo)}</Text>
        </View>
        <Text style={styles.muted}>
          OS permission: {osPermission}
        </Text>
        <View style={styles.actions}>
          {loggingEnabled ? (
            <Pressable onPress={() => void handleDeactivate()} style={styles.dangerBtn}>
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
          <Pressable onPress={() => void handleCopyAll()} style={styles.secondaryBtn}>
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

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterBar}
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
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const chip = outcomeChip(item.outcome);
            return (
              <Pressable
                onPress={() => setSelectedId(item.id)}
                style={styles.row}
              >
                <View style={styles.rowTop}>
                  <Text style={[styles.chip, { color: chip.color }]}>
                    {chip.label}
                  </Text>
                  <Text style={styles.source}>{sourceLabel[item.source]}</Text>
                  <Text style={styles.time}>{formatTime(item.timestamp)}</Text>
                </View>
                <Text numberOfLines={2} style={styles.rowSummary}>
                  {rowSummary(item)}
                </Text>
              </Pressable>
            );
          }}
        />
      )}

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
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  banner: {
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
  buildChip: {
    color: colors.text,
    fontSize: 11,
    fontFamily: "Menlo",
    backgroundColor: colors.bg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    overflow: "hidden",
  },
  muted: { color: colors.muted, fontSize: 12 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  primaryBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
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
  filterBar: { flexGrow: 0, borderBottomWidth: 1, borderBottomColor: colors.border },
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
  rowSummary: { color: colors.text, fontSize: 13 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  emptyText: { color: colors.muted, textAlign: "center", fontSize: 14 },
  backBtn: { padding: 12 },
  backText: { color: colors.accent, fontWeight: "600" },
  detail: { padding: 16, gap: 8 },
  endpointRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
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
});
