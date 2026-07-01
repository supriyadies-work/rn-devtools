import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  getClipboardToastMessage,
  subscribeClipboardToast,
} from "./clipboardToast";
import { colors } from "./theme";

type ClipboardToastProps = {
  bottomInset?: number;
};

export const ClipboardToast = ({ bottomInset = 16 }: ClipboardToastProps) => {
  const [, refresh] = useState(0);

  useEffect(() => subscribeClipboardToast(() => refresh((n) => n + 1)), []);

  const toastMessage = getClipboardToastMessage();
  if (!toastMessage) return null;

  return (
    <View
      pointerEvents="none"
      style={[styles.container, { bottom: bottomInset + 12 }]}
    >
      <View style={styles.toast}>
        <Text style={styles.text}>{toastMessage}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 100000,
    elevation: 100000,
  },
  toast: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    maxWidth: "90%",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  text: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "500",
  },
});
