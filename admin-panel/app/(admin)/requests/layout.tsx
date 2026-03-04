"use client";

import { usePathname } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";

const titleMap: Record<string, string> = {
  "/requests/orders": "Orders",
  "/requests/sample-orders": "Sample Orders",
  "/requests/coal-orders": "Coal Orders",
  "/requests/transport-orders": "Transport Orders",
};

export default function RequestsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const title = titleMap[pathname] ?? "Requests";

  return (
    <div className="space-y-6">
      <PageHeader title={title} />
      {children}
    </div>
  );
}
