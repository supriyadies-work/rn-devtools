import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { CopyIconButton } from "./CopyIconButton";
import { colors } from "./theme";

type SectionHeaderProps = {
  label: string;
  copyText: string;
};

export const SectionHeader = ({ label, copyText }: SectionHeaderProps) => (
  <View style={styles.row}>
    <Text style={styles.label}>{label}</Text>
    <CopyIconButton accessibilityLabel={`Copy ${label}`} text={copyText} />
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    gap: 8,
  },
  label: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },
});
