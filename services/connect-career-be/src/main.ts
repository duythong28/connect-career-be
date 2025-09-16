import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import * as cookieParser from 'cookie-parser';
import { DefaultRolesSeeder } from './modules/identity/infrastructure/seeders/default-roles.seeder';
import { UserSeeder } from './modules/identity/infrastructure/seeders/user.seeder';
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  try {
    const rolesSeeder = app.get(DefaultRolesSeeder);
    await rolesSeeder.seed();

    const userSeeder = app.get(UserSeeder);
    await userSeeder.seed();

  } catch (error) {
    console.error('Failed to run admin seeders:', error);
  }
  const port = configService.get<string>('port');
  app.use(cookieParser.default());
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: true,
    credentials: true,
  });
  app.listen(port || 8080, () => {
    console.log(`Server running on http://localhost:${port || 8080}/docs`);
  });
}
bootstrap();
