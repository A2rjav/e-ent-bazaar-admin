"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { RequestFilters } from "@/components/requests/request-filters";
import { CoalOrderTable } from "@/components/requests/coal-order-table";
import { Pagination } from "@/components/ui/pagination";
import { TableSkeleton } from "@/components/ui/loading-skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";

const coalStatuses = [
  { value: "ALL", label: "Status" },
  { value: "confirmed", label: "Confirmed" },
  { value: "in_transit", label: "In Transit" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

export function CoalOrderListPage() {
  const [status, setStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data: result, isLoading, isError, refetch } = useQuery({
    queryKey: ["coal-orders", status, search, page],
    queryFn: () =>
      api.getCoalOrders({
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
            customStatuses={coalStatuses}
          />

          {isLoading ? (
            <TableSkeleton rows={limit} />
          ) : isError ? (
            <ErrorState onRetry={refetch} />
          ) : !result || result.data.length === 0 ? (
            <EmptyState
              title="No coal orders found"
              description="Try adjusting your filters or search query."
            />
          ) : (
            <>
              <CoalOrderTable data={result.data} />
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
