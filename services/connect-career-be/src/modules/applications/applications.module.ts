import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Application } from './domain/entities/application.entity';
import { Interview } from './domain/entities/interview.entity';
import { Offer } from './domain/entities/offer.entity';
import { Job } from '../jobs/domain/entities/job.entity';
import { User } from '../identity/domain/entities';
import { CandidateProfile } from '../profile/domain/entities/candidate-profile.entity';
import { CV } from '../cv-maker/domain/entities/cv.entity';
import { ApplicationService } from './api/services/application.service';
import { ApplicationController } from './api/controller/application.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Application,
      Interview,
      Offer,
      Job,
      User,
      CandidateProfile,
      CV,
    ]),
  ],
  controllers: [ApplicationController],
  providers: [ApplicationService],
  exports: [ApplicationService],
})
export class ApplicationsModule {}
