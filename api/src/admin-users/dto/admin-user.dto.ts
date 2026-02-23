import { IsOptional, IsString, IsEmail, IsBoolean, Matches } from 'class-validator';

export class CreateAdminUserDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+\d{1,4}\d{6,14}$/, { message: 'Phone must include country code (e.g. +919876543210)' })
  phone?: string;

  @IsOptional()
  @IsString()
  role?: string;
}

export class UpdateAdminUserDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+\d{1,4}\d{6,14}$/, { message: 'Phone must include country code (e.g. +919876543210)' })
  phone?: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
