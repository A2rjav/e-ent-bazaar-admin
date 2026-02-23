"use client";

import {
  FileText,
  Clock,
  CheckCircle2,
  TrendingUp,
  Package,
  FlaskConical,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPercentage } from "@/lib/utils";
import type { DashboardSummary } from "@/lib/types";

interface KPISectionProps {
  summary: DashboardSummary;
}

export function KPISection({ summary }: KPISectionProps) {
  const kpis = [
    {
      title: "Total Sample Orders",
      value: summary.totalSampleOrders.toLocaleString("en-IN"),
      description: "From sample_orders table",
      icon: FlaskConical,
      color: "text-blue-600 bg-blue-100",
    },
    {
      title: "Total Orders",
      value: summary.totalOrders.toLocaleString("en-IN"),
      description: "From orders table",
      icon: Package,
      color: "text-indigo-600 bg-indigo-100",
    },
    {
      title: "Pending",
      value: (summary.pendingSampleOrders + summary.pendingOrders).toLocaleString("en-IN"),
      description: `${summary.pendingSampleOrders} samples + ${summary.pendingOrders} orders`,
      icon: Clock,
      color: "text-amber-600 bg-amber-100",
    },
    {
      title: "Delivered Orders",
      value: summary.deliveredOrders.toLocaleString("en-IN"),
      description: "Successfully completed deliveries",
      icon: CheckCircle2,
      color: "text-emerald-600 bg-emerald-100",
    },
    {
      title: "Completion Rate",
      value: formatPercentage(summary.completionRate),
      description: "Delivered out of total orders",
      icon: TrendingUp,
      color: "text-violet-600 bg-violet-100",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      {kpis.map((kpi) => (
        <Card key={kpi.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {kpi.title}
            </CardTitle>
            <div className={`rounded-lg p-2 ${kpi.color}`}>
              <kpi.icon className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpi.value}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {kpi.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
