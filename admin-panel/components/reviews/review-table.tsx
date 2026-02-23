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

  const handleDelete = async () => {
    if (!deleteId) return;
    const review = data.find((r) => r.id === deleteId);
    setIsDeleting(true);
    await api.deleteReview(deleteId, review?.sourceTable);
    setIsDeleting(false);
    setDeleteId(null);
    onDelete();
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Reviewer</TableHead>
            <TableHead>Reviewee</TableHead>
            <TableHead>Rating</TableHead>
            <TableHead className="min-w-[300px]">Review</TableHead>
            <TableHead>Verified</TableHead>
            <TableHead>Created At</TableHead>
            <TableHead className="text-center">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((review) => (
            <TableRow key={review.id}>
              <TableCell>
                <div>
                  <p className="font-medium text-sm">{review.reviewerName}</p>
                  <Badge variant="secondary" className="text-[10px] mt-1">
                    {review.reviewerType}
                  </Badge>
                </div>
              </TableCell>
              <TableCell>
                <div>
                  <p className="font-medium text-sm">{review.revieweeName}</p>
                  <Badge variant="secondary" className="text-[10px] mt-1">
                    {review.revieweeType}
                  </Badge>
                </div>
              </TableCell>
              <TableCell>
                <StarRating rating={review.rating} />
              </TableCell>
              <TableCell>
                <div>
                  {review.reviewTitle && (
                    <p className="text-sm font-medium">{review.reviewTitle}</p>
                  )}
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {review.reviewText}
                  </p>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={review.isVerified ? "success" : "secondary"} className="text-[10px]">
                  {review.isVerified ? "Verified" : "Unverified"}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                {formatDate(review.createdAt)}
              </TableCell>
              <TableCell className="text-center">
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

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Review</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this review? This action will
              soft-delete the review and it will no longer be visible to users.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
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
