"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { api } from "@/lib/api";
import { isValidPhone, normalizePhone, formatPhone, PHONE_ERROR } from "@/lib/phone";
import { useUIStore } from "@/store/ui.store";
import { useRolePermissionsStore } from "@/store/role-permissions.store";
import type { AdminUser, RoleDefinition } from "@/lib/types";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";

function getRoleLabel(roleId: string, roles: Record<string, RoleDefinition>): string {
  return roles[roleId]?.name ?? roleId;
}

export default function UsersPage() {
  const router = useRouter();
  const currentUser = useUIStore((s) => s.currentUser);

  const roles = useRolePermissionsStore((s) => s.roles);
  const loadRoles = useRolePermissionsStore((s) => s.load);

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

  const roleEntries = Object.values(roles);
  const roleOptions = roleEntries.map((r) => ({
    value: r.id,
    label: r.name,
  }));

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Admin Users</h3>
          <p className="text-sm text-muted-foreground">
            {users.length} user{users.length !== 1 ? "s" : ""} with admin panel access
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
          <span className="ml-2 text-muted-foreground">Loading users...</span>
        </div>
      ) : error ? (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center text-sm text-destructive">
          {error}
          <Button variant="outline" size="sm" className="ml-3" onClick={fetchUsers}>
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
                <TableHead className="text-right w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                      {user.phone && (
                        <p className="text-xs text-muted-foreground">
                          {formatPhone(user.phone)}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={user.role === "super_admin" ? "default" : "secondary"}>
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
                      ? new Date(user.lastLogin).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : "Never"}
                  </TableCell>
                  <TableCell className="text-center text-sm text-muted-foreground">
                    {user.createdAt
                      ? new Date(user.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
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
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No admin users found. Click &quot;Add User&quot; to create one.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

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
                Permissions are configured in the Roles section.
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
      <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
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
      <Dialog open={!!deleteUser} onOpenChange={(open) => !open && setDeleteUser(null)}>
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
            <Button variant="destructive" onClick={handleDeleteUser} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
