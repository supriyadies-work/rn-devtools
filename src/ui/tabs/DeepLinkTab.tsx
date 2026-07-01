import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import type { DeepLinkAdapter } from "../../core/types";
import { copyToClipboard } from "../copyToClipboard";
import { colors } from "../theme";

type DeepLinkTabProps = {
  adapter?: DeepLinkAdapter;
};

export const DeepLinkTab = ({ adapter }: DeepLinkTabProps) => {
  const [input, setInput] = useState("");
  const [recent, setRecent] = useState<string[]>([]);
  const recentLimit = adapter?.recentLimit ?? 10;
  const presets = adapter?.presets ?? [];

  useEffect(() => {
    let mounted = true;
    if (!adapter?.loadRecent) return;
    Promise.resolve(adapter.loadRecent()).then((values) => {
      if (!mounted) return;
      setRecent(values.slice(0, recentLimit));
    });
    return () => {
      mounted = false;
    };
  }, [adapter, recentLimit]);

  const launch = async (url: string) => {
    if (!adapter?.open) return;
    const value = url.trim();
    if (!value) return;
    await adapter.open(value);
    const next = [value, ...recent.filter((item) => item !== value)].slice(
      0,
      recentLimit,
    );
    setRecent(next);
    await adapter.saveRecent?.(next);
  };

  const isDisabled = !adapter?.open;
  const allPresets = useMemo(() => presets, [presets]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.sectionTitle}>Launcher</Text>
      <TextInput
        value={input}
        onChangeText={setInput}
        placeholder="myapp://route?foo=bar"
        placeholderTextColor={colors.muted}
        editable={!isDisabled}
        style={styles.input}
      />
      <View style={styles.row}>
        <Pressable
          onPress={() => void launch(input)}
          disabled={isDisabled}
          style={[styles.primaryBtn, isDisabled && styles.disabledBtn]}
        >
          <Text style={styles.primaryText}>Open</Text>
        </Pressable>
        <Pressable
          onPress={() => void copyToClipboard(input)}
          disabled={!input}
          style={[styles.secondaryBtn, !input && styles.disabledBtn]}
        >
          <Text style={styles.secondaryText}>Copy</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>Presets</Text>
      {allPresets.length === 0 ? (
        <Text style={styles.muted}>No presets configured by host</Text>
      ) : (
        allPresets.map((preset) => (
          <Pressable
            key={preset.id}
            onPress={() => {
              setInput(preset.url);
              void launch(preset.url);
            }}
            style={styles.item}
          >
            <Text style={styles.itemTitle}>{preset.label}</Text>
            <Text style={styles.itemSub}>{preset.url}</Text>
          </Pressable>
        ))
      )}

      <Text style={styles.sectionTitle}>Recent</Text>
      {recent.length === 0 ? (
        <Text style={styles.muted}>No recent deep links</Text>
      ) : (
        recent.map((url) => (
          <Pressable key={url} onPress={() => void launch(url)} style={styles.item}>
            <Text style={styles.itemSub}>{url}</Text>
          </Pressable>
        ))
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { padding: 16, gap: 10 },
  sectionTitle: { color: colors.text, fontWeight: "700", marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    color: colors.text,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  row: { flexDirection: "row", gap: 8 },
  primaryBtn: {
    flex: 1,
    backgroundColor: colors.accent,
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  primaryText: { color: "#fff", fontWeight: "600" },
  secondaryBtn: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  secondaryText: { color: colors.accent, fontWeight: "600" },
  item: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 10,
    gap: 4,
  },
  itemTitle: { color: colors.text, fontWeight: "600" },
  itemSub: { color: colors.muted, fontSize: 12 },
  muted: { color: colors.muted },
  disabledBtn: { opacity: 0.5 },
});

