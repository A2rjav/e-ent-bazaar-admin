"use client";

import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RequestStatusBadge } from "@/components/ui/status-badge";
import { formatDate, formatCurrency } from "@/lib/utils";
import type { OrderListItem, OrderType } from "@/lib/types";

interface RequestTableProps {
  data: OrderListItem[];
  orderType: OrderType;
}

export function RequestTable({ data, orderType }: RequestTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>Customer</TableHead>
          <TableHead>Manufacturer</TableHead>
          <TableHead>Product</TableHead>
          <TableHead className="text-right">Quantity</TableHead>
          <TableHead className="text-right">Price</TableHead>
          {orderType === "NORMAL" && (
            <TableHead className="text-right">Total Amount</TableHead>
          )}
          <TableHead>Status</TableHead>
          {orderType === "NORMAL" && (
            <TableHead>Tracking #</TableHead>
          )}
          <TableHead>Created At</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((order) => (
          <TableRow key={order.id}>
            <TableCell>
              <Link
                href={`/requests/${order.id}`}
                className="font-medium text-primary hover:underline"
              >
                {order.id}
              </Link>
            </TableCell>
            <TableCell className="text-sm">
              {order.customerName || order.customerId}
            </TableCell>
            <TableCell className="text-sm">
              {order.manufacturerName || order.manufacturerId}
            </TableCell>
            <TableCell className="text-sm">
              {order.productName || order.productId}
            </TableCell>
            <TableCell className="text-sm text-right">
              {order.quantity.toLocaleString("en-IN")}
            </TableCell>
            <TableCell className="text-sm text-right">
              {order.price != null ? formatCurrency(order.price) : "—"}
            </TableCell>
            {orderType === "NORMAL" && (
              <TableCell className="text-sm text-right">
                {order.totalAmount != null ? formatCurrency(order.totalAmount) : "—"}
              </TableCell>
            )}
            <TableCell>
              <RequestStatusBadge status={order.status} />
            </TableCell>
            {orderType === "NORMAL" && (
              <TableCell className="text-sm text-muted-foreground">
                {order.trackingNumber || "—"}
              </TableCell>
            )}
            <TableCell className="text-sm text-muted-foreground">
              {formatDate(order.createdAt)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
