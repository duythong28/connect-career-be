import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from 'src/modules/profile/domain/entities/organization.entity';
import { ElasticsearchService } from '../elasticsearch.service';

@Injectable()
export class OrganizationIndexerService {
  private readonly logger = new Logger(OrganizationIndexerService.name);

  constructor(
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    private readonly elasticsearchService: ElasticsearchService,
  ) {}

  async indexOrganization(organizationId: string): Promise<void> {
    try {
      const organization = await this.organizationRepository.findOne({
        where: { id: organizationId },
        relations: ['industry', 'logoFile'],
      });

      if (!organization) {
        this.logger.warn(`Organization not found: ${organizationId}`);
        return;
      }

      await this.elasticsearchService.indexOrganization(organization);
      this.logger.log(`Successfully indexed organization: ${organizationId}`);
    } catch (error) {
      this.logger.error(
        `Failed to index organization ${organizationId}:`,
        error,
      );
      throw error;
    }
  }

  async indexOrganizations(organizationIds: string[]): Promise<void> {
    const results = await Promise.allSettled(
      organizationIds.map((id) => this.indexOrganization(id)),
    );

    const failed = results.filter((r) => r.status === 'rejected');
    if (failed.length > 0) {
      this.logger.warn(
        `Failed to index ${failed.length} out of ${organizationIds.length} organizations`,
      );
    }
  }

  async removeOrganization(organizationId: string): Promise<void> {
    try {
      await this.elasticsearchService.deleteOrganization(organizationId);
      this.logger.log(
        `Successfully removed organization from index: ${organizationId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to remove organization ${organizationId}:`,
        error,
      );
      throw error;
    }
  }

  async reindexAllOrganizations(): Promise<{
    indexed: number;
    failed: number;
  }> {
    this.logger.log('Starting full organization reindexing...');
    let indexed = 0;
    let failed = 0;

    const batchSize = 100;
    let offset = 0;

    while (true) {
      const organizations = await this.organizationRepository.find({
        take: batchSize,
        skip: offset,
        relations: ['industry', 'logoFile'],
      });

      if (organizations.length === 0) break;

      for (const organization of organizations) {
        try {
          await this.elasticsearchService.indexOrganization(organization);
          indexed++;
        } catch (error) {
          this.logger.error(
            `Failed to index organization ${organization.id}:`,
            error,
          );
          failed++;
        }
      }

      offset += batchSize;
      this.logger.log(`Indexed ${indexed} organizations, failed: ${failed}`);
    }

    this.logger.log(
      `Reindexing complete. Indexed: ${indexed}, Failed: ${failed}`,
    );
    return { indexed, failed };
  }
}
