import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';

export class WithdrawDto {
  @ApiProperty({ example: 250.0 })
  @IsNumber()
  @Min(10)
  amountZmw!: number;
}
