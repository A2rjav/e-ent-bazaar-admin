"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { RequestDetailCard } from "@/components/requests/request-detail-card";
import { StatusTimeline } from "@/components/requests/status-timeline";
import { ReassignDialog } from "@/components/requests/reassign-dialog";
import { DetailSkeleton } from "@/components/ui/loading-skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { useUIStore } from "@/store/ui.store";
import { useAccessConfigStore } from "@/store/access-config.store";
import { canEditModule } from "@/lib/rbac";

function getBackLink(orderType?: string): string {
  if (orderType === "SAMPLE") return "/requests/sample-orders";
  return "/requests/orders";
}

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const currentUser = useUIStore((s) => s.currentUser);
  const viewAsUser = useUIStore((s) => s.viewAsUser);
  const configMap = useAccessConfigStore((s) => s.config);
  const effectiveUser = viewAsUser ?? currentUser;
  const canEditRequests = canEditModule(
    effectiveUser?.id,
    effectiveUser?.role,
    configMap,
    "requests"
  );

  const {
    data: order,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["order", id],
    queryFn: () => api.getOrderById(id),
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href={backLink}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <PageHeader
            title={order.id}
            description={`${order.product.name} — ${order.customer.companyName}`}
          />
        </div>
        {canEditRequests && (
          <ReassignDialog
            orderId={order.id}
            currentManufacturerId={order.manufacturer.id}
          />
        )}
      </div>

      <RequestDetailCard request={order} />
      <StatusTimeline history={order.statusHistory} />
    </div>
  );
}
