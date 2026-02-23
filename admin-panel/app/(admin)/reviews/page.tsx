"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { ReviewTable } from "@/components/reviews/review-table";
import { TableSkeleton } from "@/components/ui/loading-skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";

export default function ReviewsPage() {
  const {
    data: reviews,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["reviews"],
    queryFn: api.getReviews,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ratings & Reviews"
        description="Moderate user reviews and ratings on the platform"
      />

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <TableSkeleton rows={8} />
          ) : isError ? (
            <ErrorState onRetry={refetch} />
          ) : !reviews || reviews.length === 0 ? (
            <EmptyState
              title="No reviews yet"
              description="Reviews will appear here once users start rating each other."
            />
          ) : (
            <ReviewTable data={reviews} onDelete={() => refetch()} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
