"use client";

import { useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Check, Copy } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { RequestDetailCard } from "@/components/requests/request-detail-card";
import { StatusTimeline } from "@/components/requests/status-timeline";
import { DetailSkeleton } from "@/components/ui/loading-skeleton";
import { ErrorState } from "@/components/ui/error-state";

function getBackLink(orderType?: string): string {
  if (orderType === "SAMPLE") return "/requests/sample-orders";
  return "/requests/orders";
}

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const requestType = searchParams.get("type") || undefined;
  const [copied, setCopied] = useState(false);

  const {
    data: order,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["order", id, requestType],
    queryFn: () => api.getRequestById(id, requestType),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <PageHeader title="Loading..." />
        </div>
        <DetailSkeleton />
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <PageHeader title="Order Not Found" />
        </div>
        <ErrorState onRetry={refetch} />
      </div>
    );
  }

  const backLink = getBackLink(order.orderType);

  const handleCopyId = async () => {
    await navigator.clipboard.writeText(order.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <Link href={backLink}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight break-all">{order.id}</h1>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleCopyId}
              className="h-8"
            >
              {copied ? (
                <>
                  <Check className="mr-1.5 h-4 w-4" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="mr-1.5 h-4 w-4" />
                  Copy ID
                </>
              )}
            </Button>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {[order.product?.name, order.customer?.companyName || order.customer?.name].filter(Boolean).join(" — ") || order.id}
          </p>
        </div>
      </div>

      <RequestDetailCard request={order} />
      <StatusTimeline history={order.statusHistory} />
    </div>
  );
}
