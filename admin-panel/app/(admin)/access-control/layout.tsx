"use client";

import { usePathname } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";

const titleMap: Record<string, string> = {
  "/access-control/users": "Users",
  "/access-control/roles": "Roles",
};

export default function AccessControlLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const title = titleMap[pathname] ?? "Access Control";

  return (
    <div className="space-y-6">
      <PageHeader title={title} />
      {children}
    </div>
  );
}
