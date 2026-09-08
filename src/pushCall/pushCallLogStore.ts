import type { PushCallLogEntry } from "../core/types";

const MAX_ENTRIES = 100;

type Listener = () => void;

const listeners = new Set<Listener>();
let entries: PushCallLogEntry[] = [];
let logCounter = 0;

const notify = () => {
  listeners.forEach((listener) => listener());
};

export const createPushCallLogEntryId = (): string => {
  logCounter += 1;
  return `pushcall-${logCounter}`;
};

export const pushCallLogStore = {
  getEntries: (): readonly PushCallLogEntry[] => entries,

  push: (entry: PushCallLogEntry) => {
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
