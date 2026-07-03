import React, { useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import type { SocketLogDirection, SocketLogEntry } from "../../core/types";
import { socketLogStore } from "../../socket/socketLogStore";
import { CopyIconButton } from "../CopyIconButton";
import { formatJsonBody } from "../formatJsonBody";
import { useSocketConnectionSnapshot } from "../hooks/useSocketConnectionSnapshot";
import { useSocketLogEntries } from "../hooks/useSocketLogEntries";
import { SectionHeader } from "../SectionHeader";
import { colors } from "../theme";

type DirectionFilter = "all" | SocketLogDirection;

const directionLabel: Record<SocketLogDirection, string> = {
  in: "IN",
  out: "OUT",
  system: "SYS",
};

const directionColor: Record<SocketLogDirection, string> = {
  in: colors.success,
  out: colors.accent,
  system: colors.warning,
};

const connectionColor = (state: string) => {
  if (state === "connected") return colors.success;
  if (state === "reconnecting" || state === "connecting") return colors.warning;
  return colors.danger;
};

const formatTime = (timestamp: number) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

const payloadPreview = (payload: unknown): string => {
  if (payload === undefined) return "";
  const text = formatJsonBody(payload);
  return text.length > 80 ? `${text.slice(0, 80)}…` : text;
};

export const SocketLoggerTab = () => {
  const entries = useSocketLogEntries();
  const connection = useSocketConnectionSnapshot();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [directionFilter, setDirectionFilter] = useState<DirectionFilter>("all");
  const [eventFilter, setEventFilter] = useState("");
  const [roomsExpanded, setRoomsExpanded] = useState(false);

  const filtered = useMemo(() => {
    const query = eventFilter.trim().toLowerCase();
    return entries.filter((entry) => {
      if (directionFilter !== "all" && entry.direction !== directionFilter) {
        return false;
      }
      if (query && !entry.event.toLowerCase().includes(query)) {
        return false;
      }
      return true;
    });
  }, [directionFilter, entries, eventFilter]);

  const reversed = [...filtered].reverse();
  const selected = entries.find((entry) => entry.id === selectedId) ?? null;

  if (selected) {
    const payloadText = formatJsonBody(selected.payload);

    return (
      <View style={styles.flex}>
        <Pressable onPress={() => setSelectedId(null)} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <ScrollView contentContainerStyle={styles.detail}>
          <View style={styles.endpointRow}>
            <Text style={styles.detailTitle}>
              {directionLabel[selected.direction]} · {selected.event}
            </Text>
            <CopyIconButton
              accessibilityLabel="Copy event name"
              text={`${selected.direction} ${selected.event}`}
            />
          </View>
          <Text style={styles.muted}>{formatTime(selected.timestamp)}</Text>
          <SectionHeader copyText={payloadText} label="Payload" />
          <Text selectable style={styles.mono}>
            {payloadText || "(empty)"}
          </Text>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <View style={styles.connectionBanner}>
        <View style={styles.connectionRow}>
          <View
            style={[
              styles.statusPill,
              { borderColor: connectionColor(connection.state) },
            ]}
          >
            <Text
              style={[styles.statusText, { color: connectionColor(connection.state) }]}
            >
              {connection.state.toUpperCase()}
            </Text>
          </View>
          {connection.socketId ? (
            <Text style={styles.metaText} numberOfLines={1}>
              id: {connection.socketId}
            </Text>
          ) : null}
        </View>
        <Text style={styles.metaText}>
          transport: {connection.transport ?? "—"} · business: {connection.businessId ?? "—"}
        </Text>
        <Pressable onPress={() => setRoomsExpanded((value) => !value)}>
          <Text style={styles.metaText}>
            rooms: {connection.joinedRooms.length}
            {connection.joinedRooms.length > 0 ? ` (${roomsExpanded ? "hide" : "show"})` : ""}
          </Text>
        </Pressable>
        {roomsExpanded && connection.joinedRooms.length > 0 ? (
          <Text style={styles.roomsText}>{connection.joinedRooms.join(", ")}</Text>
        ) : null}
      </View>

      <View style={styles.filterRow}>
        {(["all", "in", "out", "system"] as const).map((filter) => (
          <Pressable
            key={filter}
            onPress={() => setDirectionFilter(filter)}
            style={[styles.filterPill, directionFilter === filter && styles.filterPillActive]}
          >
            <Text style={styles.filterText}>
              {filter === "all" ? "All" : directionLabel[filter]}
            </Text>
          </Pressable>
        ))}
      </View>

      <TextInput
        onChangeText={setEventFilter}
        placeholder="Filter by event name"
        placeholderTextColor={colors.muted}
        style={styles.searchInput}
        value={eventFilter}
      />

      <View style={styles.toolbar}>
        <Text style={styles.count}>
          {filtered.length} events
          {filtered.length !== entries.length ? ` / ${entries.length}` : ""}
        </Text>
        <Pressable onPress={() => socketLogStore.clear()} style={styles.clearBtn}>
          <Text style={styles.clearText}>Clear</Text>
        </Pressable>
      </View>

      <FlatList
        contentContainerStyle={styles.list}
        data={reversed}
        keyExtractor={(item: SocketLogEntry) => item.id}
        ListEmptyComponent={
          <Text style={styles.muted}>No socket events yet</Text>
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => setSelectedId(item.id)} style={styles.item}>
            <View style={styles.itemHeader}>
              <Text style={[styles.direction, { color: directionColor[item.direction] }]}>
                {directionLabel[item.direction]}
              </Text>
              <Text style={styles.event}>{item.event}</Text>
              <Text style={styles.time}>{formatTime(item.timestamp)}</Text>
            </View>
            {item.payload !== undefined ? (
              <Text numberOfLines={1} style={styles.preview}>
                {payloadPreview(item.payload)}
              </Text>
            ) : null}
          </Pressable>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  connectionBanner: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 4,
  },
  connectionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: { fontSize: 11, fontWeight: "700" },
  metaText: { color: colors.muted, fontSize: 11 },
  roomsText: { color: colors.text, fontSize: 11 },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  filterPill: {
    backgroundColor: colors.surface,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  filterPillActive: {
    borderWidth: 1,
    borderColor: colors.accent,
  },
  filterText: { color: colors.text, fontSize: 11, fontWeight: "600" },
  searchInput: {
    marginHorizontal: 12,
    marginTop: 8,
    backgroundColor: colors.surface,
    borderRadius: 8,
    color: colors.text,
    fontSize: 13,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
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
  direction: { fontWeight: "700", fontSize: 11 },
  event: { color: colors.text, fontSize: 13, fontWeight: "600", flex: 1 },
  time: { color: colors.muted, fontSize: 11 },
  preview: { color: colors.muted, fontSize: 11, marginTop: 4 },
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
});
