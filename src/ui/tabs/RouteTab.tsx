import React from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import type { RouteInfo } from "../../core/types";
import { copyToClipboard } from "../copyToClipboard";
import { colors } from "../theme";

type RouteTabProps = {
  routeInfo: RouteInfo | null;
};

const Row = ({
  label,
  value,
  onCopy,
}: {
  label: string;
  value: string;
  onCopy?: () => void;
}) => (
  <View style={styles.row}>
    <Text style={styles.label}>{label}</Text>
    <Text selectable style={styles.value}>
      {value}
    </Text>
    {onCopy ? (
      <Pressable onPress={onCopy} style={styles.copyBtn}>
        <Text style={styles.copyText}>Copy</Text>
      </Pressable>
    ) : null}
  </View>
);

export const RouteTab = ({ routeInfo }: RouteTabProps) => {
  if (!routeInfo) {
    return (
      <View style={styles.empty}>
        <Text style={styles.muted}>No route info</Text>
      </View>
    );
  }

  const paramsText = JSON.stringify(routeInfo.params, null, 2);
  const segmentsText = routeInfo.segments.join(" / ");

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Row label="Pathname" value={routeInfo.pathname} />
      <Row label="Segments" value={segmentsText || "(empty)"} />
      <Row
        label="Route file"
        value={routeInfo.routeFile}
        onCopy={() => void copyToClipboard(routeInfo.routeFile)}
      />
      <Row
        label="Screen file"
        value={routeInfo.screenFile ?? "(unknown)"}
        onCopy={
          routeInfo.screenFile
            ? () => void copyToClipboard(routeInfo.screenFile!)
            : undefined
        }
      />
      <View style={styles.row}>
        <Text style={styles.label}>Params</Text>
        <Text selectable style={styles.mono}>
          {paramsText}
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  row: { gap: 4 },
  label: { color: colors.muted, fontSize: 12, fontWeight: "600" },
  value: { color: colors.text, fontSize: 14 },
  mono: {
    color: colors.text,
    fontSize: 12,
    fontFamily: "Menlo",
    backgroundColor: colors.surface,
    padding: 8,
    borderRadius: 6,
  },
  muted: { color: colors.muted },
  copyBtn: {
    alignSelf: "flex-start",
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: colors.surface,
    borderRadius: 4,
  },
  copyText: { color: colors.accent, fontSize: 12 },
});
