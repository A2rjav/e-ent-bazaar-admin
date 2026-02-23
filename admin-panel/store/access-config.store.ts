/**
 * Access config: Super Admin configures kisko access dena hai, kis module ka, view ya edit.
 * Persisted in localStorage; keyed by userId.
 */
import { create } from "zustand";
import type { AccessConfigMap, ModuleId, AccessLevel } from "@/lib/types";

const STORAGE_KEY = "ent-bazaar-access-config";

interface AccessConfigState {
  /** userId → { dashboard: 'edit', requests: 'view', ... } */
  config: AccessConfigMap;
  /** Load from localStorage (call once on app init) */
  load: () => void;
  /** Set access for a user + module; persists to localStorage */
  setAccess: (userId: string, moduleId: ModuleId, level: AccessLevel) => void;
  /** Get config for a user (read-only) */
  getConfigForUser: (userId: string) => Record<ModuleId, AccessLevel> | null;
}

function readFromStorage(): AccessConfigMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as AccessConfigMap;
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function writeToStorage(config: AccessConfigMap) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // ignore
  }
}

export const useAccessConfigStore = create<AccessConfigState>((set, get) => ({
  config: {},

  load: () => set({ config: readFromStorage() }),

  setAccess: (userId, moduleId, level) => {
    set((state) => {
      const next = { ...state.config };
      const userConfig = { ...(next[userId] ?? {}) };
      if (level === "none") {
        delete userConfig[moduleId];
      } else {
        userConfig[moduleId] = level;
      }
      next[userId] = Object.keys(userConfig).length ? userConfig : {};
      writeToStorage(next);
      return { config: next };
    });
  },

  getConfigForUser: (userId) => {
    const userConfig = get().config[userId];
    if (!userConfig || Object.keys(userConfig).length === 0) return null;
    return userConfig as Record<ModuleId, AccessLevel>;
  },
}));
