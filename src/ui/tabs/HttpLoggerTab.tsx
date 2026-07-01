import React, { useState } from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import type { HttpLogEntry } from "../../core/types";
import { toCurl } from "../../http/toCurl";
import { copyToClipboard } from "../copyToClipboard";
import { CopyIconButton } from "../CopyIconButton";
import { formatJsonBody } from "../formatJsonBody";
import { useHttpLogEntries } from "../hooks/useHttpLogEntries";
import { useNetworkSimulatorState } from "../hooks/useNetworkSimulatorState";
import { networkSimulatorStore } from "../../network/networkSimulatorStore";
import { SectionHeader } from "../SectionHeader";
import { httpLogStore } from "../../http/httpLogStore";
import { colors } from "../theme";

const statusColor = (entry: HttpLogEntry) => {
  if (entry.phase === "pending") return colors.warning;
  if (!entry.ok) return colors.danger;
  return colors.success;
};

const statusLabel = (entry: HttpLogEntry) => {
  if (entry.phase === "pending") return "…";
  return String(entry.status ?? "ERR");
};

export const HttpLoggerTab = () => {
  const entries = useHttpLogEntries();
  const simulatorState = useNetworkSimulatorState();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = entries.find((e) => e.id === selectedId) ?? null;
  const reversed = [...entries].reverse();

  if (selected) {
    const curl = toCurl(selected);
    const endpointLabel = `${selected.method} ${selected.path}`;
    const requestBodyText = formatJsonBody(selected.requestBody);
    const responseBodyText = formatJsonBody(selected.responseBody);

    return (
      <View style={styles.flex}>
        <Pressable onPress={() => setSelectedId(null)} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <ScrollView contentContainerStyle={styles.detail}>
          <View style={styles.endpointRow}>
            <Text style={styles.detailTitle}>{endpointLabel}</Text>
            <CopyIconButton
              accessibilityLabel="Copy endpoint path"
              text={endpointLabel}
            />
          </View>
          <Text style={styles.muted}>
            {statusLabel(selected)} · {selected.durationMs ?? 0}ms
          </Text>
          {selected.error ? (
            <Text style={styles.error}>{selected.error}</Text>
          ) : null}
          <SectionHeader copyText={requestBodyText} label="Request body" />
          <Text selectable style={styles.mono}>
            {requestBodyText}
          </Text>
          <SectionHeader copyText={responseBodyText} label="Response body" />
          <Text selectable style={styles.mono}>
            {responseBodyText}
          </Text>
          {curl ? (
            <Pressable
              onPress={() => void copyToClipboard(curl)}
              style={styles.copyBtn}
            >
              <Text style={styles.copyText}>Copy curl</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <View style={styles.simulator}>
        <Text style={styles.simLabel}>Simulator</Text>
        <View style={styles.simRow}>
          <Pressable
            onPress={() =>
              networkSimulatorStore.setState({ enabled: !simulatorState.enabled })
            }
            style={[
              styles.simPill,
              simulatorState.enabled && styles.simPillActive,
            ]}
          >
            <Text style={styles.simPillText}>
              {simulatorState.enabled ? "ON" : "OFF"}
            </Text>
          </Pressable>
          {(["none", "fast3g", "slow3g", "offline"] as const).map((profile) => (
            <Pressable
              key={profile}
              onPress={() =>
                networkSimulatorStore.setState({ throttleProfile: profile })
              }
              style={[
                styles.simPill,
                simulatorState.throttleProfile === profile &&
                  styles.simPillActive,
              ]}
            >
              <Text style={styles.simPillText}>{profile}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.simRow}>
          {[0, 300, 1000].map((delay) => (
            <Pressable
              key={delay}
              onPress={() => networkSimulatorStore.setState({ delayMs: delay })}
              style={[
                styles.simPill,
                simulatorState.delayMs === delay && styles.simPillActive,
              ]}
            >
              <Text style={styles.simPillText}>+{delay}ms</Text>
            </Pressable>
          ))}
          {[undefined, 401, 500].map((status) => (
            <Pressable
              key={status ?? "none"}
              onPress={() =>
                networkSimulatorStore.setForcedError(
                  status ? { status } : undefined,
                )
              }
              style={[
                styles.simPill,
                (simulatorState.forcedError?.status ?? 0) === (status ?? 0) &&
                  styles.simPillActive,
              ]}
            >
              <Text style={styles.simPillText}>
                {status ? `ERR ${status}` : "NoErr"}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
      <View style={styles.toolbar}>
        <Text style={styles.count}>{entries.length} requests</Text>
        <Pressable onPress={() => httpLogStore.clear()} style={styles.clearBtn}>
          <Text style={styles.clearText}>Clear</Text>
        </Pressable>
      </View>
      <FlatList
        data={reversed}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.muted}>No HTTP requests yet</Text>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => setSelectedId(item.id)}
            style={styles.item}
          >
            <View style={styles.itemHeader}>
              <Text style={styles.method}>{item.method}</Text>
              <Text style={[styles.status, { color: statusColor(item) }]}>
                {statusLabel(item)}
              </Text>
              <Text style={styles.duration}>
                {item.phase === "done" ? `${item.durationMs}ms` : "…"}
              </Text>
            </View>
            <Text numberOfLines={2} style={styles.path}>
              {item.path}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  simulator: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 8,
  },
  simLabel: { color: colors.muted, fontSize: 12, fontWeight: "700" },
  simRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  simPill: {
    backgroundColor: colors.surface,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  simPillActive: {
    borderWidth: 1,
    borderColor: colors.accent,
  },
  simPillText: { color: colors.text, fontSize: 11, fontWeight: "600" },
  toolbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  count: { color: colors.muted, fontSize: 12 },
  clearBtn: { padding: 4 },
  clearText: { color: colors.danger, fontSize: 12 },
  list: { padding: 8, gap: 8 },
  item: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  itemHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  method: { color: colors.accent, fontWeight: "700", fontSize: 12 },
  status: { fontSize: 12, fontWeight: "600" },
  duration: { color: colors.muted, fontSize: 11, marginLeft: "auto" },
  path: { color: colors.text, fontSize: 13, marginTop: 4 },
  muted: { color: colors.muted, textAlign: "center", padding: 24 },
  backBtn: { padding: 12 },
  backText: { color: colors.accent, fontSize: 14 },
  detail: { padding: 16, gap: 8 },
  endpointRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  detailTitle: { color: colors.text, fontSize: 16, fontWeight: "600", flex: 1 },
  mono: {
    color: colors.text,
    fontSize: 11,
    fontFamily: "Menlo",
    backgroundColor: colors.surface,
    padding: 8,
    borderRadius: 6,
  },
  error: { color: colors.danger, fontSize: 13 },
  copyBtn: {
    marginTop: 12,
    alignSelf: "flex-start",
    backgroundColor: colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  copyText: { color: "#fff", fontWeight: "600" },
});
