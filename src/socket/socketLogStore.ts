import type { SocketLogEntry } from "../core/types";

const MAX_ENTRIES = 100;

type Listener = () => void;

const listeners = new Set<Listener>();
let entries: SocketLogEntry[] = [];
let logCounter = 0;

const notify = () => {
  listeners.forEach((listener) => listener());
};

export const createSocketLogEntryId = (): string => {
  logCounter += 1;
  return `socket-${logCounter}`;
};

export const socketLogStore = {
  getEntries: (): readonly SocketLogEntry[] => entries,

  push: (entry: SocketLogEntry) => {
    entries = [...entries, entry];
    if (entries.length > MAX_ENTRIES) {
      entries = entries.slice(entries.length - MAX_ENTRIES);
    }
    notify();
  },

  clear: () => {
    entries = [];
    notify();
  },

  subscribe: (listener: Listener) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
