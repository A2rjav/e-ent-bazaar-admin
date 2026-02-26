"use client";

import { PageHeader } from "@/components/ui/page-header";

export default function AccessControlLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Access Control"
        description="Manage admin users and configure role-based permissions"
      />
      {children}
    </div>
  );
}
