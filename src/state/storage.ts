import type { PersistStorage, StorageValue } from "zustand/middleware";

// Storage abstraction so the persistence backend (localStorage now) can be
// swapped for IndexedDB or a remote backend later without touching the store.
export interface StorageAdapter {
  getItem(key: string): string | null | Promise<string | null>;
  setItem(key: string, value: string): void | Promise<void>;
  removeItem(key: string): void | Promise<void>;
}

const memoryFallback = new Map<string, string>();

const localStorageAdapter: StorageAdapter = {
  getItem(key) {
    try {
      return globalThis.localStorage?.getItem(key) ?? memoryFallback.get(key) ?? null;
    } catch {
      return memoryFallback.get(key) ?? null;
    }
  },
  setItem(key, value) {
    try {
      globalThis.localStorage?.setItem(key, value);
    } catch {
      memoryFallback.set(key, value);
    }
  },
  removeItem(key) {
    try {
      globalThis.localStorage?.removeItem(key);
    } catch {
      memoryFallback.delete(key);
    }
  },
};

// Active adapter. Replace this single assignment to change persistence backend.
export const storageAdapter: StorageAdapter = localStorageAdapter;

/** Wrap the adapter as a zustand PersistStorage<T> with JSON (de)serialization. */
export function createPersistStorage<T>(): PersistStorage<T> {
  return {
    getItem: async (name) => {
      const raw = await storageAdapter.getItem(name);
      return raw ? (JSON.parse(raw) as StorageValue<T>) : null;
    },
    setItem: async (name, value) => {
      await storageAdapter.setItem(name, JSON.stringify(value));
    },
    removeItem: async (name) => {
      await storageAdapter.removeItem(name);
    },
  };
}
