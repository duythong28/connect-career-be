import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import * as cookieParser from 'cookie-parser';
import { DefaultRolesSeeder } from './modules/identity/infrastructure/seeders/default-roles.seeder';
import { UserSeeder } from './modules/identity/infrastructure/seeders/user.seeder';
import { IndustrySeeder } from './modules/profile/infrastructure/seeders/industry.seeder';
import { LinkedInCompanySeeder } from './modules/profile/infrastructure/seeders/linkedin-company.seeder';
import { LinkedInPeopleSeeder } from './modules/profile/infrastructure/seeders/linkedin-people.seeder';
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  try {
    // const rolesSeeder = app.get(DefaultRolesSeeder);
    // await rolesSeeder.seed();
    // const userSeeder = app.get(UserSeeder);
    // await userSeeder.seed();
    // await userSeeder.verifyAllUserEmails();
    // const industrySeeder = app.get(IndustrySeeder);
    // await industrySeeder.seed();
    // const companySeeder = app.get(LinkedInCompanySeeder);
    // await companySeeder.seedFromFile(
    //   'src/modules/profile/infrastructure/seeders/linkedin_company_information.json',
    // );
    // const peopleSeeder = app.get(LinkedInPeopleSeeder);
    // await peopleSeeder.seedFromFile(
    //   'src/modules/profile/infrastructure/seeders/linkedin_people_profiles.json',
    // );
  } catch (error) {
    console.error('Failed to run admin seeders:', error);
  }
  const port = configService.get<string>('port');
  app.use(cookieParser.default());
  app.setGlobalPrefix('api');
  // 2f61ee85-9858-48db-92e8-f1d81c2440bb
  app.enableCors({
    origin: true,
    credentials: true,
  });
  app.listen(port || 8080, () => {
    console.log(`Server running on http://localhost:${port || 8080}/docs`);
  });
}
bootstrap();
