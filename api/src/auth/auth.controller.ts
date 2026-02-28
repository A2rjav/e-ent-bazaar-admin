import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiKeyDto, SendOtpDto, VerifyOtpDto } from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Request } from 'express';

@Controller('admin/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** POST /api/admin/auth/send-otp */
  @Post('send-otp')
  sendOtp(@Body() body: SendOtpDto) {
    return this.authService.sendOtp(body.phone);
  }

  /** POST /api/admin/auth/verify-otp */
  @Post('verify-otp')
  verifyOtp(@Body() body: VerifyOtpDto) {
    return this.authService.verifyOtp(body.phone, body.code);
  }

  /** POST /api/admin/auth/api-key */
  @Post('api-key')
  loginWithApiKey(@Body() body: ApiKeyDto) {
    return this.authService.loginWithApiKey(body.apiKey);
  }

  /** GET /api/admin/auth/me */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@Req() req: Request & { user: { sub: string } }) {
    return this.authService.getCurrentUser(req.user.sub);
  }
}
