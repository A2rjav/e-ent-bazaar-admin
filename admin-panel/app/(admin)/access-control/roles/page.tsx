"use client";

import { useEffect, useState } from "react";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MODULE_IDS, MODULE_LABELS } from "@/lib/rbac";
import { useUIStore } from "@/store/ui.store";
import { useRolePermissionsStore } from "@/store/role-permissions.store";
import type { ModuleId, PermissionAction } from "@/lib/types";
import { Plus, Pencil, Trash2, Shield } from "lucide-react";

const ACTIONS: { id: PermissionAction; label: string }[] = [
  { id: "view", label: "View" },
  { id: "create", label: "Create" },
  { id: "edit", label: "Edit" },
  { id: "delete", label: "Delete" },
];

function countModulesAssigned(role: { permissions: Record<string, Record<string, boolean>> }): number {
  return MODULE_IDS.filter((m) =>
    ACTIONS.some((a) => role.permissions[m]?.[a.id])
  ).length;
}

export default function RolesPage() {
  const router = useRouter();
  const currentUser = useUIStore((s) => s.currentUser);

  const roles = useRolePermissionsStore((s) => s.roles);
  const loadRoles = useRolePermissionsStore((s) => s.load);
  const updateRole = useRolePermissionsStore((s) => s.updateRole);
  const createRoleInStore = useRolePermissionsStore((s) => s.createRole);
  const deleteRoleFromStore = useRolePermissionsStore((s) => s.deleteRole);
  const setPermission = useRolePermissionsStore((s) => s.setPermission);

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

  if (currentUser && currentUser.role !== "super_admin") return null;

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
  const editingRole = editRoleId ? roles[editRoleId] : null;

  return (
    <>
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
                    <h3 className="font-semibold text-base">{role.name}</h3>
                    <span className="text-xs text-muted-foreground">
                      {moduleCount} module{moduleCount !== 1 ? "s" : ""} assigned
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

      {/* ======================== EDIT ROLE DIALOG ======================== */}
      <Dialog open={!!editRoleId} onOpenChange={(open) => !open && setEditRoleId(null)}>
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
                <h4 className="text-sm font-semibold mb-3">Permission Matrix</h4>
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
                                    editingRole.permissions[moduleId]?.[action.id] ?? false
                                  }
                                  onCheckedChange={(checked) =>
                                    setPermission(editRoleId!, moduleId, action.id, !!checked)
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
              Create a new role. You can configure its permissions after creation.
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
            <Button onClick={handleCreateRole} disabled={!newRoleName.trim()}>
              Create Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ======================== DELETE ROLE DIALOG ======================== */}
      <Dialog open={!!deleteRoleId} onOpenChange={(open) => !open && setDeleteRoleId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Role</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the role{" "}
              <strong>{deleteRoleId ? roles[deleteRoleId]?.name : ""}</strong>?
              Users assigned to this role will lose their permissions.
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
    </>
  );
}
