import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
// import { DefaultRolesSeeder } from './modules/identity/infrastructure/seeders/default-roles.seeder';
// import { UserSeeder } from './modules/identity/infrastructure/seeders/user.seeder';
// import { IndustrySeeder } from './modules/profile/infrastructure/seeders/industry.seeder';
// import { LinkedInCompanySeeder } from './modules/profile/infrastructure/seeders/linkedin-company.seeder';
// import { LinkedInPeopleSeeder } from './modules/profile/infrastructure/seeders/linkedin-people.seeder';
// import { LinkedInJobsSeeder } from './modules/jobs/infrastructure/seeders/linkedin-jobs.seeder';
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  try {
    // Uncomment the seeders you want to run:
    // 1. Seed roles and permissions (run first)
    // const rolesSeeder = app.get(DefaultRolesSeeder);
    // await rolesSeeder.seed();
    // 2. Seed users
    // const userSeeder = app.get(UserSeeder);
    // await userSeeder.seed();
    // await userSeeder.verifyAllUserEmails();
    // 3. Seed industries
    // const industrySeeder = app.get(IndustrySeeder);
    // await industrySeeder.seed();
    // 4. Seed companies
    // const companySeeder = app.get(LinkedInCompanySeeder);
    // await companySeeder.seedFromFile(
    //   'src/modules/profile/infrastructure/seeders/linkedin_company_information_big_tech.json',
    // );
    // 5. Seed people profiles
    // const peopleSeeder = app.get(LinkedInPeopleSeeder);
    // await peopleSeeder.seedFromFile(
    //   'src/modules/profile/infrastructure/seeders/linkedin_people_profiles.json',
    // );
    // 6. Seed jobs (will auto-create organizations and HR users)
    // const jobsSeeder = app.get(LinkedInJobsSeeder);
    // await jobsSeeder.seedAllFiles();
  } catch (error: unknown) {
    console.error(
      'Failed to run seeders:',
      error instanceof Error ? error.message : String(error),
    );
  }
  const port = configService.get<string>('port');
  app.use(cookieParser());
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: true,
    credentials: true,
  });
  await app.listen(port || 8080);
  console.log(`Server running on http://localhost:${port || 8080}/docs`);
}
void bootstrap();
