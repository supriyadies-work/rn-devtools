import { useSyncExternalStore } from "react";

import { networkSimulatorStore } from "../../network/networkSimulatorStore";

export const useNetworkSimulatorState = () =>
  useSyncExternalStore(
    networkSimulatorStore.subscribe,
    networkSimulatorStore.getState,
    networkSimulatorStore.getState,
  );

