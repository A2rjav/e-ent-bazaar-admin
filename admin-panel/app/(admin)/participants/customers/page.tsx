"use client";

import { Construction } from "lucide-react";

export default function CustomersPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] px-4">
      <div className="relative mb-6">
        <div className="relative flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
          <Construction className="w-8 h-8 text-primary" />
        </div>
      </div>
      <h2 className="text-xl font-semibold tracking-tight text-center">
        Customers Module Coming Soon
      </h2>
      <p className="mt-2 text-sm text-muted-foreground text-center max-w-md">
        The customers (end-customer) listing is not yet available in the current
        backend API. Contact the backend team to add support.
      </p>
    </div>
  );
}
