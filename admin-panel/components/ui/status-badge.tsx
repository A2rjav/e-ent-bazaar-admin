import { Badge } from "@/components/ui/badge";

const requestStatusConfig: Record<
  string,
  { label: string; variant: "default" | "success" | "warning" | "destructive" | "info" | "pending" | "cancelled" | "secondary" }
> = {
  pending: { label: "Pending", variant: "pending" },
  processing: { label: "Processing", variant: "info" },
  approved: { label: "Approved", variant: "info" },
  shipped: { label: "Shipped", variant: "warning" },
  in_transit: { label: "In Transit", variant: "warning" },
  delivered: { label: "Delivered", variant: "success" },
  completed: { label: "Completed", variant: "success" },
  confirmed: { label: "Confirmed", variant: "info" },
  cancelled: { label: "Cancelled", variant: "cancelled" },
  rejected: { label: "Rejected", variant: "destructive" },
};

interface RequestStatusBadgeProps {
  status: string;
}

export function RequestStatusBadge({ status }: RequestStatusBadgeProps) {
  const config = requestStatusConfig[status] || { label: status, variant: "secondary" as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
