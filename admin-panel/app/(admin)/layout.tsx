"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
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
  const { isAuthenticated, initAuth } = useUIStore();
  const loadAccessConfig = useAccessConfigStore((s) => s.load);
  const loadRolePermissions = useRolePermissionsStore((s) => s.load);

  useEffect(() => {
    initAuth();
    loadAccessConfig();
    loadRolePermissions();
  }, [initAuth, loadAccessConfig, loadRolePermissions]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("ent-bazaar-auth");
      if (!token) {
        router.push("/login");
      }
    }
  }, [isAuthenticated, router]);

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
