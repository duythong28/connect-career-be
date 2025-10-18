import { Module } from '@nestjs/common';
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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
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
        logging: configService.get('NODE_ENV') === 'development',
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
export class AppModule {}
