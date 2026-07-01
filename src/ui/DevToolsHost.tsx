import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

import type { DevToolsConfig } from "../core/types";
import { configureNetworkSimulator } from "../network/networkSimulatorStore";
import { DevToolsFab } from "./DevToolsFab";
import { DevToolsPanel } from "./DevToolsPanel";

type DevToolsHostProps = {
  config: DevToolsConfig;
};

export const DevToolsHost = ({ config }: DevToolsHostProps) => {
  const [open, setOpen] = useState(false);
  const [fabPosition, setFabPosition] = useState(config.initialFabPosition);

  useEffect(() => {
    configureNetworkSimulator(config.network?.initialState);
  }, [config.network?.initialState]);

  if (!config.enabled) return null;

  return (
    <View
      pointerEvents="box-none"
      style={[StyleSheet.absoluteFill, styles.overlay]}
    >
      <DevToolsFab
        onPress={() => setOpen(true)}
        initialPosition={fabPosition}
        onPositionChange={(position) => {
          setFabPosition(position);
          config.onFabPositionChange?.(position);
        }}
      />
      {open ? (
        <DevToolsPanel
          config={config}
          visible
          onClose={() => setOpen(false)}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    zIndex: 99999,
    elevation: 99999,
  },
});
