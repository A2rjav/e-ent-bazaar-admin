"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileTopBar } from "@/components/layout/mobile-top-bar";
import { useUIStore } from "@/store/ui.store";
import { useAccessConfigStore } from "@/store/access-config.store";
import { useRolePermissionsStore } from "@/store/role-permissions.store";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, isAuthLoading, initAuth } = useUIStore();
  const loadAccessConfig = useAccessConfigStore((s) => s.load);
  const loadRolePermissions = useRolePermissionsStore((s) => s.load);

  // Validate JWT token on mount
  useEffect(() => {
    initAuth();
    loadAccessConfig();
    loadRolePermissions();
  }, [initAuth, loadAccessConfig, loadRolePermissions]);

  // Redirect to login when auth resolves as unauthenticated
  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthLoading, isAuthenticated, router]);

  // Show loading spinner while validating JWT
  if (isAuthLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Verifying session…</p>
        </div>
      </div>
    );
  }

  // Don't render admin content if not authenticated
  if (!isAuthenticated) return null;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden transition-all duration-300">
        <MobileTopBar />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
