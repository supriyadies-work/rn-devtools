import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  DEVTOOLS_BRAND_NAME,
  DEVTOOLS_VERSION,
} from "../../core/brand";
import type { DevToolsConfig } from "../../core/types";
import { httpLogStore } from "../../http/httpLogStore";
import { networkSimulatorStore } from "../../network/networkSimulatorStore";
import { copyToClipboard } from "../copyToClipboard";
import { formatJsonBody } from "../formatJsonBody";
import { colors } from "../theme";

type ExportTabProps = {
  config: DevToolsConfig;
};

const createBundle = async (config: DevToolsConfig) => {
  const routeInfo = config.route?.getCurrentRoute() ?? null;
  const stateSnapshot = config.state?.getSnapshot() ?? { sections: [] };
  const extra = await config.export?.getExtraBundleData?.();

  return {
    createdAt: new Date().toISOString(),
    devtools: {
      brand: DEVTOOLS_BRAND_NAME,
      version: DEVTOOLS_VERSION,
    },
    appInfo: config.appInfo,
    routeInfo,
    networkSimulator: networkSimulatorStore.getState(),
    httpLogs: httpLogStore.getEntries(),
    stateSnapshot,
    extra: extra ?? null,
  };
};

export const ExportTab = ({ config }: ExportTabProps) => {
  const [preview, setPreview] = useState<string>("");

  const generate = async () => {
    const bundle = await createBundle(config);
    setPreview(formatJsonBody(bundle));
  };

  const copy = async () => {
    if (!preview) return;
    await copyToClipboard(preview);
  };

  const share = async () => {
    if (!preview) return;
    await config.export?.onShareBundle?.(preview);
  };

  return (
    <View style={styles.flex}>
      <View style={styles.toolbar}>
        <Pressable onPress={() => void generate()} style={styles.btn}>
          <Text style={styles.btnText}>Generate</Text>
        </Pressable>
        <Pressable onPress={() => void copy()} disabled={!preview} style={styles.btn}>
          <Text style={styles.btnText}>Copy</Text>
        </Pressable>
        <Pressable
          onPress={() => void share()}
          disabled={!preview || !config.export?.onShareBundle}
          style={styles.btn}
        >
          <Text style={styles.btnText}>Share</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.container}>
        <Text selectable style={styles.mono}>
          {preview || "Tap Generate to build debug bundle"}
        </Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  toolbar: {
    flexDirection: "row",
    gap: 8,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  btn: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  btnText: { color: colors.accent, fontWeight: "600" },
  container: { padding: 16 },
  mono: {
    color: colors.text,
    fontSize: 11,
    fontFamily: "Menlo",
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 10,
  },
});

