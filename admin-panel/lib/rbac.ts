/**
 * RBAC helpers for the admin panel.
 * Roles define permissions via the Permission Matrix (Module x View/Create/Edit/Delete).
 * Super Admin always has full access.
 */

import type { AdminRole } from "@/lib/types";
import type { AccessConfigMap, ModuleId, AccessLevel } from "@/lib/types";

/** Nav section → module id (for sidebar and access config). */
export const ROLE_ACCESS = {
  dashboard: ["super_admin", "admin", "operation_manager"] as AdminRole[],
  requests: ["super_admin", "admin", "operation_manager"] as AdminRole[],
  participants: ["super_admin", "admin", "operation_manager"] as AdminRole[],
  reviews: ["super_admin", "admin", "operation_manager", "content_team"] as AdminRole[],
  cms: ["super_admin", "content_team"] as AdminRole[],
  admin: ["super_admin"] as AdminRole[],
} as const;

/** Default access per role when no config is set (Super Admin configures to override). */
export const DEFAULT_ACCESS_BY_ROLE: Record<AdminRole, Record<ModuleId, AccessLevel>> = {
  super_admin: {
    dashboard: "edit",
    requests: "edit",
    participants: "edit",
    reviews: "edit",
    cms: "edit",
  },
  admin: {
    dashboard: "edit",
    requests: "edit",
    participants: "edit",
    reviews: "edit",
    cms: "none",
  },
  operation_manager: {
    dashboard: "edit",
    requests: "edit",
    participants: "edit",
    reviews: "edit",
    cms: "none",
  },
  content_team: {
    dashboard: "none",
    requests: "none",
    participants: "none",
    reviews: "view",
    cms: "edit",
  },
};

/** Permission keys matching backend (for future button-level gating). */
export type PermissionKey =
  | "requests.read"
  | "participants.read"
  | "participants.disable"
  | "orders.read"
  | "dashboard.read"
  | "ratings.delete"
  | "cms.read"
  | "cms.write"
  | "cms.delete"
  | "admin.users"
  | "admin.audit";

const PERMISSION_BY_ROLE: Record<AdminRole, PermissionKey[] | "*"> = {
  super_admin: "*",
  admin: [
    "requests.read",
    "participants.read",
    "participants.disable",
    "orders.read",
    "dashboard.read",
    "ratings.delete",
  ],
  operation_manager: [
    "requests.read",
    "participants.read",
    "participants.disable",
    "orders.read",
    "dashboard.read",
    "ratings.delete",
  ],
  content_team: ["cms.read", "cms.write", "cms.delete"],
};

/** Section names used in nav (same as ROLE_ACCESS keys). */
export type NavSection = keyof typeof ROLE_ACCESS;

/**
 * Effective access for a user: from config if set, else role default.
 * Use this when you have access config from store (sidebar, buttons).
 */
export function getModuleAccess(
  userId: string | undefined | null,
  role: string | undefined | null,
  configMap: AccessConfigMap,
  moduleId: ModuleId
): AccessLevel {
  if (!role) return "none";
  const roleDefault = DEFAULT_ACCESS_BY_ROLE[role as AdminRole]?.[moduleId] ?? "none";
  if (!userId) return roleDefault;
  const userConfig = configMap[userId];
  if (!userConfig || userConfig[moduleId] === undefined) return roleDefault;
  return userConfig[moduleId] as AccessLevel;
}

/**
 * Get module access using the role permissions store.
 * Checks role definition's permission matrix for the "view" action.
 */
export function getModuleAccessFromRoles(
  role: string | undefined | null,
  moduleId: ModuleId,
  rolePermissions: Record<string, { permissions: Record<string, Record<string, boolean>> }>
): AccessLevel {
  if (!role) return "none";
  if (role === "super_admin") return "edit";

  const roleDef = rolePermissions[role];
  if (!roleDef) {
    return DEFAULT_ACCESS_BY_ROLE[role as AdminRole]?.[moduleId] ?? "none";
  }

  const modulePerms = roleDef.permissions[moduleId];
  if (!modulePerms) return "none";

  if (modulePerms.edit || modulePerms.create || modulePerms.delete) return "edit";
  if (modulePerms.view) return "view";
  return "none";
}

/**
 * Can user see this section in nav? (view or edit = yes)
 */
export function canAccessSection(
  role: string | undefined | null,
  section: NavSection,
  options?: { userId?: string | null; configMap?: AccessConfigMap }
): boolean {
  if (!role) return false;
  const moduleId = section as ModuleId;
  if (options?.userId !== undefined && options?.configMap) {
    const level = getModuleAccess(options.userId, role, options.configMap, moduleId);
    return level === "view" || level === "edit";
  }
  const allowed = ROLE_ACCESS[section];
  return allowed.includes(role as AdminRole);
}

/**
 * Can user edit this module? (reassign, disable, delete, etc.)
 * Use config if available, else role default.
 */
export function canEditModule(
  userId: string | undefined | null,
  role: string | undefined | null,
  configMap: AccessConfigMap,
  moduleId: ModuleId
): boolean {
  return getModuleAccess(userId, role, configMap, moduleId) === "edit";
}

/**
 * Returns true if the given role has the permission (for gating buttons/actions).
 */
export function can(role: string | undefined | null, permission: PermissionKey): boolean {
  if (!role) return false;
  const perms = PERMISSION_BY_ROLE[role as AdminRole];
  if (perms === "*") return true;
  return Array.isArray(perms) && perms.includes(permission);
}

/** All module ids for Access Control page columns. */
export const MODULE_IDS: ModuleId[] = [
  "dashboard",
  "requests",
  "participants",
  "reviews",
  "cms",
];

/** Human-readable labels for modules. */
export const MODULE_LABELS: Record<ModuleId, string> = {
  dashboard: "Dashboard",
  requests: "Requests",
  participants: "Participants",
  reviews: "Reviews",
  cms: "CMS",
};
