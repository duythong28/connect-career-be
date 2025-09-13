import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { File } from './domain/entities/file.entity';
import { FileRepository } from './domain/repositories/file.repository';
import { CloudinaryProvider } from './infrastructure/providers/cloudinary.provider';
import { FileManagementService } from './core/services/file-management.service';
import { FileUploadController } from './api/file-upload.controller';

@Module({
    imports: [
        TypeOrmModule.forFeature([File]),
        ConfigModule,
    ],
    providers: [
        FileRepository,
        {
            provide: 'IFileSystemService',
            useClass: CloudinaryProvider,
        },
        {
            provide: 'IFileRepository',
            useClass: FileRepository,
        },
        FileManagementService,
    ],
    controllers: [FileUploadController],
    exports: [FileManagementService, FileRepository],
})
export class FileSystemModule {}