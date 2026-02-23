import { create } from "zustand";
import type {
  ModuleId,
  PermissionAction,
  RoleDefinition,
  RolePermissionsMap,
} from "@/lib/types";

const STORAGE_KEY = "ent-bazaar-role-permissions";

const ALL_MODULES: ModuleId[] = [
  "dashboard",
  "requests",
  "participants",
  "reviews",
  "cms",
];

function allTrue(): Record<ModuleId, Record<PermissionAction, boolean>> {
  const result = {} as Record<ModuleId, Record<PermissionAction, boolean>>;
  for (const m of ALL_MODULES) {
    result[m] = { view: true, create: true, edit: true, delete: true };
  }
  return result;
}

function allFalse(): Record<ModuleId, Record<PermissionAction, boolean>> {
  const result = {} as Record<ModuleId, Record<PermissionAction, boolean>>;
  for (const m of ALL_MODULES) {
    result[m] = { view: false, create: false, edit: false, delete: false };
  }
  return result;
}

const DEFAULT_ROLES: RolePermissionsMap = {
  super_admin: {
    id: "super_admin",
    name: "Super Admin",
    description: "Full access to all modules",
    permissions: allTrue(),
  },
  admin: {
    id: "admin",
    name: "Admin",
    description: "Access based on assigned modules",
    permissions: (() => {
      const p = allTrue();
      p.cms = { view: false, create: false, edit: false, delete: false };
      return p;
    })(),
  },
  operation_manager: {
    id: "operation_manager",
    name: "Ops Manager",
    description: "Limited module access",
    permissions: (() => {
      const p = allTrue();
      p.cms = { view: false, create: false, edit: false, delete: false };
      return p;
    })(),
  },
  content_team: {
    id: "content_team",
    name: "Content Team",
    description: "View-only access",
    permissions: (() => {
      const p = allFalse();
      p.reviews = { view: true, create: false, edit: false, delete: false };
      p.cms = { view: true, create: true, edit: true, delete: true };
      return p;
    })(),
  },
};

interface RolePermissionsState {
  roles: RolePermissionsMap;
  load: () => void;
  updateRole: (roleId: string, role: RoleDefinition) => void;
  createRole: (role: RoleDefinition) => void;
  deleteRole: (roleId: string) => void;
  setPermission: (
    roleId: string,
    moduleId: ModuleId,
    action: PermissionAction,
    value: boolean
  ) => void;
}

function readFromStorage(): RolePermissionsMap | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as RolePermissionsMap;
  } catch {
    return null;
  }
}

function writeToStorage(roles: RolePermissionsMap) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(roles));
  } catch {
    /* ignore */
  }
}

export const useRolePermissionsStore = create<RolePermissionsState>(
  (set, get) => ({
    roles: DEFAULT_ROLES,

    load: () => {
      const stored = readFromStorage();
      if (stored && Object.keys(stored).length > 0) {
        const merged = { ...DEFAULT_ROLES };
        for (const [key, value] of Object.entries(stored)) {
          merged[key] = value;
        }
        set({ roles: merged });
      }
    },

    updateRole: (roleId, role) => {
      const next = { ...get().roles, [roleId]: role };
      writeToStorage(next);
      set({ roles: next });
    },

    createRole: (role) => {
      const next = { ...get().roles, [role.id]: role };
      writeToStorage(next);
      set({ roles: next });
    },

    deleteRole: (roleId) => {
      if (roleId === "super_admin") return;
      const next = { ...get().roles };
      delete next[roleId];
      writeToStorage(next);
      set({ roles: next });
    },

    setPermission: (roleId, moduleId, action, value) => {
      const roles = get().roles;
      const role = roles[roleId];
      if (!role) return;

      const updatedRole: RoleDefinition = {
        ...role,
        permissions: {
          ...role.permissions,
          [moduleId]: {
            ...role.permissions[moduleId],
            [action]: value,
          },
        },
      };

      const next = { ...roles, [roleId]: updatedRole };
      writeToStorage(next);
      set({ roles: next });
    },
  })
);
