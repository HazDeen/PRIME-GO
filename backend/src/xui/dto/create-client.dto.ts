// src/xui/dto/create-client.dto.ts
import { IsEmail, IsOptional, IsNumber, IsString, IsUUID, IsBoolean, Min, Max } from 'class-validator';

export class CreateClientDto {
  @IsOptional()
  @IsNumber()
  inboundId?: number = 1;

  @IsString()
  email: string;

  @IsUUID()
  uuid: string;

  @IsOptional()
  @IsNumber()
  telegramId?: number = 0;

  @IsOptional()
  @IsString()
  flow?: string = 'xtls-rprx-vision';

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalGb?: number = 0;

  @IsOptional()
  expiryTime?: number | Date;

  @IsOptional()
  @IsBoolean()
  enable?: boolean = true;

  @IsOptional()
  @IsString()
  comment?: string = '';
}