import { IsNotEmpty, IsString } from 'class-validator';

export class SendOtpDto {
  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  countryCode: string = '+91';
}

export class VerifyOtpDto {
  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  countryCode: string = '+91';
}
