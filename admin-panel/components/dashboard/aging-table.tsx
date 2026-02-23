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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Manufacturer</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Age</TableHead>
              <TableHead>Created At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <Link
                    href={`/requests/${item.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {item.id}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="text-[10px]">
                    {item.tableName === "sample_orders" ? "Sample" : "Order"}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">{item.customerName}</TableCell>
                <TableCell className="text-sm">{item.manufacturerName}</TableCell>
                <TableCell className="text-sm">{item.productName}</TableCell>
                <TableCell>
                  <Badge
                    variant={getAgingSeverity(item.hoursInPending)}
                    className="gap-1"
                  >
                    <Clock className="h-3 w-3" />
                    {formatHours(item.hoursInPending)}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
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
