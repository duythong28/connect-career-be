import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/modules/identity/domain/entities/user.entity';
import { ElasticsearchService } from '../elasticsearch.service';

@Injectable()
export class PeopleIndexerService {
  private readonly logger = new Logger(PeopleIndexerService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly elasticsearchService: ElasticsearchService,
  ) {}

  async indexPerson(userId: string): Promise<void> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
        relations: [
          'candidateProfile',
          'candidateProfile.workExperiences',
          'candidateProfile.workExperiences.organization',
          'candidateProfile.educations',
        ],
      });

      if (!user) {
        this.logger.warn(`User not found: ${userId}`);
        return;
      }

      if (!user.candidateProfile) {
        this.logger.warn(`User ${userId} does not have a candidate profile`);
        return;
      }

      await this.elasticsearchService.indexPerson(user);
      this.logger.log(`Successfully indexed person: ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to index person ${userId}:`, error);
      throw error;
    }
  }

  async indexPeople(userIds: string[]): Promise<void> {
    const results = await Promise.allSettled(
      userIds.map((id) => this.indexPerson(id)),
    );

    const failed = results.filter((r) => r.status === 'rejected');
    if (failed.length > 0) {
      this.logger.warn(
        `Failed to index ${failed.length} out of ${userIds.length} people`,
      );
    }
  }

  async removePerson(userId: string): Promise<void> {
    try {
      await this.elasticsearchService.deletePerson(userId);
      this.logger.log(`Successfully removed person from index: ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to remove person ${userId}:`, error);
      throw error;
    }
  }

  async reindexAllPeople(): Promise<{ indexed: number; failed: number }> {
    this.logger.log('Starting full people reindexing...');
    let indexed = 0;
    let failed = 0;

    const batchSize = 100;
    let offset = 0;

    while (true) {
      const users = await this.userRepository
        .createQueryBuilder('user')
        .leftJoinAndSelect('user.candidateProfile', 'candidateProfile')
        .leftJoinAndSelect(
          'candidateProfile.workExperiences',
          'workExperiences',
        )
        .leftJoinAndSelect('workExperiences.organization', 'organization')
        .leftJoinAndSelect('candidateProfile.educations', 'educations')
        .take(batchSize)
        .skip(offset)
        .getMany();

      if (users.length === 0) break;

      for (const user of users) {
        try {
          await this.elasticsearchService.indexPerson(user);
          indexed++;
        } catch (error) {
          this.logger.error(`Failed to index person ${user.id}:`, error);
          failed++;
        }
      }

      offset += batchSize;
      this.logger.log(`Indexed ${indexed} people, failed: ${failed}`);
    }

    this.logger.log(
      `Reindexing complete. Indexed: ${indexed}, Failed: ${failed}`,
    );
    return { indexed, failed };
  }
}
