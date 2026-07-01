import type { HttpLogEntry } from "../core/types";

const MAX_ENTRIES = 100;

type Listener = () => void;

const listeners = new Set<Listener>();
let entries: HttpLogEntry[] = [];

const notify = () => {
  listeners.forEach((listener) => listener());
};

export const httpLogStore = {
  getEntries: (): readonly HttpLogEntry[] => entries,

  upsert: (entry: HttpLogEntry) => {
    const index = entries.findIndex((item) => item.id === entry.id);
    if (index >= 0) {
      entries = [...entries];
      entries[index] = { ...entries[index], ...entry };
    } else {
      entries = [...entries, entry];
      if (entries.length > MAX_ENTRIES) {
        entries = entries.slice(entries.length - MAX_ENTRIES);
      }
    }
    notify();
  },

  patch: (id: string, patch: Partial<HttpLogEntry>) => {
    const index = entries.findIndex((item) => item.id === id);
    if (index < 0) return;

    entries = [...entries];
    entries[index] = { ...entries[index], ...patch, phase: "done" };
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
