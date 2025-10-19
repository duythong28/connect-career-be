import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  NotFoundException,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import * as decorators from 'src/modules/identity/api/decorators';
import { JwtAuthGuard } from 'src/modules/identity/api/guards/jwt-auth.guard';
import * as identityRepository from 'src/modules/identity/domain/repository/identity.repository';
import { UpdateUserDto, UserProfileDto } from '../dtos/user.dto';

@ApiTags('User Management')
@Controller('v1/users')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: identityRepository.IUserRepository,
  ) {}
  @Patch('/me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update current user information' })
  @ApiResponse({
    status: 200,
    description: 'User information updated successfully',
    type: UserProfileDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async updateUserProfile(
    @decorators.CurrentUser() user: decorators.CurrentUserPayload,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserProfileDto> {
    const existingUser = await this.userRepository.findById(user.sub);
    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    if (updateUserDto.email && updateUserDto.email !== existingUser.email) {
      const emailExists = await this.userRepository.findByEmail(
        updateUserDto.email,
      );
      if (emailExists) {
        throw new BadRequestException('Email is already taken');
      }
    }

    if (
      updateUserDto.username &&
      updateUserDto.username !== existingUser.username
    ) {
      const usernameExists = await this.userRepository.findByUsername(
        updateUserDto.username,
      );
      if (usernameExists) {
        throw new BadRequestException('Username is already taken');
      }
    }
    const updatedUser = await this.userRepository.update(user.sub, {
      ...updateUserDto,
      updatedAt: new Date(),
    });

    return updatedUser;
  }
}
