import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary() {
    const [
      totalSampleOrders,
      totalOrders,
      pendingSampleOrders,
      pendingOrders,
      deliveredSampleOrders,
      deliveredOrders,
      sampleStatusCounts,
      orderStatusCounts,
      samplesByState,
      ordersByState,
      agingSampleOrders,
      agingOrders,
    ] = await Promise.all([
      this.prisma.sample_orders.count(),
      this.prisma.orders.count(),
      this.prisma.sample_orders.count({ where: { status: 'pending' } }),
      this.prisma.orders.count({ where: { status: 'pending' } }),
      this.prisma.sample_orders.count({ where: { status: 'Delivered' } }),
      this.prisma.orders.count({ where: { status: 'Delivered' } }),

      this.prisma.sample_orders.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      this.prisma.orders.groupBy({
        by: ['status'],
        _count: { id: true },
      }),

      this.prisma.$queryRaw<
        { state: string; total: bigint; delivered: bigint; pending: bigint }[]
      >`
        SELECT m.state,
               COUNT(*)::bigint AS total,
               COUNT(*) FILTER (WHERE so.status = 'Delivered')::bigint AS delivered,
               COUNT(*) FILTER (WHERE so.status = 'pending')::bigint AS pending
        FROM sample_orders so
        JOIN manufacturers m ON m.id = so.manufacturer_id
        GROUP BY m.state
        ORDER BY total DESC
        LIMIT 10
      `,

      this.prisma.$queryRaw<
        { state: string; total: bigint; delivered: bigint; pending: bigint }[]
      >`
        SELECT e.state,
               COUNT(*)::bigint AS total,
               COUNT(*) FILTER (WHERE o.status = 'Delivered')::bigint AS delivered,
               COUNT(*) FILTER (WHERE o.status = 'pending')::bigint AS pending
        FROM orders o
        JOIN endcustomers e ON e.id = o.customer_id
        WHERE e.state IS NOT NULL
        GROUP BY e.state
        ORDER BY total DESC
        LIMIT 10
      `,

      this.prisma.sample_orders.findMany({
        where: { status: 'pending' },
        orderBy: { created_at: 'asc' },
        take: 10,
        include: {
          endcustomers: { select: { name: true } },
          manufacturers: { select: { name: true } },
          products: { select: { name: true } },
        },
      }),

      this.prisma.orders.findMany({
        where: { status: 'pending' },
        orderBy: { created_at: 'asc' },
        take: 10,
        include: {
          endcustomers: { select: { name: true } },
        },
      }),
    ]);

    const totalDelivered = deliveredSampleOrders + deliveredOrders;
    const totalAll = totalSampleOrders + totalOrders;
    const completionRate =
      totalAll > 0 ? Math.round((totalDelivered / totalAll) * 1000) / 10 : 0;

    const statusMap: Record<string, number> = {};
    for (const s of sampleStatusCounts) {
      const key = s.status;
      statusMap[key] = (statusMap[key] || 0) + s._count.id;
    }
    for (const s of orderStatusCounts) {
      const key = s.status;
      statusMap[key] = (statusMap[key] || 0) + s._count.id;
    }
    const statusCounts = Object.entries(statusMap).map(([status, count]) => ({
      status,
      count,
    }));

    const regionMap: Record<
      string,
      { totalOrders: number; delivered: number; pending: number }
    > = {};
    for (const r of samplesByState) {
      const key = r.state || 'Unknown';
      if (!regionMap[key])
        regionMap[key] = { totalOrders: 0, delivered: 0, pending: 0 };
      regionMap[key].totalOrders += Number(r.total);
      regionMap[key].delivered += Number(r.delivered);
      regionMap[key].pending += Number(r.pending);
    }
    for (const r of ordersByState) {
      const key = r.state || 'Unknown';
      if (!regionMap[key])
        regionMap[key] = { totalOrders: 0, delivered: 0, pending: 0 };
      regionMap[key].totalOrders += Number(r.total);
      regionMap[key].delivered += Number(r.delivered);
      regionMap[key].pending += Number(r.pending);
    }
    const regionDemand = Object.entries(regionMap)
      .map(([state, data]) => ({ state, ...data }))
      .sort((a, b) => b.totalOrders - a.totalOrders)
      .slice(0, 10);

    const now = Date.now();
    const agingRequests = [
      ...agingSampleOrders.map((so) => ({
        id: so.id,
        tableName: 'sample_orders' as const,
        customerName: so.endcustomers?.name || '',
        manufacturerName: so.manufacturers?.name || '',
        productName: so.products?.name || '',
        status: so.status,
        hoursInPending: so.created_at
          ? Math.round((now - new Date(so.created_at).getTime()) / 3600000)
          : 0,
        createdAt: so.created_at?.toISOString() || '',
      })),
      ...agingOrders.map((o) => ({
        id: o.id,
        tableName: 'orders' as const,
        customerName: o.endcustomers?.name || '',
        manufacturerName: '',
        productName: '',
        status: o.status,
        hoursInPending: o.created_at
          ? Math.round((now - new Date(o.created_at).getTime()) / 3600000)
          : 0,
        createdAt: o.created_at?.toISOString() || '',
      })),
    ].sort((a, b) => b.hoursInPending - a.hoursInPending);

    return {
      summary: {
        totalSampleOrders,
        totalOrders,
        pendingSampleOrders,
        pendingOrders,
        deliveredOrders: totalDelivered,
        completionRate,
      },
      statusCounts,
      regionDemand,
      agingRequests,
    };
  }
}
