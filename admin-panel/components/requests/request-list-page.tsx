"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { RequestFilters } from "@/components/requests/request-filters";
import { RequestTable } from "@/components/requests/request-table";
import { Pagination } from "@/components/ui/pagination";
import { TableSkeleton } from "@/components/ui/loading-skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import type { OrderType } from "@/lib/types";

interface RequestListPageProps {
  orderType: OrderType;
}

export function RequestListPage({ orderType }: RequestListPageProps) {
  const [status, setStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 10;

  const {
    data: result,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["orders", orderType, status, search, page],
    queryFn: () =>
      api.getOrders({
        orderType,
        status: status === "ALL" ? undefined : status,
        search: search || undefined,
        page,
        limit,
      }),
  });

  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus);
    setPage(1);
  };

  const handleSearchChange = (newSearch: string) => {
    setSearch(newSearch);
    setPage(1);
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <RequestFilters
            status={status}
            search={search}
            onStatusChange={handleStatusChange}
            onSearchChange={handleSearchChange}
          />

          {isLoading ? (
            <TableSkeleton rows={limit} />
          ) : isError ? (
            <ErrorState onRetry={refetch} />
          ) : !result || result.data.length === 0 ? (
            <EmptyState
              title="No orders found"
              description="Try adjusting your filters or search query."
            />
          ) : (
            <>
              <RequestTable data={result.data} orderType={orderType} />
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
