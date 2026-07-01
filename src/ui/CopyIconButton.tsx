import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";

import { copyToClipboard } from "./copyToClipboard";
import { colors } from "./theme";

type CopyIconButtonProps = {
  text: string;
  accessibilityLabel?: string;
};

export const CopyIconButton = ({
  text,
  accessibilityLabel = "Copy to clipboard",
}: CopyIconButtonProps) => (
  <Pressable
    accessibilityLabel={accessibilityLabel}
    hitSlop={8}
    onPress={() => void copyToClipboard(text)}
    style={styles.btn}
  >
    <Text style={styles.icon}>⧉</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  btn: {
    padding: 4,
    borderRadius: 4,
    backgroundColor: colors.surface,
  },
  icon: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: "600",
  },
});
