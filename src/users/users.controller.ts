import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { SubmitTierOneKycDto } from './dto/kyc.dto';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('v1/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: "Get the authenticated investor's profile and KYC status" })
  getProfile(@CurrentUser() user: { userId: string }) {
    return this.usersService.getProfile(user.userId);
  }

  @Post('me/kyc/tier-1')
  @ApiOperation({ summary: 'Submit Tier 1 (MNO-matched) KYC — Criterion 3.3 onboarding relaxation' })
  submitKyc(@CurrentUser() user: { userId: string }, @Body() dto: SubmitTierOneKycDto) {
    return this.usersService.submitTierOneKyc(user.userId, dto.nationalRegistrationNo, dto.network);
  }
}
