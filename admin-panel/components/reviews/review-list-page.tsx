"use client";

import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ReviewTable } from "@/components/reviews/review-table";
import { Pagination } from "@/components/ui/pagination";
import { TableSkeleton } from "@/components/ui/loading-skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import type { Review } from "@/lib/types";

const CATEGORY_OPTIONS = [
  { value: "ALL", label: "Category" },
  { value: "manufacturer-coal", label: "Manufacturer → Coal" },
  { value: "manufacturer-transport", label: "Manufacturer → Transport" },
  { value: "coal-provider-manufacturer", label: "Coal Provider → Manufacturer" },
  { value: "transport-provider-manufacturer", label: "Transport → Manufacturer" },
  { value: "labour-contractor", label: "Labour Contractor" },
] as const;

const VERIFIED_OPTIONS = [
  { value: "ALL", label: "Reviews" },
  { value: "verified", label: "Verified" },
  { value: "unverified", label: "Unverified" },
] as const;

const RATING_OPTIONS = [
  { value: "ALL", label: "Ratings" },
  { value: "5", label: "★★★★★  5" },
  { value: "4", label: "★★★★  4+" },
  { value: "3", label: "★★★  3+" },
  { value: "2", label: "★★  2+" },
  { value: "1", label: "★  1+" },
] as const;

const PAGE_SIZE = 10;

export function ReviewListPage() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("ALL");
  const [verified, setVerified] = useState("ALL");
  const [rating, setRating] = useState("ALL");
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["reviews"],
    queryFn: () => api.getReviews(),
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    let items: Review[] = data;

    if (category !== "ALL") {
      items = items.filter((r) => r.sourceTable === category);
    }

    if (verified !== "ALL") {
      items = items.filter((r) =>
        verified === "verified" ? r.isVerified : !r.isVerified
      );
    }

    if (rating !== "ALL") {
      const min = Number(rating);
      items = items.filter((r) => r.rating >= min);
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      items = items.filter(
        (r) =>
          r.reviewerName?.toLowerCase().includes(q) ||
          r.revieweeName?.toLowerCase().includes(q) ||
          r.reviewTitle?.toLowerCase().includes(q) ||
          r.reviewText?.toLowerCase().includes(q)
      );
    }

    return items;
  }, [data, category, verified, rating, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  const handleDelete = () => {
    queryClient.invalidateQueries({ queryKey: ["reviews"] });
  };

  const handleFilterChange = (
    setter: (v: string) => void,
    value: string
  ) => {
    setter(value);
    setPage(1);
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, title, review text..."
                value={search}
                onChange={(e) => handleFilterChange(setSearch, e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select
                value={category}
                onValueChange={(v) => handleFilterChange(setCategory, v)}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={verified}
                onValueChange={(v) => handleFilterChange(setVerified, v)}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Reviews" />
                </SelectTrigger>
                <SelectContent>
                  {VERIFIED_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={rating}
                onValueChange={(v) => handleFilterChange(setRating, v)}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Ratings" />
                </SelectTrigger>
                <SelectContent>
                  {RATING_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading ? (
            <TableSkeleton rows={PAGE_SIZE} />
          ) : isError ? (
            <ErrorState onRetry={refetch} />
          ) : filtered.length === 0 ? (
            <EmptyState
              title="No reviews found"
              description={
                data && data.length > 0
                  ? "Try adjusting your filters or search query."
                  : "No ratings or reviews have been submitted yet."
              }
            />
          ) : (
            <>
              <ReviewTable data={paged} onDelete={handleDelete} />
              <Pagination
                page={safePage}
                totalPages={totalPages}
                total={filtered.length}
                limit={PAGE_SIZE}
                onPageChange={setPage}
              />
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
