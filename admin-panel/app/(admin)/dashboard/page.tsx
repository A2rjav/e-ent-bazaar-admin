"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { KPISection } from "@/components/dashboard/kpi-section";
import { StatusChart } from "@/components/dashboard/status-chart";
import { RegionChart } from "@/components/dashboard/region-chart";
import { DashboardSkeleton } from "@/components/ui/loading-skeleton";
import { ErrorState } from "@/components/ui/error-state";

export default function DashboardPage() {
  const {
    data: dashboard,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["dashboard"],
    queryFn: api.getDashboardSummary,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Dashboard"
          description="Overview of platform activity and key metrics"
        />
        <DashboardSkeleton />
      </div>
    );
  }

  if (isError || !dashboard) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Dashboard"
          description="Overview of platform activity and key metrics"
        />
        <ErrorState onRetry={refetch} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Overview of platform activity and key metrics"
      />

      <KPISection summary={dashboard.summary} />

      <div className="grid gap-6 lg:grid-cols-2">
        <StatusChart data={dashboard.statusCounts} />
        <RegionChart data={dashboard.regionDemand} />
      </div>

    </div>
  );
}
