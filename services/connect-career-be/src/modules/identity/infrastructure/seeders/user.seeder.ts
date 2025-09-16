import { Inject, Injectable, Logger } from "@nestjs/common";
import * as identityRepository from '../../domain/repository/identity.repository';
import * as bcrypt from 'bcrypt';
import { User, UserStatus } from "../../domain/entities";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";


@Injectable()
export class UserSeeder { 
    private readonly logger = new Logger(UserSeeder.name);
    constructor(
        @Inject('IUserRepository')
        private readonly userRepository: identityRepository.IUserRepository, 
        @Inject('IRoleRepository')
        private readonly roleRepository: identityRepository.IRoleRepository,
        @InjectRepository(User)
        private readonly userEntityRepository: Repository<User>
    ) {}

    async seed(): Promise<void> {
        this.logger.log('Starting admin seeders (users)...');
        await this.createDefaultAdmin();
    }
    private async createDefaultAdmin(): Promise<void> {
        const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@connect-career.com';
        const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'Admin@123456';
        
        const existingAdmin = await this.userRepository.findByEmail(adminEmail);
        if (existingAdmin) {
            this.logger.log('Admin user already exists: ${adminEmail}');
            return;
        }

        const superAdminRole = await this.roleRepository.findByName('super_admin');
        if (!superAdminRole) {
            this.logger.error('super_admin role not found. Please run roles seeder first.');
            return;
        }

        const passwordHash = await bcrypt.hash(adminPassword, 12);

        const adminUser = await this.userRepository.create({
            email: adminEmail,
            username: 'admin',
            firstName: 'System',
            lastName: 'Administrator',
            fullName: 'System Administrator',
            passwordHash,
            emailVerified: true,
            status: UserStatus.ACTIVE,
            isActive: true,
        });

        if (!adminUser.roles) {
            adminUser.roles = [];
        }

        adminUser.roles.push(superAdminRole);
        await this.userEntityRepository.save(adminUser);        
        this.logger.log(`Created default admin user: ${adminEmail}`);
        this.logger.log(`Default password: ${adminPassword}`);
        this.logger.log(`Please change the default password after first login!`);
    }
}