import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import * as cookieParser from 'cookie-parser';
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const port = configService.get<string>('port');
  app.use(cookieParser.default());
  app.enableCors({
    origin: true,
    credentials: true,
  });
  app.listen(port || 8080, () => {
    console.log(`Server running on http://localhost:${port || 8080}/docs`);
  });
}
bootstrap();
