"use client";

import { PageHeader } from "@/components/ui/page-header";

export default function ParticipantsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Participants"
        description="Manage platform participants across all categories"
      />
      {children}
    </div>
  );
}
