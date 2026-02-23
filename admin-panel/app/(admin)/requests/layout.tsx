"use client";

import { PageHeader } from "@/components/ui/page-header";

export default function RequestsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Requests"
        description="Manage and monitor all platform requests"
      />
      {children}
    </div>
  );
}
