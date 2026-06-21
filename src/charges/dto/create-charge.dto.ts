import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNumber, IsObject, IsOptional, IsString, Min } from 'class-validator';
import { MnoNetwork } from '@prisma/client';

class ChargeMetaDto {
  @ApiProperty({ example: 'TIER_1_VERIFIED' })
  @IsString()
  tier_kyc_status!: string;

  @ApiProperty({ example: '999999/11/1' })
  @IsString()
  national_registration_number!: string;

  @ApiProperty({ example: 'WR_RETAIL_MMF' })
  @IsString()
  fund_code!: string;
}

/**
 * Mirrors the exact request body documented in Appendix C §3A —
 * "Inbound Cash Collection Request (STK Push Trigger)" — so the mobile
 * client and any partner aggregator can integrate directly against the
 * report's published contract.
 */
export class CreateChargeDto {
  @ApiProperty({ example: 100.0 })
  @IsNumber()
  @Min(100, { message: 'Minimum entry threshold is K100' })
  amount!: number;

  @ApiProperty({ example: 'ZMW' })
  @IsString()
  currency!: string;

  @ApiProperty({ example: 'retail.user102@wildrow.net' })
  @IsEmail()
  email!: string;

  @ApiProperty({ enum: MnoNetwork, example: MnoNetwork.MTN })
  @IsEnum(MnoNetwork)
  network!: MnoNetwork;

  @ApiProperty({ example: '260963456789' })
  @IsString()
  phone_number!: string;

  @ApiProperty({ example: 'Chileshe Mwamba' })
  @IsString()
  fullname!: string;

  @ApiProperty({ example: '41.215.44.12', required: false })
  @IsOptional()
  @IsString()
  client_ip?: string;

  @ApiProperty({ type: ChargeMetaDto })
  @IsObject()
  meta!: ChargeMetaDto;
}
