"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { RequestStatusBadge } from "@/components/ui/status-badge";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Copy, Check, ArrowRight } from "lucide-react";
import type { TransportOrderListItem } from "@/lib/types";

function CopyableId({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);
  const truncated = id.length > 8 ? id.slice(-8) : id;

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="group/copy inline-flex items-center gap-1 cursor-default font-mono text-xs">
            <span className="text-muted-foreground">…</span>
            {truncated}
            <button
              onClick={handleCopy}
              className="opacity-0 group-hover/copy:opacity-100 transition-opacity p-0.5 rounded hover:bg-muted"
              aria-label="Copy ID"
            >
              {copied ? (
                <Check className="h-3 w-3 text-green-500" />
              ) : (
                <Copy className="h-3 w-3 text-muted-foreground" />
              )}
            </button>
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="font-mono text-xs">
          {id}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function PaymentBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: "success" | "pending" | "destructive" | "secondary" }> = {
    paid: { label: "Paid", variant: "success" },
    pending: { label: "Pending", variant: "pending" },
    overdue: { label: "Overdue", variant: "destructive" },
  };
  const cfg = map[status?.toLowerCase()] || { label: status, variant: "secondary" as const };
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

interface TransportOrderTableProps {
  data: TransportOrderListItem[];
}

export function TransportOrderTable({ data }: TransportOrderTableProps) {
  return (
    <Table className="w-full text-sm">
      <TableHeader>
        <TableRow className="border-b">
          <TableHead className="w-[110px] whitespace-nowrap pl-4">Order ID</TableHead>
          <TableHead className="min-w-[140px] max-w-[180px]">Manufacturer</TableHead>
          <TableHead className="min-w-[140px] max-w-[180px]">Transport Provider</TableHead>
          <TableHead className="w-[120px]">Type</TableHead>
          <TableHead className="min-w-[200px]">Route</TableHead>
          <TableHead className="w-[120px] text-right whitespace-nowrap">Total Cost</TableHead>
          <TableHead className="w-[110px] text-center whitespace-nowrap">Payment</TableHead>
          <TableHead className="w-[110px] text-center whitespace-nowrap">Status</TableHead>
          <TableHead className="w-[110px] text-right whitespace-nowrap pr-4">Date</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((order) => (
          <TableRow key={order.id} className="hover:bg-muted/40 transition-colors">
            <TableCell className="pl-4 py-3 font-mono">
              <CopyableId id={order.id} />
            </TableCell>
            <TableCell className="py-3 max-w-[180px]">
              <span className="block truncate font-medium" title={order.manufacturerName}>
                {order.manufacturerName || order.manufacturerId}
              </span>
            </TableCell>
            <TableCell className="py-3 max-w-[180px]">
              <span className="block truncate text-muted-foreground" title={order.transportProviderName}>
                {order.transportProviderName || order.transportProviderId}
              </span>
            </TableCell>
            <TableCell className="py-3">
              <div>
                <span className="block text-sm">{order.transportType}</span>
                {order.vehicleType && (
                  <span className="block text-xs text-muted-foreground">{order.vehicleType}</span>
                )}
              </div>
            </TableCell>
            <TableCell className="py-3">
              <div className="flex items-center gap-1 text-xs text-muted-foreground min-w-0">
                <span className="truncate max-w-[80px]" title={order.pickupLocation}>
                  {order.pickupLocation}
                </span>
                <ArrowRight className="h-3 w-3 shrink-0" />
                <span className="truncate max-w-[80px]" title={order.deliveryLocation}>
                  {order.deliveryLocation}
                </span>
              </div>
            </TableCell>
            <TableCell className="py-3 text-right tabular-nums whitespace-nowrap font-medium">
              {formatCurrency(order.totalCost)}
            </TableCell>
            <TableCell className="py-3 text-center">
              <PaymentBadge status={order.paymentStatus} />
            </TableCell>
            <TableCell className="py-3 text-center">
              <RequestStatusBadge status={order.orderStatus} />
            </TableCell>
            <TableCell className="py-3 text-right text-muted-foreground whitespace-nowrap pr-4">
              {formatDate(order.createdAt)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
