"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { RequestFilters } from "@/components/requests/request-filters";
import { TransportOrderTable } from "@/components/requests/transport-order-table";
import { Pagination } from "@/components/ui/pagination";
import { TableSkeleton } from "@/components/ui/loading-skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";

const transportStatuses = [
  { value: "ALL", label: "Status" },
  { value: "confirmed", label: "Confirmed" },
  { value: "in_transit", label: "In Transit" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

export function TransportOrderListPage() {
  const [status, setStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data: result, isLoading, isError, refetch } = useQuery({
    queryKey: ["transport-orders", status, search, page],
    queryFn: () =>
      api.getTransportOrders({
        status: status === "ALL" ? undefined : status,
        search: search || undefined,
        page,
        limit,
      }),
  });

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <RequestFilters
            status={status}
            search={search}
            onStatusChange={(s) => { setStatus(s); setPage(1); }}
            onSearchChange={(s) => { setSearch(s); setPage(1); }}
            customStatuses={transportStatuses}
          />

          {isLoading ? (
            <TableSkeleton rows={limit} />
          ) : isError ? (
            <ErrorState onRetry={refetch} />
          ) : !result || result.data.length === 0 ? (
            <EmptyState
              title="No transport orders found"
              description="Try adjusting your filters or search query."
            />
          ) : (
            <>
              <TransportOrderTable data={result.data} />
              <Pagination
                page={page}
                totalPages={result.meta.totalPages}
                total={result.meta.total}
                limit={limit}
                onPageChange={setPage}
              />
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
