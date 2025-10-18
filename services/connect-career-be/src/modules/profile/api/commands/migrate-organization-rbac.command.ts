// services/connect-career-be/src/modules/profile/api/commands/migrate-organization-rbac.command.ts
import { Command, CommandRunner } from 'nest-commander';
import { OrganizationRBACMigrationService } from '../../infrastructure/organization-rbac-migration.service';

@Command({
  name: 'migrate-organization-rbac',
  description: 'Migrate existing organizations to RBAC system',
})
export class MigrateOrganizationRBACCommand extends CommandRunner {
  constructor(
    private readonly migrationService: OrganizationRBACMigrationService,
  ) {
    super();
  }

  async run(): Promise<void> {
    console.log('🚀 Starting Organization RBAC Migration...\n');

    try {
      // Check current status
      const status = await this.migrationService.getMigrationStatus();
      console.log('📊 Current Status:');
      console.log(`   Total Organizations: ${status.totalOrganizations}`);
      console.log(
        `   Organizations with Roles: ${status.organizationsWithRoles}`,
      );
      console.log(
        `   Organizations with Members: ${status.organizationsWithMembers}\n`,
      );

      // Run migration
      await this.migrationService.migrateAllOrganizations();

      // Check final status
      const finalStatus = await this.migrationService.getMigrationStatus();
      console.log('\n📊 Final Status:');
      console.log(`   Total Organizations: ${finalStatus.totalOrganizations}`);
      console.log(
        `   Organizations with Roles: ${finalStatus.organizationsWithRoles}`,
      );
      console.log(
        `   Organizations with Members: ${finalStatus.organizationsWithMembers}`,
      );

      console.log('\n✅ Migration completed successfully!');
    } catch (error) {
      console.error('\n❌ Migration failed:', error.message);
      process.exit(1);
    }
  }
}
