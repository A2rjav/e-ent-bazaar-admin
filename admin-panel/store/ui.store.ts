import { create } from "zustand";
import type { AdminUser } from "@/lib/types";
import { mockAdminUser } from "@/lib/mock-data";

interface UIState {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  currentUser: AdminUser | null;
  /** For testing: view panel as this user (sidebar/access use this when set). */
  viewAsUser: AdminUser | null;
  isAuthenticated: boolean;

  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebarCollapsed: () => void;
  login: (user: AdminUser) => void;
  logout: () => void;
  initAuth: () => void;
  /** Set to test as another user; null = use real currentUser. */
  setViewAsUser: (user: AdminUser | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: false,
  sidebarCollapsed: false,
  currentUser: null,
  viewAsUser: null,
  isAuthenticated: false,

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebarCollapsed: () =>
    set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  login: (user) =>
    set({
      currentUser: user,
      viewAsUser: null,
      isAuthenticated: true,
      sidebarCollapsed: false,
      sidebarOpen: false,
    }),

  logout: () =>
    set({
      currentUser: null,
      viewAsUser: null,
      isAuthenticated: false,
    }),

  setViewAsUser: (user) => set({ viewAsUser: user }),

  initAuth: () => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("ent-bazaar-auth");
      if (stored) {
        set({
          currentUser: mockAdminUser,
          viewAsUser: null,
          isAuthenticated: true,
        });
      }
    }
  },
}));
