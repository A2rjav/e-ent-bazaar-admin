import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { OrderQueryDto } from './dto/order-query.dto';

export interface OrderListItem {
  id: string;
  orderType: 'SAMPLE' | 'NORMAL';
  customerId: string;
  manufacturerId: string;
  productId: string;
  quantity: number;
  price: number | null;
  totalAmount: number | null;
  deliveryAddress: string;
  contactNumber: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  adminResponse?: string | null;
  adminId?: string | null;
  trackingNumber?: string | null;
  customerName?: string;
  manufacturerName?: string;
  productName?: string;
}

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: OrderQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;
    const items: OrderListItem[] = [];
    let total = 0;

    if (!query.orderType || query.orderType === 'SAMPLE') {
      const sampleResult = await this.fetchSampleOrders(query, skip, limit);
      items.push(...sampleResult.items);
      total += sampleResult.total;
    }

    if (!query.orderType || query.orderType === 'NORMAL') {
      const orderResult = await this.fetchOrders(
        query,
        query.orderType ? skip : 0,
        query.orderType ? limit : limit,
      );
      items.push(...orderResult.items);
      total += orderResult.total;
    }

    items.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    const finalItems = query.orderType ? items : items.slice(0, limit);
    const finalTotal = total;

    return {
      data: finalItems,
      meta: {
        total: finalTotal,
        page,
        limit,
        totalPages: Math.ceil(finalTotal / limit),
      },
    };
  }

  private async fetchSampleOrders(
    query: OrderQueryDto,
    skip: number,
    take: number,
  ) {
    const where: Record<string, unknown> = {};
    if (query.status && query.status !== 'ALL') {
      where.status = query.status;
    }
    if (query.search) {
      where.OR = [
        { endcustomers: { name: { contains: query.search, mode: 'insensitive' } } },
        { manufacturers: { name: { contains: query.search, mode: 'insensitive' } } },
        { products: { name: { contains: query.search, mode: 'insensitive' } } },
        { id: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.sample_orders.findMany({
        where,
        skip,
        take,
        orderBy: { created_at: 'desc' },
        include: {
          endcustomers: { select: { name: true } },
          manufacturers: { select: { name: true } },
          products: { select: { name: true } },
        },
      }),
      this.prisma.sample_orders.count({ where }),
    ]);

    const items: OrderListItem[] = rows.map((r) => ({
      id: r.id,
      orderType: 'SAMPLE' as const,
      customerId: r.customer_id,
      manufacturerId: r.manufacturer_id,
      productId: r.product_id,
      quantity: r.quantity,
      price: r.price ? Number(r.price) : null,
      totalAmount: r.total_amount ? Number(r.total_amount) : null,
      deliveryAddress: r.delivery_address,
      contactNumber: r.contact_number,
      status: r.status,
      createdAt: r.created_at?.toISOString() || '',
      updatedAt: r.updated_at?.toISOString() || '',
      adminResponse: r.admin_response,
      adminId: r.admin_id,
      customerName: r.endcustomers?.name || '',
      manufacturerName: r.manufacturers?.name || '',
      productName: r.products?.name || '',
    }));

    return { items, total };
  }

  private async fetchOrders(
    query: OrderQueryDto,
    skip: number,
    take: number,
  ) {
    const where: Record<string, unknown> = {};
    if (query.status && query.status !== 'ALL') {
      where.status = query.status;
    }
    if (query.search) {
      where.OR = [
        { endcustomers: { name: { contains: query.search, mode: 'insensitive' } } },
        { id: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.orders.findMany({
        where,
        skip,
        take,
        orderBy: { created_at: 'desc' },
        include: {
          endcustomers: { select: { name: true } },
        },
      }),
      this.prisma.orders.count({ where }),
    ]);

    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const productIds = rows
      .map((r) => r.product_id)
      .filter((id) => id && uuidRegex.test(id));
    const manufacturerIds = rows
      .map((r) => r.manufacturer_id)
      .filter((id) => id && uuidRegex.test(id));

    const [products, manufacturers] = await Promise.all([
      productIds.length
        ? this.prisma.products.findMany({
            where: { id: { in: productIds } },
            select: { id: true, name: true },
          })
        : [],
      manufacturerIds.length
        ? this.prisma.manufacturer.findMany({
            where: { id: { in: manufacturerIds } },
            select: { id: true, name: true },
          })
        : [],
    ]);

    const productMap = new Map<string, string>();
    for (const p of products) productMap.set(p.id, p.name);
    const mfgMap = new Map<string, string>();
    for (const m of manufacturers) mfgMap.set(m.id, m.name);

    const items: OrderListItem[] = rows.map((r) => ({
      id: r.id,
      orderType: 'NORMAL' as const,
      customerId: r.customer_id,
      manufacturerId: r.manufacturer_id,
      productId: r.product_id,
      quantity: r.quantity,
      price: r.price ? Number(r.price) : null,
      totalAmount: r.total_amount ? Number(r.total_amount) : null,
      deliveryAddress: r.delivery_address,
      contactNumber: r.contact_number,
      status: r.status,
      createdAt: r.created_at?.toISOString() || '',
      updatedAt: r.updated_at?.toISOString() || '',
      trackingNumber: r.tracking_number,
      customerName: r.endcustomers?.name || '',
      manufacturerName: mfgMap.get(r.manufacturer_id) ?? '',
      productName: productMap.get(r.product_id) ?? '',
    }));

    return { items, total };
  }

  async findById(id: string) {
    const sampleOrder = await this.prisma.sample_orders.findUnique({
      where: { id },
      include: {
        endcustomers: true,
        manufacturers: true,
        products: true,
      },
    });

    if (sampleOrder) {
      return this.mapSampleOrderDetail(sampleOrder);
    }

    const order = await this.prisma.orders.findUnique({
      where: { id },
      include: { endcustomers: true },
    });

    if (!order) throw new NotFoundException('Order not found');
    return this.mapOrderDetail(order);
  }

  private mapSampleOrderDetail(so: any) {
    return {
      id: so.id,
      orderType: 'SAMPLE',
      customerId: so.customer_id,
      manufacturerId: so.manufacturer_id,
      productId: so.product_id,
      quantity: so.quantity,
      price: so.price ? Number(so.price) : null,
      totalAmount: so.total_amount ? Number(so.total_amount) : null,
      deliveryAddress: so.delivery_address,
      contactNumber: so.contact_number,
      status: so.status,
      createdAt: so.created_at?.toISOString() || '',
      updatedAt: so.updated_at?.toISOString() || '',
      adminResponse: so.admin_response,
      adminId: so.admin_id,
      customerName: so.endcustomers?.name || '',
      manufacturerName: so.manufacturers?.name || '',
      productName: so.products?.name || '',
      customer: {
        id: so.customer_id,
        name: so.endcustomers?.name || '',
        companyName: so.endcustomers?.company_name || '',
        email: so.endcustomers?.email || '',
        phone: so.endcustomers?.phone || '',
        state: so.endcustomers?.state || '',
        district: so.endcustomers?.district || '',
        city: so.endcustomers?.city || '',
      },
      manufacturer: {
        id: so.manufacturer_id,
        name: so.manufacturers?.name || '',
        companyName: so.manufacturers?.company_name || '',
        email: so.manufacturers?.email || '',
        phone: so.manufacturers?.phone || '',
        state: so.manufacturers?.state || '',
        district: so.manufacturers?.district || '',
        city: so.manufacturers?.city || '',
      },
      product: {
        id: so.product_id,
        name: so.products?.name || '',
        category: so.products?.category || '',
        price: so.products?.price ? Number(so.products.price) : null,
        priceUnit: so.products?.price_unit || null,
      },
      statusHistory: [
        {
          id: 'sh-1',
          toStatus: 'Pending',
          changedBy: 'System',
          createdAt: so.created_at?.toISOString() || '',
        },
        ...(so.status !== 'pending'
          ? [
              {
                id: 'sh-2',
                toStatus: so.status,
                changedBy: so.manufacturers?.name || 'System',
                createdAt: so.updated_at?.toISOString() || '',
              },
            ]
          : []),
      ],
    };
  }

  private async mapOrderDetail(o: any) {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    let manufacturer: any = null;
    let product: any = null;

    if (o.manufacturer_id && uuidRegex.test(o.manufacturer_id)) {
      manufacturer = await this.prisma.manufacturer.findUnique({
        where: { id: o.manufacturer_id },
      });
    }
    if (o.product_id && uuidRegex.test(o.product_id)) {
      product = await this.prisma.products.findUnique({
        where: { id: o.product_id },
      });
    }

    return {
      id: o.id,
      orderType: 'NORMAL',
      customerId: o.customer_id,
      manufacturerId: o.manufacturer_id,
      productId: o.product_id,
      quantity: o.quantity,
      price: o.price ? Number(o.price) : null,
      totalAmount: o.total_amount ? Number(o.total_amount) : null,
      deliveryAddress: o.delivery_address,
      contactNumber: o.contact_number,
      status: o.status,
      createdAt: o.created_at?.toISOString() || '',
      updatedAt: o.updated_at?.toISOString() || '',
      trackingNumber: o.tracking_number,
      customerName: o.endcustomers?.name || '',
      manufacturerName: manufacturer?.name || '',
      productName: product?.name || '',
      customer: {
        id: o.customer_id,
        name: o.endcustomers?.name || '',
        companyName: o.endcustomers?.company_name || '',
        email: o.endcustomers?.email || '',
        phone: o.endcustomers?.phone || '',
        state: o.endcustomers?.state || '',
        district: o.endcustomers?.district || '',
        city: o.endcustomers?.city || '',
      },
      manufacturer: {
        id: o.manufacturer_id,
        name: manufacturer?.name || '',
        companyName: manufacturer?.company_name || '',
        email: manufacturer?.email || '',
        phone: manufacturer?.phone || '',
        state: manufacturer?.state || '',
        district: manufacturer?.district || '',
        city: manufacturer?.city || '',
      },
      product: {
        id: o.product_id,
        name: product?.name || '',
        category: product?.category || '',
        price: product?.price ? Number(product.price) : null,
        priceUnit: product?.price_unit || null,
      },
      statusHistory: [
        {
          id: 'sh-1',
          toStatus: 'Pending',
          changedBy: 'System',
          createdAt: o.created_at?.toISOString() || '',
        },
        ...(o.status !== 'pending'
          ? [
              {
                id: 'sh-2',
                toStatus: o.status,
                changedBy: manufacturer?.name || 'System',
                createdAt: o.updated_at?.toISOString() || '',
              },
            ]
          : []),
      ],
    };
  }

  async reassign(orderId: string, manufacturerId: string) {
    const so = await this.prisma.sample_orders.findUnique({
      where: { id: orderId },
    });

    if (so) {
      await this.prisma.sample_orders.update({
        where: { id: orderId },
        data: { manufacturer_id: manufacturerId },
      });
      return { success: true };
    }

    const ord = await this.prisma.orders.findUnique({
      where: { id: orderId },
    });
    if (!ord) throw new NotFoundException('Order not found');

    await this.prisma.orders.update({
      where: { id: orderId },
      data: { manufacturer_id: manufacturerId },
    });
    return { success: true };
  }

  async getManufacturerOptions() {
    const manufacturers = await this.prisma.manufacturer.findMany({
      select: {
        id: true,
        name: true,
        company_name: true,
        state: true,
        city: true,
      },
      orderBy: { name: 'asc' },
    });

    return manufacturers.map((m) => ({
      id: m.id,
      name: m.name,
      companyName: m.company_name,
      state: m.state,
      city: m.city || '',
    }));
  }
}
