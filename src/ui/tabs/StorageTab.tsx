import React, { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import type { AppInfo, StateSnapshot, StorageEntry } from "../../core/types";
import { copyToClipboard } from "../copyToClipboard";
import { colors } from "../theme";

type StorageTabProps = {
  appInfo: AppInfo;
  stateSnapshot: StateSnapshot;
  onRefreshState?: () => void;
  onFullReset?: () => void | Promise<void>;
};

const AppInfoSection = ({ appInfo }: { appInfo: AppInfo }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>App / Build</Text>
    {[
      ["Variant", appInfo.appVariant],
      ["API URL", appInfo.apiBaseUrl],
      ["Supabase URL", appInfo.supabaseUrl ?? "(unset)"],
      ["Bundle ID", appInfo.bundleId ?? "(unset)"],
      ["App name", appInfo.appName ?? "(unset)"],
      ["__DEV__", String(appInfo.isDev)],
    ].map(([key, value]) => (
      <View key={key} style={styles.entryRow}>
        <Text style={styles.entryKey}>{key}</Text>
        <Text selectable style={styles.entryValue}>
          {value}
        </Text>
      </View>
    ))}
  </View>
);

const StateSectionView = ({ title, entries }: { title: string; entries: StorageEntry[] }) => {
  const [expanded, setExpanded] = useState(true);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  return (
    <View style={styles.section}>
      <Pressable onPress={() => setExpanded((v) => !v)} style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          {expanded ? "▼" : "▶"} {title} ({entries.length})
        </Text>
      </Pressable>
      {expanded
        ? entries.map((entry) => {
            const isOpen = selectedKey === entry.key;
            return (
              <View key={entry.key} style={styles.entryBlock}>
                <Pressable
                  onPress={() =>
                    setSelectedKey(isOpen ? null : entry.key)
                  }
                >
                  <Text style={styles.entryKey}>
                    {entry.label ?? entry.key}
                    {entry.redacted ? " 🔒" : ""}
                  </Text>
                  {!isOpen ? (
                    <Text numberOfLines={1} style={styles.entryPreview}>
                      {entry.value}
                    </Text>
                  ) : (
                    <Text selectable style={styles.entryValue}>
                      {entry.value}
                    </Text>
                  )}
                </Pressable>
                {isOpen && !entry.redacted ? (
                  <Pressable
                    onPress={() => void copyToClipboard(entry.value)}
                    style={styles.copyBtn}
                  >
                    <Text style={styles.copyText}>Copy</Text>
                  </Pressable>
                ) : null}
              </View>
            );
          })
        : null}
    </View>
  );
};

export const StorageTab = ({
  appInfo,
  stateSnapshot,
  onRefreshState,
  onFullReset,
}: StorageTabProps) => {
  const handleReset = () => {
    Alert.alert(
      "Full reset",
      "Clear React Query cache, MMKV storage, and sign out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: () => void onFullReset?.(),
        },
      ],
    );
  };

  return (
    <View style={styles.flex}>
      <ScrollView contentContainerStyle={styles.container}>
        <AppInfoSection appInfo={appInfo} />
        {stateSnapshot.sections.map((section) => (
          <StateSectionView
            key={section.id}
            title={section.title}
            entries={section.entries}
          />
        ))}
      </ScrollView>
      <View style={styles.footer}>
        {onRefreshState ? (
          <Pressable onPress={onRefreshState} style={styles.refreshBtn}>
            <Text style={styles.refreshText}>Refresh all</Text>
          </Pressable>
        ) : null}
        {onFullReset ? (
          <Pressable onPress={handleReset} style={styles.resetBtn}>
            <Text style={styles.resetText}>Full reset</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 16, paddingBottom: 8, gap: 8 },
  section: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  sectionHeader: { marginBottom: 4 },
  sectionTitle: { color: colors.text, fontSize: 14, fontWeight: "700" },
  entryBlock: { marginTop: 8, gap: 4 },
  entryRow: { marginTop: 6, gap: 2 },
  entryKey: { color: colors.muted, fontSize: 12, fontWeight: "600" },
  entryPreview: { color: colors.text, fontSize: 12, opacity: 0.7 },
  entryValue: {
    color: colors.text,
    fontSize: 11,
    fontFamily: "Menlo",
    marginTop: 2,
  },
  copyBtn: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: colors.border,
    borderRadius: 4,
  },
  copyText: { color: colors.accent, fontSize: 11 },
  footer: {
    flexDirection: "row",
    gap: 8,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  refreshBtn: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  refreshText: { color: colors.accent, fontWeight: "600" },
  resetBtn: {
    flex: 1,
    backgroundColor: colors.danger,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  resetText: { color: "#fff", fontWeight: "600" },
});
