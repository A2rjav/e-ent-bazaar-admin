"use client";

import { useState } from "react";
import Link from "next/link";
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
import { RequestStatusBadge } from "@/components/ui/status-badge";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Copy, Check } from "lucide-react";
import type { OrderListItem, OrderType } from "@/lib/types";

function CopyableId({ id, requestType }: { id: string; requestType?: string }) {
  const [copied, setCopied] = useState(false);
  const truncated = id.length > 8 ? id.slice(-8) : id;
  const typeParam = requestType ? `?type=${requestType}` : '';

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
          <span className="inline-flex items-center gap-1.5">
            <Link
              href={`/requests/${id}${typeParam}`}
              className="font-medium text-primary hover:underline"
            >
              {truncated}
            </Link>
            <button
              onClick={handleCopy}
              className="opacity-0 group-hover/id:opacity-100 transition-opacity p-0.5 rounded hover:bg-muted"
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
        <TooltipContent>
          <p className="font-mono text-xs">{id}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface RequestTableProps {
  data: OrderListItem[];
  orderType: OrderType;
}

export function RequestTable({ data, orderType }: RequestTableProps) {
  return (
    <Table className="w-full text-sm">
      <TableHeader>
        <TableRow className="border-b">
          {/* ID — narrow, left */}
          <TableHead className="w-[110px] whitespace-nowrap pl-4">Order ID</TableHead>
          {/* Text columns — left, constrained width */}
          <TableHead className="min-w-[140px] max-w-[180px]">Customer</TableHead>
          <TableHead className="min-w-[140px] max-w-[180px]">Manufacturer</TableHead>
          <TableHead className="min-w-[140px] max-w-[200px]">Product</TableHead>
          {/* Numeric — right */}
          <TableHead className="w-[90px] text-right whitespace-nowrap">Qty</TableHead>
          <TableHead className="w-[100px] text-right whitespace-nowrap">Price</TableHead>
          {orderType === "NORMAL" && (
            <TableHead className="w-[120px] text-right whitespace-nowrap">Total</TableHead>
          )}
          {/* Status — center */}
          <TableHead className="w-[110px] text-center whitespace-nowrap">Status</TableHead>
          {/* Date — right, compact */}
          <TableHead className="w-[110px] text-right whitespace-nowrap pr-4">Created</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((order) => (
          <TableRow key={order.id} className="group/id hover:bg-muted/40 transition-colors">
            {/* ID */}
            <TableCell className="pl-4 py-3 font-mono">
              <CopyableId id={order.id} requestType={order.requestType || (orderType === 'SAMPLE' ? 'sample_order' : 'order')} />
            </TableCell>
            {/* Customer */}
            <TableCell className="py-3 max-w-[180px]">
              <span
                className="block truncate font-medium"
                title={order.customerName || order.customerId}
              >
                {order.customerName || order.customerId}
              </span>
            </TableCell>
            {/* Manufacturer */}
            <TableCell className="py-3 max-w-[180px]">
              <span
                className="block truncate text-muted-foreground"
                title={order.manufacturerName || order.manufacturerId}
              >
                {order.manufacturerName || order.manufacturerId}
              </span>
            </TableCell>
            {/* Product */}
            <TableCell className="py-3 max-w-[200px]">
              <span
                className="block truncate text-muted-foreground"
                title={order.productName || order.productId}
              >
                {order.productName || order.productId}
              </span>
            </TableCell>
            {/* Quantity — right, tabular */}
            <TableCell className="py-3 text-right tabular-nums whitespace-nowrap">
              {order.quantity.toLocaleString("en-IN")}
            </TableCell>
            {/* Price — right, tabular */}
            <TableCell className="py-3 text-right tabular-nums whitespace-nowrap text-muted-foreground">
              {order.price != null ? formatCurrency(order.price) : <span className="text-muted-foreground/40">—</span>}
            </TableCell>
            {/* Total — right, tabular (normal orders only) */}
            {orderType === "NORMAL" && (
              <TableCell className="py-3 text-right tabular-nums whitespace-nowrap font-medium">
                {order.totalAmount != null ? formatCurrency(order.totalAmount) : <span className="text-muted-foreground/40">—</span>}
              </TableCell>
            )}
            {/* Status — center */}
            <TableCell className="py-3 text-center">
              <RequestStatusBadge status={order.status} />
            </TableCell>
            {/* Date — right */}
            <TableCell className="py-3 text-right text-muted-foreground whitespace-nowrap pr-4">
              {formatDate(order.createdAt)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
