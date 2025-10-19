import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CV } from './domain/entities/cv.entity';
import { FileSystemModule } from 'src/shared/infrastructure/external-services/file-system/file-system.module';
import { CVRepository } from './domain/repository/cv.repository';
import { CVService } from './api/services/cv.service';
import { CVCandidateController } from './api/controllers/cv.candidate.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CV]), FileSystemModule],
  providers: [CVRepository, CVService],
  controllers: [CVCandidateController],
  exports: [CVService, CVRepository],
})
export class CvMakerModule {}
