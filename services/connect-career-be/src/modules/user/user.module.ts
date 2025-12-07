import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role, User } from '../identity/domain/entities';
import { UserController } from './api/controllers/user.controller';
import { UserRepository } from '../identity/infrastructure/repositories';
import { UserBackOfficeController } from './api/controllers/user.back-office.controller';
import { IdentityModule } from '../identity/identity.module';
import { UserBackOfficeService } from './api/services/user.back-office.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Role]), IdentityModule],
  controllers: [UserController, UserBackOfficeController],
  providers: [
    {
      provide: 'IUserRepository',
      useClass: UserRepository,
    },
    UserBackOfficeService,
  ],
})
export class UserModule {}
