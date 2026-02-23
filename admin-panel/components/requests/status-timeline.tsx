"use client";

import { CheckCircle2, Circle, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { StatusHistoryEntry, RequestStatus } from "@/lib/types";

interface StatusTimelineProps {
  history: StatusHistoryEntry[];
}

function getTimelineIcon(status: RequestStatus) {
  if (status === "Delivered") {
    return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
  }
  if (status === "Cancelled" || status === "Rejected") {
    return <XCircle className="h-5 w-5 text-red-500" />;
  }
  return <Circle className="h-5 w-5 text-primary fill-primary" />;
}

function getStatusLabel(status: RequestStatus): string {
  const labels: Record<RequestStatus, string> = {
    Pending: "Order Created (Pending)",
    Approved: "Approved by Manufacturer",
    Shipped: "Shipped",
    Delivered: "Delivered",
    Cancelled: "Cancelled",
    Rejected: "Rejected by Manufacturer",
  };
  return labels[status] || status;
}

export function StatusTimeline({ history }: StatusTimelineProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Status Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative space-y-0">
          {history.map((entry, index) => (
            <div key={entry.id} className="flex gap-4">
              {/* Line + Icon */}
              <div className="flex flex-col items-center">
                {getTimelineIcon(entry.toStatus)}
                {index < history.length - 1 && (
                  <div className="w-px flex-1 bg-border min-h-[40px]" />
                )}
              </div>

              {/* Content */}
              <div
                className={cn(
                  "pb-6",
                  index === history.length - 1 && "pb-0"
                )}
              >
                <p className="text-sm font-medium">
                  {getStatusLabel(entry.toStatus)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatDateTime(entry.createdAt)} — by {entry.changedBy}
                </p>
                {entry.reason && (
                  <p className="text-xs text-muted-foreground mt-1 italic">
                    Reason: {entry.reason}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
