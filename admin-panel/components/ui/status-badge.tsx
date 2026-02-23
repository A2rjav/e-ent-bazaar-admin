import { Badge } from "@/components/ui/badge";

// Status badge configs use title-case values matching DB text column values
const requestStatusConfig: Record<
  string,
  { label: string; variant: "default" | "success" | "warning" | "destructive" | "info" | "pending" | "cancelled" | "secondary" }
> = {
  Pending: { label: "Pending", variant: "pending" },
  Approved: { label: "Approved", variant: "info" },
  Shipped: { label: "Shipped", variant: "warning" },
  Delivered: { label: "Delivered", variant: "success" },
  Cancelled: { label: "Cancelled", variant: "cancelled" },
  Rejected: { label: "Rejected", variant: "destructive" },
};

interface RequestStatusBadgeProps {
  status: string;
}

export function RequestStatusBadge({ status }: RequestStatusBadgeProps) {
  const config = requestStatusConfig[status] || { label: status, variant: "secondary" as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
