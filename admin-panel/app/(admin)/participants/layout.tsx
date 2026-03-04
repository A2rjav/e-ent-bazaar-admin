"use client";

import { usePathname } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";

const titleMap: Record<string, string> = {
  "/participants/manufacturers": "Manufacturers",
  "/participants/customers": "Customers",
  "/participants/coal-providers": "Coal Providers",
  "/participants/transport-providers": "Transport Providers",
  "/participants/labour-contractors": "Labour Contractors",
};

export default function ParticipantsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const title = titleMap[pathname] ?? "Participants";

  return (
    <div className="space-y-6">
      <PageHeader title={title} />
      {children}
    </div>
  );
}
