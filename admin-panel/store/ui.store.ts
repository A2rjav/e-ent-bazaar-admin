import { create } from "zustand";
import type { AdminUser } from "@/lib/types";

interface UIState {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  currentUser: AdminUser | null;
  /** For testing: view panel as this user (sidebar/access use this when set). */
  viewAsUser: AdminUser | null;
  isAuthenticated: boolean;
  /** True while initAuth is verifying the stored JWT token. */
  isAuthLoading: boolean;

  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebarCollapsed: () => void;
  login: (user: AdminUser) => void;
  logout: () => void;
  /** Validates the stored JWT by calling GET /api/admin/auth/me. */
  initAuth: () => Promise<void>;
  /** Set to test as another user; null = use real currentUser. */
  setViewAsUser: (user: AdminUser | null) => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  sidebarOpen: false,
  sidebarCollapsed: false,
  currentUser: null,
  viewAsUser: null,
  isAuthenticated: false,
  isAuthLoading: true,

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebarCollapsed: () =>
    set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  login: (user) =>
    set({
      currentUser: user,
      viewAsUser: null,
      isAuthenticated: true,
      isAuthLoading: false,
      sidebarCollapsed: false,
      sidebarOpen: false,
    }),

  logout: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("ent-bazaar-auth");
      localStorage.removeItem("ent-bazaar-demo-user");
    }
    set({
      currentUser: null,
      viewAsUser: null,
      isAuthenticated: false,
      isAuthLoading: false,
    });
  },

  setViewAsUser: (user) => set({ viewAsUser: user }),

  initAuth: async () => {
    // Prevent duplicate calls
    if (get().isAuthenticated) return;

    if (typeof window === "undefined") {
      set({ isAuthLoading: false });
      return;
    }

    const token = localStorage.getItem("ent-bazaar-auth");
    if (!token) {
      set({ isAuthLoading: false });
      return;
    }

    // Demo token — load user from localStorage (backend auth not yet built)
    if (token === "demo-token") {
      const stored = localStorage.getItem("ent-bazaar-demo-user");
      if (stored) {
        try {
          const user = JSON.parse(stored);
          set({
            currentUser: user,
            viewAsUser: null,
            isAuthenticated: true,
            isAuthLoading: false,
          });
          return;
        } catch {
          // Corrupted data — fall through to clear
        }
      }
      // Demo user data missing — clear
      localStorage.removeItem("ent-bazaar-auth");
      localStorage.removeItem("ent-bazaar-demo-user");
      set({ isAuthLoading: false });
      return;
    }

    try {
      // Real JWT — validate with backend /auth/me endpoint
      const { api } = await import("@/lib/api");
      const user = await api.getCurrentUser();
      set({
        currentUser: user,
        viewAsUser: null,
        isAuthenticated: true,
        isAuthLoading: false,
      });
    } catch {
      // Token expired or invalid — clear auth state
      localStorage.removeItem("ent-bazaar-auth");
      set({
        currentUser: null,
        viewAsUser: null,
        isAuthenticated: false,
        isAuthLoading: false,
      });
    }
  },
}));
