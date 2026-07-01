import { useSyncExternalStore } from "react";

import { httpLogStore } from "../../http/httpLogStore";

export const useHttpLogEntries = () =>
  useSyncExternalStore(httpLogStore.subscribe, httpLogStore.getEntries, () => []);
