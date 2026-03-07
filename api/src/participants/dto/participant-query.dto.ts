import { IsIn, IsOptional, IsString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export const PARTICIPANT_TYPES = [
  'MANUFACTURER',
  'ENDCUSTOMER',
  'COAL_PROVIDER',
  'TRANSPORT_PROVIDER',
  'LABOUR_CONTRACTOR',
] as const;

export type ParticipantType = (typeof PARTICIPANT_TYPES)[number];

export class ParticipantQueryDto {
  @IsIn(PARTICIPANT_TYPES)
  type: ParticipantType;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number = 10;
}
