import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type {
  CreateAdminUserDto,
  UpdateAdminUserDto,
} from './dto/admin-user.dto';

@Injectable()
export class AdminUsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const users = await this.prisma.admin_users.findMany({
      orderBy: { created_at: 'desc' },
    });

    return users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      role: u.role ?? 'admin',
      isActive: u.is_active ?? true,
      createdAt: u.created_at?.toISOString() || '',
      updatedAt: u.updated_at?.toISOString() || '',
      lastLogin: u.last_login?.toISOString() || null,
      loginAttempts: u.login_attempts ?? 0,
      blockedUntil: u.blocked_until?.toISOString() || null,
    }));
  }

  async findById(id: string) {
    const u = await this.prisma.admin_users.findUnique({ where: { id } });
    if (!u) throw new NotFoundException('Admin user not found');

    return {
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      role: u.role ?? 'admin',
      isActive: u.is_active ?? true,
      createdAt: u.created_at?.toISOString() || '',
      updatedAt: u.updated_at?.toISOString() || '',
      lastLogin: u.last_login?.toISOString() || null,
      loginAttempts: u.login_attempts ?? 0,
      blockedUntil: u.blocked_until?.toISOString() || null,
    };
  }

  async create(dto: CreateAdminUserDto) {
    const existing = await this.prisma.admin_users.findUnique({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException('Email already exists');

    const u = await this.prisma.admin_users.create({
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone || null,
        role: dto.role || 'operation_manager',
        is_active: true,
      },
    });

    return {
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      role: u.role ?? 'operation_manager',
      isActive: u.is_active ?? true,
      createdAt: u.created_at?.toISOString() || '',
      updatedAt: u.updated_at?.toISOString() || '',
      lastLogin: null,
      loginAttempts: 0,
      blockedUntil: null,
    };
  }

  async update(id: string, dto: UpdateAdminUserDto) {
    const existing = await this.prisma.admin_users.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Admin user not found');

    if (dto.email && dto.email !== existing.email) {
      const emailTaken = await this.prisma.admin_users.findUnique({
        where: { email: dto.email },
      });
      if (emailTaken) throw new ConflictException('Email already in use');
    }

    const u = await this.prisma.admin_users.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.role !== undefined && { role: dto.role }),
        ...(dto.is_active !== undefined && { is_active: dto.is_active }),
        updated_at: new Date(),
      },
    });

    return {
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      role: u.role ?? 'admin',
      isActive: u.is_active ?? true,
      createdAt: u.created_at?.toISOString() || '',
      updatedAt: u.updated_at?.toISOString() || '',
      lastLogin: u.last_login?.toISOString() || null,
      loginAttempts: u.login_attempts ?? 0,
      blockedUntil: u.blocked_until?.toISOString() || null,
    };
  }

  async delete(id: string) {
    const existing = await this.prisma.admin_users.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Admin user not found');

    await this.prisma.admin_users.delete({ where: { id } });
    return { success: true };
  }
}
