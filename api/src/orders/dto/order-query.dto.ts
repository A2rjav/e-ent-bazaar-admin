import { IsOptional, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class OrderQueryDto {
  @IsOptional()
  @IsString()
  orderType?: 'SAMPLE' | 'NORMAL';

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;
}

export class ReassignDto {
  @IsString()
  manufacturerId: string;
}

/** Used by PATCH /api/admin/requests/:id/reassign (Railway contract) */
export class RequestsReassignDto {
  @IsString()
  new_manufacturer_id: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

/** Used by PATCH /api/admin/orders/:id/status */
export class UpdateStatusDto {
  @IsString()
  status: string;

  @IsOptional()
  @IsString()
  tracking_number?: string;

  @IsOptional()
  @IsString()
  admin_response?: string;
}
