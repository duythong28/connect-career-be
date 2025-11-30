import { MiddlewareConsumer, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import { IdentityModule } from './modules/identity/identity.module';
import { JwtAuthGuard } from './modules/identity/api/guards/jwt-auth.guard';
import { FileSystemModule } from './shared/infrastructure/external-services/file-system/file-system.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { CvMakerModule } from './modules/cv-maker/cv-maker.module';
import { ProfileModule } from './modules/profile/profile.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { AIModule } from './shared/infrastructure/external-services/ai/ai.module';
import { RolesGuard } from './modules/identity/api/guards/roles.guard';
import { PermissionsGuard } from './modules/identity/api/guards/permissions.guard';
import { ApplicationsModule } from './modules/applications/applications.module';
import { UserModule } from './modules/user/user.module';
import { HiringPipelineModule } from './modules/hiring-pipeline/hiring-pipeline.module';
import { MockAIInterviewModule } from './modules/mock-ai-interview/mock-ai-interview.module';
import { BackofficeModule } from './modules/backoffice/backoffice.module';
import { ReportModule } from './modules/report/report.module';
import { CacheModule } from './shared/infrastructure/cache/cache.module';
import { WalletModule } from './modules/subscription/subscription.module';
import { MorganMiddleware } from './shared/kernel/middlewares/morgan.middleware';
import { WinstonModule } from 'nest-winston';
import winston from 'winston';
import { RecommendationModule } from './modules/recommendations/recommendation.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    CacheModule,
    WinstonModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const isDevelopment =
          configService.get<string>('NODE_ENV') === 'development';
        const logLevel =
          configService.get<string>('LOG_LEVEL') ||
          (isDevelopment ? 'debug' : 'info');

        return {
          level: logLevel,
          format: winston.format.combine(
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            winston.format.errors({ stack: true }),
            winston.format.splat(),
            winston.format.json(),
          ),
          defaultMeta: { service: 'connect-career-be' },
          transports: [
            // Console transport
            new winston.transports.Console({
              format: winston.format.combine(
                winston.format.colorize(),
                winston.format.printf(
                  ({ timestamp, level, message, context, trace, ...meta }) => {
                    const contextStr = context ? `[${String(context)}]` : '';
                    const metaStr = Object.keys(meta).length
                      ? JSON.stringify(meta)
                      : '';
                    return `${timestamp} ${level} ${contextStr} ${message} ${metaStr}`;
                  },
                ),
              ),
            }),
            // File transport for errors
            new winston.transports.File({
              filename: 'logs/error.log',
              level: 'error',
              format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json(),
              ),
            }),
            // File transport for all logs
            new winston.transports.File({
              filename: 'logs/combined.log',
              format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json(),
              ),
            }),
          ],
          exceptionHandlers: [
            new winston.transports.File({ filename: 'logs/exceptions.log' }),
          ],
          rejectionHandlers: [
            new winston.transports.File({ filename: 'logs/rejections.log' }),
          ],
        };
      },
      inject: [ConfigService],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DATABASE_HOST'),
        port: configService.get('DATABASE_PORT'),
        username: configService.get('DATABASE_USERNAME'),
        password: configService.get('DATABASE_PASSWORD'),
        database: configService.get('DATABASE_NAME'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: configService.get('NODE_ENV') === 'development',
        logging: false,
        logger: 'advanced-console',
      }),
      inject: [ConfigService],
    }),
    IdentityModule,
    NotificationsModule,
    FileSystemModule,
    CvMakerModule,
    ProfileModule,
    JobsModule,
    AIModule,
    ApplicationsModule,
    HiringPipelineModule,
    UserModule,
    MockAIInterviewModule,
    BackofficeModule,
    ReportModule,
    WalletModule,
    RecommendationModule
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(MorganMiddleware).forRoutes('*');
  }
}
