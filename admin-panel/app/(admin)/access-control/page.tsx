"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { PhoneInput } from "@/components/ui/phone-input";
import { api } from "@/lib/api";
import { MODULE_IDS, MODULE_LABELS } from "@/lib/rbac";
import { isValidPhone, normalizePhone, formatPhone, PHONE_ERROR } from "@/lib/phone";
import { useUIStore } from "@/store/ui.store";
import { useRolePermissionsStore } from "@/store/role-permissions.store";
import type {
  AdminUser,
  ModuleId,
  PermissionAction,
  RoleDefinition,
} from "@/lib/types";
import {
  Plus,
  Pencil,
  Trash2,
  Users,
  ShieldCheck,
  Loader2,
  Shield,
} from "lucide-react";

const ACTIONS: { id: PermissionAction; label: string }[] = [
  { id: "view", label: "View" },
  { id: "create", label: "Create" },
  { id: "edit", label: "Edit" },
  { id: "delete", label: "Delete" },
];

function getRoleLabel(roleId: string, roles: Record<string, RoleDefinition>): string {
  return roles[roleId]?.name ?? roleId;
}

function countModulesAssigned(role: RoleDefinition): number {
  return MODULE_IDS.filter((m) =>
    ACTIONS.some((a) => role.permissions[m]?.[a.id])
  ).length;
}

export default function AccessControlPage() {
  const router = useRouter();
  const currentUser = useUIStore((s) => s.currentUser);

  const roles = useRolePermissionsStore((s) => s.roles);
  const loadRoles = useRolePermissionsStore((s) => s.load);
  const updateRole = useRolePermissionsStore((s) => s.updateRole);
  const createRoleInStore = useRolePermissionsStore((s) => s.createRole);
  const deleteRoleFromStore = useRolePermissionsStore((s) => s.deleteRole);
  const setPermission = useRolePermissionsStore((s) => s.setPermission);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // User dialogs
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [deleteUser, setDeleteUser] = useState<AdminUser | null>(null);
  const [saving, setSaving] = useState(false);

  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [formRole, setFormRole] = useState("admin");
  const [formActive, setFormActive] = useState(true);

  // Role dialogs
  const [editRoleId, setEditRoleId] = useState<string | null>(null);
  const [createRoleOpen, setCreateRoleOpen] = useState(false);
  const [deleteRoleId, setDeleteRoleId] = useState<string | null>(null);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDesc, setNewRoleDesc] = useState("");
  const [editRoleName, setEditRoleName] = useState("");
  const [editRoleDesc, setEditRoleDesc] = useState("");

  useEffect(() => {
    if (currentUser && currentUser.role !== "super_admin") {
      router.replace("/dashboard");
    }
  }, [currentUser, router]);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getAdminUsers();
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  if (currentUser && currentUser.role !== "super_admin") return null;

  // ---- User form helpers ----
  const resetUserForm = () => {
    setFormName("");
    setFormEmail("");
    setFormPhone("");
    setPhoneError("");
    setFormRole("admin");
    setFormActive(true);
  };

  const openAddUser = () => {
    resetUserForm();
    setAddUserOpen(true);
  };

  const openEditUser = (user: AdminUser) => {
    setFormName(user.name);
    setFormEmail(user.email);
    setFormPhone(user.phone ?? "");
    setFormRole(user.role);
    setFormActive(user.isActive);
    setEditUser(user);
  };

  const handleAddUser = async () => {
    if (!formName.trim() || !formEmail.trim()) return;
    if (formPhone.trim() && !isValidPhone(formPhone)) {
      setPhoneError(PHONE_ERROR);
      return;
    }
    setPhoneError("");
    setSaving(true);
    try {
      await api.createAdminUser({
        name: formName.trim(),
        email: formEmail.trim(),
        phone: formPhone.trim() ? normalizePhone(formPhone) : undefined,
        role: formRole,
      });
      setAddUserOpen(false);
      resetUserForm();
      fetchUsers();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to add user");
    } finally {
      setSaving(false);
    }
  };

  const handleEditUser = async () => {
    if (!editUser || !formName.trim() || !formEmail.trim()) return;
    if (formPhone.trim() && !isValidPhone(formPhone)) {
      setPhoneError(PHONE_ERROR);
      return;
    }
    setPhoneError("");
    setSaving(true);
    try {
      await api.updateAdminUser(editUser.id, {
        name: formName.trim(),
        email: formEmail.trim(),
        phone: formPhone.trim() ? normalizePhone(formPhone) : undefined,
        role: formRole,
        is_active: formActive,
      });
      setEditUser(null);
      resetUserForm();
      fetchUsers();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update user");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteUser) return;
    setSaving(true);
    try {
      await api.deleteAdminUser(deleteUser.id);
      setDeleteUser(null);
      fetchUsers();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete user");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (user: AdminUser) => {
    try {
      await api.updateAdminUser(user.id, { is_active: !user.isActive });
      fetchUsers();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update user");
    }
  };

  // ---- Role helpers ----
  const openEditRole = (roleId: string) => {
    const role = roles[roleId];
    if (!role) return;
    setEditRoleName(role.name);
    setEditRoleDesc(role.description);
    setEditRoleId(roleId);
  };

  const handleSaveRole = () => {
    if (!editRoleId) return;
    const role = roles[editRoleId];
    if (!role) return;
    updateRole(editRoleId, {
      ...role,
      name: editRoleName.trim() || role.name,
      description: editRoleDesc.trim() || role.description,
    });
    setEditRoleId(null);
  };

  const handleCreateRole = () => {
    if (!newRoleName.trim()) return;
    const id = newRoleName.trim().toLowerCase().replace(/\s+/g, "_");
    if (roles[id]) {
      alert("A role with this name already exists");
      return;
    }
    const emptyPerms = {} as Record<ModuleId, Record<PermissionAction, boolean>>;
    for (const m of MODULE_IDS) {
      emptyPerms[m] = { view: false, create: false, edit: false, delete: false };
    }
    createRoleInStore({
      id,
      name: newRoleName.trim(),
      description: newRoleDesc.trim() || "Custom role",
      permissions: emptyPerms,
    });
    setCreateRoleOpen(false);
    setNewRoleName("");
    setNewRoleDesc("");
  };

  const handleDeleteRole = () => {
    if (!deleteRoleId) return;
    deleteRoleFromStore(deleteRoleId);
    setDeleteRoleId(null);
  };

  const roleEntries = Object.values(roles);
  const roleOptions = roleEntries.map((r) => ({
    value: r.id,
    label: r.name,
  }));

  const editingRole = editRoleId ? roles[editRoleId] : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Access Control"
        description="Manage admin users and configure role-based permissions. Only Super Admin can access this page."
      />

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="roles" className="gap-2">
            <ShieldCheck className="h-4 w-4" />
            Roles
          </TabsTrigger>
        </TabsList>

        {/* ======================== USERS TAB ======================== */}
        <TabsContent value="users" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Admin Users</h3>
              <p className="text-sm text-muted-foreground">
                {users.length} user{users.length !== 1 ? "s" : ""} with admin
                panel access
              </p>
            </div>
            <Button onClick={openAddUser} className="gap-2">
              <Plus className="h-4 w-4" />
              Add User
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">
                Loading users...
              </span>
            </div>
          ) : error ? (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center text-sm text-destructive">
              {error}
              <Button
                variant="outline"
                size="sm"
                className="ml-3"
                onClick={fetchUsers}
              >
                Retry
              </Button>
            </div>
          ) : (
            <div className="rounded-lg border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[250px]">User</TableHead>
                    <TableHead className="text-center">Role</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center">Last Login</TableHead>
                    <TableHead className="text-center">Created</TableHead>
                    <TableHead className="text-right w-[120px]">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {user.email}
                          </p>
                          {user.phone && (
                            <p className="text-xs text-muted-foreground">
                              {formatPhone(user.phone)}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={
                            user.role === "super_admin"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {getRoleLabel(user.role, roles)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={user.isActive ? "default" : "destructive"}
                          className="cursor-pointer"
                          onClick={() => handleToggleActive(user)}
                        >
                          {user.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center text-sm text-muted-foreground">
                        {user.lastLogin
                          ? new Date(user.lastLogin).toLocaleDateString(
                              "en-IN",
                              {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              }
                            )
                          : "Never"}
                      </TableCell>
                      <TableCell className="text-center text-sm text-muted-foreground">
                        {user.createdAt
                          ? new Date(user.createdAt).toLocaleDateString(
                              "en-IN",
                              {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              }
                            )
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditUser(user)}
                            title="Edit user"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteUser(user)}
                            title="Delete user"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {users.length === 0 && !loading && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center py-8 text-muted-foreground"
                      >
                        No admin users found. Click &quot;Add User&quot; to
                        create one.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* ======================== ROLES TAB ======================== */}
        <TabsContent value="roles" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Role Management</h3>
              <p className="text-sm text-muted-foreground">
                Configure roles and their module permissions
              </p>
            </div>
            <Button
              onClick={() => {
                setNewRoleName("");
                setNewRoleDesc("");
                setCreateRoleOpen(true);
              }}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Create Role
            </Button>
          </div>

          <div className="grid gap-4">
            {roleEntries.map((role) => {
              const moduleCount = countModulesAssigned(role);
              return (
                <div
                  key={role.id}
                  className="group relative rounded-xl border bg-card p-5 transition-shadow hover:shadow-md"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Shield className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-base">
                          {role.name}
                        </h3>
                        <span className="text-xs text-muted-foreground">
                          {moduleCount} module{moduleCount !== 1 ? "s" : ""}{" "}
                          assigned
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {role.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditRole(role.id)}
                        title="Edit role"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {role.id !== "super_admin" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteRoleId(role.id)}
                          title="Delete role"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* ======================== ADD USER DIALOG ======================== */}
      <Dialog open={addUserOpen} onOpenChange={setAddUserOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Admin User</DialogTitle>
            <DialogDescription>
              Create a new admin user with access to the admin panel. Their
              permissions are determined by the role you assign.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Name <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="Full name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Email <span className="text-destructive">*</span>
              </label>
              <Input
                type="email"
                placeholder="email@example.com"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Phone</label>
              <PhoneInput
                value={formPhone}
                onChange={(v) => {
                  setFormPhone(v);
                  if (phoneError) setPhoneError("");
                }}
                error={phoneError}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Role</label>
              <Select value={formRole} onValueChange={setFormRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Permissions are configured in the Roles tab.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddUserOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddUser}
              disabled={saving || !formName.trim() || !formEmail.trim()}
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ======================== EDIT USER DIALOG ======================== */}
      <Dialog
        open={!!editUser}
        onOpenChange={(open) => !open && setEditUser(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Admin User</DialogTitle>
            <DialogDescription>
              Update user details and role assignment.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Name <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="Full name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Email <span className="text-destructive">*</span>
              </label>
              <Input
                type="email"
                placeholder="email@example.com"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Phone</label>
              <PhoneInput
                value={formPhone}
                onChange={(v) => {
                  setFormPhone(v);
                  if (phoneError) setPhoneError("");
                }}
                error={phoneError}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Role</label>
              <Select value={formRole} onValueChange={setFormRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select
                value={formActive ? "active" : "inactive"}
                onValueChange={(v) => setFormActive(v === "active")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Inactive users cannot log in to the admin panel.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleEditUser}
              disabled={saving || !formName.trim() || !formEmail.trim()}
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ======================== DELETE USER DIALOG ======================== */}
      <Dialog
        open={!!deleteUser}
        onOpenChange={(open) => !open && setDeleteUser(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Admin User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <strong>{deleteUser?.name}</strong> ({deleteUser?.email})? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteUser(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteUser}
              disabled={saving}
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ======================== EDIT ROLE DIALOG ======================== */}
      <Dialog
        open={!!editRoleId}
        onOpenChange={(open) => !open && setEditRoleId(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Role</DialogTitle>
            <DialogDescription>
              Configure permissions for this role across all modules.
            </DialogDescription>
          </DialogHeader>
          {editingRole && (
            <div className="space-y-5 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Role Name</label>
                  <Input
                    placeholder="e.g. Content Manager"
                    value={editRoleName}
                    onChange={(e) => setEditRoleName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <Input
                    placeholder="Brief description"
                    value={editRoleDesc}
                    onChange={(e) => setEditRoleDesc(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-3">
                  Permission Matrix
                </h4>
                <div className="rounded-lg border bg-muted/30 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="w-[180px] font-semibold text-primary">
                          Module
                        </TableHead>
                        {ACTIONS.map((a) => (
                          <TableHead
                            key={a.id}
                            className="text-center font-semibold text-primary"
                          >
                            {a.label}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {MODULE_IDS.map((moduleId) => (
                        <TableRow key={moduleId}>
                          <TableCell className="font-medium">
                            {MODULE_LABELS[moduleId]}
                          </TableCell>
                          {ACTIONS.map((action) => (
                            <TableCell key={action.id} className="text-center">
                              <div className="flex justify-center">
                                <Checkbox
                                  checked={
                                    editingRole.permissions[moduleId]?.[
                                      action.id
                                    ] ?? false
                                  }
                                  onCheckedChange={(checked) =>
                                    setPermission(
                                      editRoleId!,
                                      moduleId,
                                      action.id,
                                      !!checked
                                    )
                                  }
                                />
                              </div>
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRoleId(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveRole}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ======================== CREATE ROLE DIALOG ======================== */}
      <Dialog open={createRoleOpen} onOpenChange={setCreateRoleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Role</DialogTitle>
            <DialogDescription>
              Create a new role. You can configure its permissions after
              creation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Role Name <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="e.g. Content Manager"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Input
                placeholder="Brief description"
                value={newRoleDesc}
                onChange={(e) => setNewRoleDesc(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateRoleOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateRole}
              disabled={!newRoleName.trim()}
            >
              Create Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ======================== DELETE ROLE DIALOG ======================== */}
      <Dialog
        open={!!deleteRoleId}
        onOpenChange={(open) => !open && setDeleteRoleId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Role</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the role{" "}
              <strong>
                {deleteRoleId ? roles[deleteRoleId]?.name : ""}
              </strong>
              ? Users assigned to this role will lose their permissions.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteRoleId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteRole}>
              Delete Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
