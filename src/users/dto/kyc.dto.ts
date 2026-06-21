import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, Length } from 'class-validator';
import { MnoNetwork } from '@prisma/client';

export class SubmitTierOneKycDto {
  @ApiProperty({ example: '123456/11/1' })
  @IsString()
  @Length(7, 20)
  nationalRegistrationNo!: string;

  @ApiProperty({ enum: MnoNetwork, example: MnoNetwork.MTN })
  @IsEnum(MnoNetwork)
  network!: MnoNetwork;
}
