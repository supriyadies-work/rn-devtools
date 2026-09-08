import { useSyncExternalStore } from "react";

import { pushCallLogStore } from "../../pushCall/pushCallLogStore";

export const usePushCallLogEntries = () =>
  useSyncExternalStore(
    pushCallLogStore.subscribe,
    pushCallLogStore.getEntries,
    () => [],
  );
