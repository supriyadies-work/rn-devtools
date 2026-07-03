import type { SocketConnectionSnapshot } from "../core/types";

type Listener = () => void;

const defaultSnapshot = (): SocketConnectionSnapshot => ({
  state: "disconnected",
  joinedRooms: [],
  updatedAt: Date.now(),
});

const listeners = new Set<Listener>();
let snapshot: SocketConnectionSnapshot = defaultSnapshot();

const notify = () => {
  listeners.forEach((listener) => listener());
};

export const socketConnectionStore = {
  getSnapshot: (): SocketConnectionSnapshot => snapshot,

  setSnapshot: (patch: Partial<SocketConnectionSnapshot>) => {
    snapshot = {
      ...snapshot,
      ...patch,
      joinedRooms: patch.joinedRooms ?? snapshot.joinedRooms,
      updatedAt: Date.now(),
    };
    notify();
  },

  reset: () => {
    snapshot = defaultSnapshot();
    notify();
  },

  subscribe: (listener: Listener) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
