"use client";

import Link from "next/link";
import { Clock, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import type { AgingRequest } from "@/lib/types";

interface AgingTableProps {
  data: AgingRequest[];
}

function getAgingSeverity(hours: number): "default" | "warning" | "destructive" {
  if (hours > 120) return "destructive";
  if (hours > 72) return "warning";
  return "default";
}

function formatHours(hours: number): string {
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${Math.round(hours % 24)}h`;
  }
  return `${Math.round(hours)}h`;
}

export function AgingTable({ data }: AgingTableProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-amber-500" />
        <CardTitle className="text-base">Aging Orders (Pending)</CardTitle>
      </CardHeader>
      <CardContent>
        <Table className="w-full text-sm">
          <TableHeader>
            <TableRow className="border-b">
              <TableHead className="w-[110px]">ID</TableHead>
              <TableHead className="w-[80px]">Source</TableHead>
              <TableHead className="min-w-[130px] max-w-[160px]">Customer</TableHead>
              <TableHead className="min-w-[130px] max-w-[160px]">Manufacturer</TableHead>
              <TableHead className="min-w-[130px] max-w-[180px]">Product</TableHead>
              <TableHead className="w-[80px]">Age</TableHead>
              <TableHead className="w-[110px] text-right whitespace-nowrap pr-4">Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item) => (
              <TableRow key={item.id} className="hover:bg-muted/40 transition-colors">
                <TableCell className="py-3">
                  <Link
                    href={`/requests/${item.id}`}
                    className="font-mono text-xs font-medium text-primary hover:underline"
                    title={item.id}
                  >
                    …{item.id.slice(-8)}
                  </Link>
                </TableCell>
                <TableCell className="py-3">
                  <Badge variant="secondary" className="text-[10px]">
                    {item.tableName === "sample_orders" ? "Sample" : "Order"}
                  </Badge>
                </TableCell>
                <TableCell className="py-3 max-w-[160px]">
                  <span className="block truncate" title={item.customerName}>
                    {item.customerName}
                  </span>
                </TableCell>
                <TableCell className="py-3 max-w-[160px]">
                  <span className="block truncate text-muted-foreground" title={item.manufacturerName}>
                    {item.manufacturerName}
                  </span>
                </TableCell>
                <TableCell className="py-3 max-w-[180px]">
                  <span className="block truncate text-muted-foreground" title={item.productName}>
                    {item.productName}
                  </span>
                </TableCell>
                <TableCell className="py-3">
                  <Badge variant={getAgingSeverity(item.hoursInPending)} className="gap-1">
                    <Clock className="h-3 w-3" />
                    {formatHours(item.hoursInPending)}
                  </Badge>
                </TableCell>
                <TableCell className="py-3 text-right text-muted-foreground whitespace-nowrap pr-4">
                  {formatDate(item.createdAt)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
