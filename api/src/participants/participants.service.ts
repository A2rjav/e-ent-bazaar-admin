import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { ParticipantType } from './dto/participant-query.dto';

export interface ParticipantListItem {
  id: string;
  type: ParticipantType;
  name: string;
  email: string;
  phone: string;
  companyName: string;
  state: string;
  district: string;
  city: string;
  category: string;
  status: string;
  createdAt: string;
}

export interface PaginatedParticipants {
  data: ParticipantListItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

@Injectable()
export class ParticipantsService {
  constructor(private readonly prisma: PrismaService) {}

  private toParticipant(
    row: Record<string, unknown>,
    type: ParticipantType,
  ): ParticipantListItem {
    const name = (row.name as string) ?? '';
    const email = (row.email as string) ?? '';
    const phone = (row.phone as string) ?? '';
    const companyName =
      (row.company_name as string) ?? (row.companyName as string) ?? '';
    const state = (row.state as string) ?? '';
    const district = (row.district as string) ?? '';
    const city = (row.city as string) ?? '';
    const category = (row.category as string) ?? '';
    const createdAt =
      row.created_at instanceof Date
        ? (row.created_at as Date).toISOString()
        : String(row.created_at ?? '');

    let status = '';
    if (typeof row.status === 'string') {
      status = row.status;
    } else if (row.is_active !== undefined) {
      status = row.is_active ? 'active' : 'inactive';
    } else if (row.deleted_at) {
      status = 'inactive';
    } else {
      status = 'active';
    }

    return {
      id: String(row.id),
      type,
      name,
      email,
      phone,
      companyName,
      state,
      district,
      city,
      category,
      status,
      createdAt,
    };
  }

  async findAll(
    type: ParticipantType,
    search?: string,
    page = 1,
    limit = 10,
    status?: string,
  ): Promise<PaginatedParticipants> {
    const skip = (page - 1) * limit;

    const searchOr = (fields: string[]) =>
      search
        ? fields.map((f) => ({ [f]: { contains: search, mode: 'insensitive' as const } }))
        : undefined;

    switch (type) {
      case 'MANUFACTURER': {
        const where: Record<string, unknown> = {};
        if (search) {
          where.OR = searchOr(['name', 'email', 'company_name', 'state', 'city']);
        }
        if (status) where.status = status;

        const [data, total] = await Promise.all([
          this.prisma.manufacturer.findMany({
            where,
            skip,
            take: limit,
            orderBy: { created_at: 'desc' },
          }),
          this.prisma.manufacturer.count({ where }),
        ]);
        return {
          data: data.map((r) =>
            this.toParticipant(
              { ...r, company_name: r.company_name } as Record<string, unknown>,
              type,
            ),
          ),
          meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        };
      }
      case 'ENDCUSTOMER': {
        const where: Record<string, unknown> = {};
        if (status === 'active') where.deleted_at = null;
        else if (status === 'inactive') where.deleted_at = { not: null };
        else where.deleted_at = null;
        if (search) {
          where.OR = searchOr(['name', 'email', 'company_name', 'state', 'city', 'phone']);
        }

        const [data, total] = await Promise.all([
          this.prisma.endcustomer.findMany({
            where,
            skip,
            take: limit,
            orderBy: { created_at: 'desc' },
          }),
          this.prisma.endcustomer.count({ where }),
        ]);
        return {
          data: data.map((r) =>
            this.toParticipant(
              { ...r, company_name: r.company_name } as Record<string, unknown>,
              type,
            ),
          ),
          meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        };
      }
      case 'COAL_PROVIDER': {
        const where: Record<string, unknown> = {};
        if (search) {
          where.OR = searchOr(['name', 'email', 'company_name', 'state', 'city']);
        }
        const [data, total] = await Promise.all([
          this.prisma.coalProvider.findMany({
            where,
            skip,
            take: limit,
            orderBy: { created_at: 'desc' },
          }),
          this.prisma.coalProvider.count({ where }),
        ]);
        return {
          data: data.map((r) =>
            this.toParticipant(
              { ...r, company_name: r.company_name } as Record<string, unknown>,
              type,
            ),
          ),
          meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        };
      }
      case 'TRANSPORT_PROVIDER': {
        const where: Record<string, unknown> = {};
        if (search) {
          where.OR = searchOr(['name', 'email', 'company_name', 'state', 'city']);
        }
        const [data, total] = await Promise.all([
          this.prisma.transportProvider.findMany({
            where,
            skip,
            take: limit,
            orderBy: { created_at: 'desc' },
          }),
          this.prisma.transportProvider.count({ where }),
        ]);
        return {
          data: data.map((r) =>
            this.toParticipant(
              { ...r, company_name: r.company_name } as Record<string, unknown>,
              type,
            ),
          ),
          meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        };
      }
      case 'LABOUR_CONTRACTOR': {
        const where: Record<string, unknown> = {};
        if (search) {
          where.OR = searchOr(['name', 'email', 'company_name', 'state', 'city']);
        }
        if (status === 'active') where.is_active = true;
        else if (status === 'inactive') where.is_active = false;

        const [data, total] = await Promise.all([
          this.prisma.labourContractor.findMany({
            where,
            skip,
            take: limit,
            orderBy: { created_at: 'desc' },
          }),
          this.prisma.labourContractor.count({ where }),
        ]);
        return {
          data: data.map((r) =>
            this.toParticipant(
              { ...r, company_name: r.company_name } as Record<string, unknown>,
              type,
            ),
          ),
          meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        };
      }
      default: {
        const _: never = type;
        return { data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } };
      }
    }
  }

  private tableForType(type: ParticipantType): string {
    const map: Record<ParticipantType, string> = {
      MANUFACTURER: 'manufacturers',
      ENDCUSTOMER: 'endcustomers',
      COAL_PROVIDER: 'coal_providers',
      TRANSPORT_PROVIDER: 'transport_providers',
      LABOUR_CONTRACTOR: 'labour_contractors',
    };
    return map[type];
  }

  async activate(type: ParticipantType, id: string): Promise<{ success: boolean }> {
    switch (type) {
      case 'MANUFACTURER': {
        const r = await this.prisma.manufacturer.updateMany({
          where: { id },
          data: { status: 'Active' },
        });
        if (r.count === 0) throw new NotFoundException(`Manufacturer ${id} not found`);
        return { success: true };
      }
      case 'ENDCUSTOMER': {
        const r = await this.prisma.endcustomer.updateMany({
          where: { id },
          data: { deleted_at: null },
        });
        if (r.count === 0) throw new NotFoundException(`Endcustomer ${id} not found`);
        return { success: true };
      }
      case 'COAL_PROVIDER':
      case 'TRANSPORT_PROVIDER': {
        throw new NotFoundException(
          `${this.tableForType(type)} does not have activate/deactivate; implement if your DB has a status column`,
        );
      }
      case 'LABOUR_CONTRACTOR': {
        const r = await this.prisma.labourContractor.updateMany({
          where: { id },
          data: { is_active: true },
        });
        if (r.count === 0) throw new NotFoundException(`Labour contractor ${id} not found`);
        return { success: true };
      }
      default: {
        const _: never = type;
        return { success: false };
      }
    }
  }

  async deactivate(type: ParticipantType, id: string): Promise<{ success: boolean }> {
    switch (type) {
      case 'MANUFACTURER': {
        const r = await this.prisma.manufacturer.updateMany({
          where: { id },
          data: { status: 'Inactive' },
        });
        if (r.count === 0) throw new NotFoundException(`Manufacturer ${id} not found`);
        return { success: true };
      }
      case 'ENDCUSTOMER': {
        const r = await this.prisma.endcustomer.updateMany({
          where: { id },
          data: { deleted_at: new Date() },
        });
        if (r.count === 0) throw new NotFoundException(`Endcustomer ${id} not found`);
        return { success: true };
      }
      case 'COAL_PROVIDER':
      case 'TRANSPORT_PROVIDER': {
        throw new NotFoundException(
          `${this.tableForType(type)} does not have activate/deactivate; implement if your DB has a status column`,
        );
      }
      case 'LABOUR_CONTRACTOR': {
        const r = await this.prisma.labourContractor.updateMany({
          where: { id },
          data: { is_active: false },
        });
        if (r.count === 0) throw new NotFoundException(`Labour contractor ${id} not found`);
        return { success: true };
      }
      default: {
        const _: never = type;
        return { success: false };
      }
    }
  }
}
