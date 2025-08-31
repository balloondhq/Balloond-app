import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/strategies/jwt.strategy';
import { ModerationService } from './moderation.service';
import {
  CreateReportDto,
  BlockUserDto,
  VerifyPhotoDto,
  ModeratePhotoDto,
  BanUserDto,
  UpdateReportDto,
} from './dto/moderation.dto';
import { ReportStatus } from '@prisma/client';

@Controller('moderation')
export class ModerationController {
  constructor(private moderationService: ModerationService) {}

  // User actions
  @UseGuards(JwtAuthGuard)
  @Post('report')
  async reportUser(@Request() req, @Body() dto: CreateReportDto) {
    return this.moderationService.reportUser(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('block')
  async blockUser(@Request() req, @Body() dto: BlockUserDto) {
    return this.moderationService.blockUser(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('block/:userId')
  async unblockUser(@Request() req, @Param('userId') userId: string) {
    return this.moderationService.unblockUser(req.user.id, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('blocked')
  async getBlockedUsers(@Request() req) {
    return this.moderationService.getBlockedUsers(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('verify')
  async verifyUser(@Request() req, @Body() dto: VerifyPhotoDto) {
    return this.moderationService.verifyUser(req.user.id, dto);
  }

  // Photo moderation
  @UseGuards(JwtAuthGuard)
  @Post('photo/check')
  async moderatePhoto(@Body() dto: ModeratePhotoDto) {
    return this.moderationService.moderatePhoto(dto);
  }

  // Admin actions (add admin guard in production)
  @Get('queue')
  async getModerationQueue(@Query('status') status?: ReportStatus) {
    return this.moderationService.getModerationQueue(status);
  }

  @Put('report/:reportId')
  async reviewReport(
    @Param('reportId') reportId: string,
    @Body() dto: UpdateReportDto,
  ) {
    return this.moderationService.reviewReport(
      reportId,
      dto.status || ReportStatus.REVIEWING,
      dto.moderatorNotes,
    );
  }

  @Post('ban')
  async banUser(@Body() dto: BanUserDto) {
    return this.moderationService.banUser(dto);
  }
}
