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

function CopyableId({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);
  const truncated = id.length > 8 ? `…${id.slice(-8)}` : id;

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
              href={`/requests/${id}`}
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
    <Table className="table-auto w-full">
      <TableHeader>
        <TableRow>
          <TableHead className="whitespace-nowrap w-[1%]">ID</TableHead>
          <TableHead>Customer</TableHead>
          <TableHead>Manufacturer</TableHead>
          <TableHead>Product</TableHead>
          <TableHead className="text-right whitespace-nowrap w-[1%]">Quantity</TableHead>
          <TableHead className="text-right whitespace-nowrap w-[1%]">Price</TableHead>
          {orderType === "NORMAL" && (
            <TableHead className="text-right whitespace-nowrap w-[1%]">Total Amount</TableHead>
          )}
          <TableHead className="whitespace-nowrap w-[1%]">Status</TableHead>
          <TableHead className="whitespace-nowrap w-[1%]">Created At</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((order) => (
          <TableRow key={order.id} className="group/id">
            <TableCell>
              <CopyableId id={order.id} />
            </TableCell>
            <TableCell className="text-sm">
              <span className="line-clamp-2" title={order.customerName || order.customerId}>{order.customerName || order.customerId}</span>
            </TableCell>
            <TableCell className="text-sm">
              <span className="line-clamp-2" title={order.manufacturerName || order.manufacturerId}>{order.manufacturerName || order.manufacturerId}</span>
            </TableCell>
            <TableCell className="text-sm">
              <span className="line-clamp-2" title={order.productName || order.productId}>{order.productName || order.productId}</span>
            </TableCell>
            <TableCell className="text-sm text-right whitespace-nowrap">
              {order.quantity.toLocaleString("en-IN")}
            </TableCell>
            <TableCell className="text-sm text-right whitespace-nowrap">
              {order.price != null ? formatCurrency(order.price) : "—"}
            </TableCell>
            {orderType === "NORMAL" && (
              <TableCell className="text-sm text-right whitespace-nowrap">
                {order.totalAmount != null ? formatCurrency(order.totalAmount) : "—"}
              </TableCell>
            )}
            <TableCell className="whitespace-nowrap">
              <RequestStatusBadge status={order.status} />
            </TableCell>
            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
              {formatDate(order.createdAt)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
