import { IsPhoneNumber, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RequestOtpDto {
  @ApiProperty({ example: '260963456789' })
  @IsString()
  @Length(9, 13)
  phoneNumber!: string;
}

export class VerifyOtpDto {
  @ApiProperty({ example: '260963456789' })
  @IsString()
  @Length(9, 13)
  phoneNumber!: string;

  @ApiProperty({ example: '4821' })
  @IsString()
  @Length(4, 4)
  code!: string;
}
