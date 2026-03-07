"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StarRating } from "@/components/ui/star-rating";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { api } from "@/lib/api";
import type { Review } from "@/lib/types";

interface ReviewTableProps {
  data: Review[];
  onDelete: () => void;
}

export function ReviewTable({ data, onDelete }: ReviewTableProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!deleteId) return;
    const review = data.find((r) => r.id === deleteId);
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await api.deleteReview(deleteId, review?.sourceTable);
      setDeleteId(null);
      onDelete();
    } catch (err) {
      setDeleteError(
        err instanceof Error
          ? err.message
          : "Failed to delete review. This feature may not be available yet."
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Table className="w-full text-sm">
        <TableHeader>
          <TableRow className="border-b">
            <TableHead className="min-w-[140px] max-w-[180px]">Reviewer</TableHead>
            <TableHead className="min-w-[140px] max-w-[180px]">Reviewee</TableHead>
            <TableHead className="w-[100px]">Rating</TableHead>
            <TableHead className="min-w-[200px] max-w-[300px]">Review</TableHead>
            <TableHead className="w-[90px] text-center">Verified</TableHead>
            <TableHead className="w-[110px] text-right whitespace-nowrap pr-4">Date</TableHead>
            <TableHead className="w-[60px] text-center">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((review) => (
            <TableRow key={review.id} className="hover:bg-muted/40 transition-colors">
              <TableCell className="py-3 max-w-[180px]">
                <span
                  className="block truncate font-medium"
                  title={review.reviewerName}
                >
                  {review.reviewerName}
                </span>
                <Badge variant="secondary" className="text-[10px] mt-1">
                  {review.reviewerType}
                </Badge>
              </TableCell>
              <TableCell className="py-3 max-w-[180px]">
                <span
                  className="block truncate font-medium"
                  title={review.revieweeName}
                >
                  {review.revieweeName}
                </span>
                <Badge variant="secondary" className="text-[10px] mt-1">
                  {review.revieweeType}
                </Badge>
              </TableCell>
              <TableCell className="py-3">
                <StarRating rating={review.rating} />
              </TableCell>
              <TableCell className="py-3 max-w-[300px]">
                {review.reviewTitle && (
                  <span
                    className="block truncate font-medium text-sm"
                    title={review.reviewTitle}
                  >
                    {review.reviewTitle}
                  </span>
                )}
                <span
                  className="block text-sm text-muted-foreground line-clamp-2"
                  title={review.reviewText ?? ""}
                >
                  {review.reviewText}
                </span>
              </TableCell>
              <TableCell className="py-3 text-center">
                <Badge
                  variant={review.isVerified ? "success" : "secondary"}
                  className="text-[10px]"
                >
                  {review.isVerified ? "Verified" : "Unverified"}
                </Badge>
              </TableCell>
              <TableCell className="py-3 text-right text-muted-foreground whitespace-nowrap pr-4">
                {formatDate(review.createdAt)}
              </TableCell>
              <TableCell className="py-3 text-center">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setDeleteId(review.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={!!deleteId} onOpenChange={() => { setDeleteId(null); setDeleteError(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Review</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this review? This action will
              soft-delete the review and it will no longer be visible to users.
            </DialogDescription>
          </DialogHeader>
          {deleteError && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3">
              <p className="text-sm text-destructive">{deleteError}</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteId(null); setDeleteError(null); }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete Review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
