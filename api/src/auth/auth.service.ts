import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  // ---------------------------------------------------------------------------
  // SEND OTP
  // ---------------------------------------------------------------------------
  async sendOtp(phone: string): Promise<{ success: boolean; code?: string }> {
    // Allow phone with or without country code — normalize by looking up any admin
    // whose phone field ends with or equals the provided value
    const admin = await this.prisma.admin_users.findFirst({
      where: {
        OR: [
          { phone: { equals: phone } },
          { phone: { endsWith: phone.replace(/^\+\d{1,3}/, '') } },
        ],
        is_active: true,
      },
    });

    if (!admin) {
      throw new NotFoundException('No active admin account found for this phone number');
    }

    const code = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Invalidate any existing unused OTPs for this phone
    await this.prisma.otp_codes.updateMany({
      where: { phone, used: false },
      data: { used: true },
    });

    await this.prisma.otp_codes.create({
      data: {
        phone,
        code,
        expires_at: expiresAt,
        auth_method: 'sms',
      },
    });

    // In production you'd call an SMS gateway here.
    // For now return the code in the response (dev / no SMS service).
    const isDev = process.env.NODE_ENV !== 'production';
    return { success: true, ...(isDev && { code }) };
  }

  // ---------------------------------------------------------------------------
  // VERIFY OTP
  // ---------------------------------------------------------------------------
  async verifyOtp(
    phone: string,
    code: string,
  ): Promise<{ access_token: string }> {
    const otpRecord = await this.prisma.otp_codes.findFirst({
      where: {
        phone,
        code,
        used: false,
        expires_at: { gt: new Date() },
      },
      orderBy: { created_at: 'desc' },
    });

    if (!otpRecord) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    // Mark OTP as used
    await this.prisma.otp_codes.update({
      where: { id: otpRecord.id },
      data: { used: true },
    });

    // Find the admin — prefer super_admin when multiple users share the same phone
    const candidates = await this.prisma.admin_users.findMany({
      where: {
        OR: [
          { phone: { equals: phone } },
          { phone: { endsWith: phone.replace(/^\+\d{1,3}/, '') } },
        ],
        is_active: true,
      },
      orderBy: { created_at: 'asc' },
    });

    const admin =
      candidates.find((u) => u.role === 'super_admin') || candidates[0];

    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    // Update last login
    await this.prisma.admin_users.update({
      where: { id: admin.id },
      data: { last_login: new Date() },
    });

    const payload = { sub: admin.id, email: admin.email, role: admin.role };
    const access_token = this.jwtService.sign(payload);

    return { access_token };
  }

  // ---------------------------------------------------------------------------
  // API KEY LOGIN (bypass for testing)
  // ---------------------------------------------------------------------------
  async loginWithApiKey(apiKey: string): Promise<{ access_token: string }> {
    const validKey = process.env.ADMIN_API_KEY || 'e-ent-admin-test';
    if (apiKey !== validKey) {
      throw new UnauthorizedException('Invalid API key');
    }

    const admin = await this.prisma.admin_users.findFirst({
      where: { is_active: true },
      orderBy: { created_at: 'asc' },
    });

    if (!admin) {
      throw new NotFoundException('No active admin found');
    }

    const payload = { sub: admin.id, email: admin.email, role: admin.role };
    const access_token = this.jwtService.sign(payload);
    return { access_token };
  }

  // ---------------------------------------------------------------------------
  // GET CURRENT USER (from JWT payload)
  // ---------------------------------------------------------------------------
  async getCurrentUser(userId: string) {
    const admin = await this.prisma.admin_users.findUnique({
      where: { id: userId },
    });

    if (!admin) throw new NotFoundException('Admin not found');

    return {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      phone: admin.phone ?? '',
      role: admin.role ?? 'admin',
      isActive: admin.is_active ?? true,
      lastLogin: admin.last_login?.toISOString() ?? null,
      loginAttempts: admin.login_attempts ?? 0,
    };
  }
}
