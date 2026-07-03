import React, { useSyncExternalStore, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  DEVTOOLS_BRAND_NAME,
  DEVTOOLS_VERSION_LABEL,
} from "../core/brand";
import type { DevToolsConfig } from "../core/types";
import { ClipboardToast } from "./ClipboardToast";
import { colors } from "./theme";
import { DeepLinkTab } from "./tabs/DeepLinkTab";
import { ExportTab } from "./tabs/ExportTab";
import { HttpLoggerTab } from "./tabs/HttpLoggerTab";
import { RouteTab } from "./tabs/RouteTab";
import { SocketLoggerTab } from "./tabs/SocketLoggerTab";
import { StorageTab } from "./tabs/StorageTab";

type TabId = "route" | "http" | "socket" | "storage" | "deeplink" | "export";

const TABS: { id: TabId; label: string }[] = [
  { id: "route", label: "Route" },
  { id: "http", label: "HTTP" },
  { id: "socket", label: "Socket" },
  { id: "storage", label: "Storage" },
  { id: "deeplink", label: "DeepLink" },
  { id: "export", label: "Export" },
];

type DevToolsPanelProps = {
  config: DevToolsConfig;
  visible: boolean;
  onClose: () => void;
};

export const DevToolsPanel = ({
  visible,
  onClose,
  config,
}: DevToolsPanelProps) => {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabId>("route");
  const routeInfo = useSyncExternalStore(
    config.route?.subscribe ?? (() => () => {}),
    () => config.route?.getCurrentRoute() ?? null,
    () => config.route?.getCurrentRoute() ?? null,
  );
  const stateSnapshot = useSyncExternalStore(
    config.state?.subscribe ?? (() => () => {}),
    () => config.state?.getSnapshot() ?? { sections: [] },
    () => config.state?.getSnapshot() ?? { sections: [] },
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <View style={styles.titleBlock}>
            <Text style={styles.title}>{DEVTOOLS_BRAND_NAME}</Text>
            <Text style={styles.version}>{DEVTOOLS_VERSION_LABEL}</Text>
          </View>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={styles.close}>✕</Text>
          </Pressable>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabBar}
        >
          {TABS.map((tab) => (
            <Pressable
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              style={[styles.tab, activeTab === tab.id && styles.tabActive]}
            >
              <Text
                style={[
                  styles.tabLabel,
                  activeTab === tab.id && styles.tabLabelActive,
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
        <View style={styles.content}>
          {activeTab === "route" ? (
            <RouteTab routeInfo={routeInfo} />
          ) : null}
          {activeTab === "http" ? <HttpLoggerTab /> : null}
          {activeTab === "socket" ? <SocketLoggerTab /> : null}
          {activeTab === "storage" ? (
            <StorageTab
              appInfo={config.appInfo}
              stateSnapshot={stateSnapshot}
              onRefreshState={config.state?.onRefresh}
              onFullReset={config.state?.onFullReset}
            />
          ) : null}
          {activeTab === "deeplink" ? (
            <DeepLinkTab adapter={config.deeplink} />
          ) : null}
          {activeTab === "export" ? <ExportTab config={config} /> : null}
        </View>
        <ClipboardToast bottomInset={insets.bottom} />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  titleBlock: { flex: 1, gap: 2 },
  title: { color: colors.text, fontSize: 18, fontWeight: "700" },
  version: { color: colors.muted, fontSize: 11, fontWeight: "500" },
  close: { color: colors.muted, fontSize: 22 },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    minWidth: 72,
    paddingHorizontal: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  tabActive: { borderBottomWidth: 2, borderBottomColor: colors.accent },
  tabLabel: { color: colors.muted, fontSize: 13, fontWeight: "600" },
  tabLabelActive: { color: colors.accent },
  content: { flex: 1 },
});
