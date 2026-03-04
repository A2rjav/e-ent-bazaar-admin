"use client";

import { PageHeader } from "@/components/ui/page-header";

export default function ReviewsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <PageHeader title="Reviews" />
      {children}
    </div>
  );
}
