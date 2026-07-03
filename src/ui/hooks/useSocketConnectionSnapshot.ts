import { useSyncExternalStore } from "react";

import { socketConnectionStore } from "../../socket/socketConnectionStore";

export const useSocketConnectionSnapshot = () =>
  useSyncExternalStore(
    socketConnectionStore.subscribe,
    socketConnectionStore.getSnapshot,
    () => ({
      state: "disconnected" as const,
      joinedRooms: [],
      updatedAt: Date.now(),
    }),
  );
