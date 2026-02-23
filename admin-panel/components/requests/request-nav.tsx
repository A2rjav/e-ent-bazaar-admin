"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const requestRoutes = [
  { href: "/requests/sample-orders", label: "Sample Orders" },
  { href: "/requests/normal-orders", label: "Normal Orders" },
];

export function RequestNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1 overflow-x-auto rounded-lg border bg-muted/40 p-1">
      {requestRoutes.map((route) => {
        const isActive = pathname === route.href;

        return (
          <Link
            key={route.href}
            href={route.href}
            className={cn(
              "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-all",
              isActive
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
            )}
          >
            {route.label}
          </Link>
        );
      })}
    </nav>
  );
}
