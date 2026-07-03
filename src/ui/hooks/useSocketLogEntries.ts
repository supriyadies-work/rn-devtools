import { useSyncExternalStore } from "react";

import { socketLogStore } from "../../socket/socketLogStore";

export const useSocketLogEntries = () =>
  useSyncExternalStore(socketLogStore.subscribe, socketLogStore.getEntries, () => []);
