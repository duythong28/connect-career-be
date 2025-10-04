import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { CandidateProfileService } from '../services/candidate.profile.service';
import { JwtAuthGuard } from 'src/modules/identity/api/guards/jwt-auth.guard';
import * as decorators from 'src/modules/identity/api/decorators';

@Controller('/v1/candidates')
@UseGuards(JwtAuthGuard)
export class CandidateProfileController {
  constructor(
    private readonly candidateProfileService: CandidateProfileService,
  ) {}

  @Get('/me')
  async getMyCandidateProfile(
    @decorators.CurrentUser() user: decorators.CurrentUserPayload,
  ) {
    return this.candidateProfileService.getCandidateProfileByUserId(user.sub);
  }

  @Get(':id')
  async getCandidateProfileById(@Param('id', ParseUUIDPipe) id: string) {
    return this.candidateProfileService.getCandidateProfileById(id);
  }
}
