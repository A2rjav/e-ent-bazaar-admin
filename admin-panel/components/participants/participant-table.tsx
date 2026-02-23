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
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Company Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead className="min-w-[160px]">Phone</TableHead>
          <TableHead>State</TableHead>
          <TableHead>District</TableHead>
          <TableHead>City</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Created At</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((participant) => (
          <TableRow key={participant.id}>
            <TableCell className="text-sm font-medium">
              {participant.name}
            </TableCell>
            <TableCell className="text-sm">
              {participant.companyName}
            </TableCell>
            <TableCell className="text-sm">
              {participant.email}
            </TableCell>
            <TableCell className="text-sm">
              {formatPhone(participant.phone)}
            </TableCell>
            <TableCell className="text-sm">{participant.state}</TableCell>
            <TableCell className="text-sm">{participant.district}</TableCell>
            <TableCell className="text-sm">{participant.city}</TableCell>
            <TableCell className="text-sm">{participant.category}</TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {formatDate(participant.createdAt)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
