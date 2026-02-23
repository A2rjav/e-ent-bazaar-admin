"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ParticipantTable } from "@/components/participants/participant-table";
import { Pagination } from "@/components/ui/pagination";
import { TableSkeleton } from "@/components/ui/loading-skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import type { ParticipantType } from "@/lib/types";

interface ParticipantListPageProps {
  type: ParticipantType;
}

export function ParticipantListPage({ type }: ParticipantListPageProps) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 10;

  const {
    data: result,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["participants", type, search, page],
    queryFn: () =>
      api.getParticipants({
        type,
        search: search || undefined,
        page,
        limit,
      }),
  });

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search participants..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>

          {isLoading ? (
            <TableSkeleton rows={limit} />
          ) : isError ? (
            <ErrorState onRetry={refetch} />
          ) : !result || result.data.length === 0 ? (
            <EmptyState
              title="No participants found"
              description="Try adjusting your search query."
            />
          ) : (
            <>
              <ParticipantTable data={result.data} />
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
