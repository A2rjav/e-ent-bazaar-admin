import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // GET /api/admin/dashboard/overview
  // ---------------------------------------------------------------------------
  async getOverview(fromDate?: string, toDate?: string) {
    const dateFilter: Record<string, unknown> = {};
    if (fromDate || toDate) {
      dateFilter.created_at = {};
      if (fromDate) (dateFilter.created_at as Record<string, unknown>).gte = new Date(fromDate);
      if (toDate) (dateFilter.created_at as Record<string, unknown>).lte = new Date(toDate);
    }

    const [
      totalSampleOrders,
      totalOrders,
      pendingSampleOrders,
      pendingOrders,
      deliveredSampleOrders,
      deliveredOrders,
      totalManufacturers,
      totalEndcustomers,
      totalCoalProviders,
      totalTransportProviders,
    ] = await Promise.all([
      this.prisma.sample_orders.count({ where: dateFilter }),
      this.prisma.orders.count({ where: dateFilter }),
      this.prisma.sample_orders.count({ where: { ...dateFilter, status: 'pending' } }),
      this.prisma.orders.count({ where: { ...dateFilter, status: 'pending' } }),
      this.prisma.sample_orders.count({ where: { ...dateFilter, status: 'Delivered' } }),
      this.prisma.orders.count({ where: { ...dateFilter, status: 'Delivered' } }),
      this.prisma.manufacturer.count(),
      this.prisma.endcustomer.count(),
      this.prisma.coalProvider.count(),
      this.prisma.transportProvider.count(),
    ]);

    const totalDelivered = deliveredSampleOrders + deliveredOrders;
    const totalAll = totalSampleOrders + totalOrders;
    const completionRate =
      totalAll > 0 ? Math.round((totalDelivered / totalAll) * 1000) / 10 : 0;

    return {
      totalSampleOrders,
      totalOrders,
      pendingSampleOrders,
      pendingOrders,
      deliveredOrders: totalDelivered,
      completionRate,
      totalManufacturers,
      totalEndcustomers,
      totalCoalProviders,
      totalTransportProviders,
    };
  }

  // ---------------------------------------------------------------------------
  // GET /api/admin/dashboard/requests-by-status
  // ---------------------------------------------------------------------------
  async getRequestsByStatus() {
    const [sampleStatusCounts, orderStatusCounts] = await Promise.all([
      this.prisma.sample_orders.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      this.prisma.orders.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
    ]);

    const statusMap: Record<string, number> = {};
    for (const s of sampleStatusCounts) {
      statusMap[s.status] = (statusMap[s.status] || 0) + s._count.id;
    }
    for (const s of orderStatusCounts) {
      statusMap[s.status] = (statusMap[s.status] || 0) + s._count.id;
    }

    return Object.entries(statusMap).map(([status, count]) => ({
      status,
      count,
    }));
  }

  // ---------------------------------------------------------------------------
  // GET /api/admin/dashboard/regional-trends
  // ---------------------------------------------------------------------------
  async getRegionalTrends() {
    const [samplesByState, ordersByState] = await Promise.all([
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
    ]);

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

    return Object.entries(regionMap)
      .map(([state, data]) => ({ state, ...data }))
      .sort((a, b) => b.totalOrders - a.totalOrders)
      .slice(0, 10);
  }

  // ---------------------------------------------------------------------------
  // GET /api/admin/dashboard/participant-performance
  // ---------------------------------------------------------------------------
  async getParticipantPerformance(type?: string, metric?: string, limit = 5) {
    // Default to manufacturer performance by orders
    const participantType = type || 'manufacturer';
    const safeLimit = Math.min(Math.max(limit || 5, 1), 50);

    if (participantType === 'manufacturer') {
      const manufacturers = await this.prisma.manufacturer.findMany({
        take: safeLimit,
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          name: true,
          company_name: true,
          state: true,
          _count: {
            select: {
              sample_orders: true,
              quotations: true,
            },
          },
        },
      });

      return manufacturers.map((m) => ({
        id: m.id,
        name: m.name || m.company_name || 'Unknown',
        type: 'manufacturer',
        totalOrders: m._count.sample_orders + m._count.quotations,
        state: m.state,
      }));
    }

    // Fallback: empty
    return [];
  }

  // ---------------------------------------------------------------------------
  // GET /api/admin/dashboard — combined (legacy)
  // ---------------------------------------------------------------------------

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
