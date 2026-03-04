"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import { formatPhone } from "@/lib/phone";
import type { Participant } from "@/lib/types";

interface ParticipantTableProps {
  data: Participant[];
}

export function ParticipantTable({ data }: ParticipantTableProps) {
  return (
    <Table className="w-full text-sm">
      <TableHeader>
        <TableRow className="border-b">
          <TableHead className="min-w-[130px] max-w-[160px]">Name</TableHead>
          <TableHead className="min-w-[150px] max-w-[200px]">Company</TableHead>
          <TableHead className="min-w-[160px] max-w-[200px]">Email</TableHead>
          <TableHead className="w-[140px] whitespace-nowrap">Phone</TableHead>
          <TableHead className="max-w-[120px]">State</TableHead>
          <TableHead className="max-w-[120px]">District</TableHead>
          <TableHead className="max-w-[110px]">City</TableHead>
          <TableHead className="w-[110px] text-right whitespace-nowrap pr-4">Joined</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((p) => (
          <TableRow key={p.id} className="hover:bg-muted/40 transition-colors">
            <TableCell className="py-3 max-w-[160px]">
              <span className="block truncate font-medium" title={p.name}>
                {p.name}
              </span>
            </TableCell>
            <TableCell className="py-3 max-w-[200px]">
              <span className="block truncate text-muted-foreground" title={p.companyName}>
                {p.companyName || "—"}
              </span>
            </TableCell>
            <TableCell className="py-3 max-w-[200px]">
              <span className="block truncate text-muted-foreground" title={p.email}>
                {p.email || "—"}
              </span>
            </TableCell>
            <TableCell className="py-3 whitespace-nowrap">
              {formatPhone(p.phone) || "—"}
            </TableCell>
            <TableCell className="py-3 max-w-[120px]">
              <span className="block truncate" title={p.state}>
                {p.state || "—"}
              </span>
            </TableCell>
            <TableCell className="py-3 max-w-[120px]">
              <span className="block truncate text-muted-foreground" title={p.district}>
                {p.district || "—"}
              </span>
            </TableCell>
            <TableCell className="py-3 max-w-[110px]">
              <span className="block truncate text-muted-foreground" title={p.city}>
                {p.city || "—"}
              </span>
            </TableCell>
            <TableCell className="py-3 text-right text-muted-foreground whitespace-nowrap pr-4">
              {formatDate(p.createdAt)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
