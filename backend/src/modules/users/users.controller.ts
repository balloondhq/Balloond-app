/**
 * Users controller
 * Handles user profile management
 */

import { 
  Controller, 
  Get, 
  Put, 
  Body, 
  Request, 
  UseGuards, 
  Post,
  UploadedFiles,
  UseInterceptors,
  Param
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateProfileDto, UpdateLocationDto } from './dto/user.dto';

@ApiTags('users')
@Controller('users')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@Request() req) {
    return this.usersService.findById(req.user.id);
  }

  @Put('profile')
  @ApiOperation({ summary: 'Update user profile' })
  async updateProfile(@Request() req, @Body() updateProfileDto: UpdateProfileDto) {
    return this.usersService.updateProfile(req.user.id, updateProfileDto);
  }

  @Post('photos')
  @UseInterceptors(FilesInterceptor('photos', 6))
  @ApiOperation({ summary: 'Upload profile photos' })
  async uploadPhotos(@Request() req, @UploadedFiles() files: Express.Multer.File[]) {
    // In production, upload to S3 and get URLs
    const photoUrls = files.map(file => `https://balloond.s3.amazonaws.com/${file.filename}`);
    return this.usersService.updatePhotos(req.user.id, photoUrls);
  }

  @Put('location')
  @ApiOperation({ summary: 'Update user location' })
  async updateLocation(@Request() req, @Body() locationDto: UpdateLocationDto) {
    return this.usersService.updateLocation(req.user.id, locationDto);
  }

  @Get('nearby')
  @ApiOperation({ summary: 'Get nearby users within radius' })
  async getNearbyUsers(@Request() req) {
    return this.usersService.getNearbyUsers(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  async getUserById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }
}
