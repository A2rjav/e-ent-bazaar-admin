"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { ReviewTable } from "@/components/reviews/review-table";
import { TableSkeleton } from "@/components/ui/loading-skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";

export function ReviewListPage() {
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["reviews"],
    queryFn: () => api.getReviews(),
  });

  const handleDelete = () => {
    queryClient.invalidateQueries({ queryKey: ["reviews"] });
  };

  return (
    <Card>
      <CardContent className="pt-6">
        {isLoading ? (
          <TableSkeleton rows={8} />
        ) : isError ? (
          <ErrorState onRetry={refetch} />
        ) : !data || data.length === 0 ? (
          <EmptyState
            title="No reviews found"
            description="No ratings or reviews have been submitted yet."
          />
        ) : (
          <ReviewTable data={data} onDelete={handleDelete} />
        )}
      </CardContent>
    </Card>
  );
}
