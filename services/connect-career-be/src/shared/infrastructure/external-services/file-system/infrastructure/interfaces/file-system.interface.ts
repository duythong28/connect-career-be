export interface FileUploadResult {
    publicId: string;
    url: string;
    secureUrl: string;
    width?: number;
    height?: number;
    format: string;
    resourceType: string;
    bytes: number;
}

export interface SignedUploadParams {
    public_id?: string;
    folder?: string;
    resource_type?: 'image' | 'video' | 'raw' | 'auto';
    transformation?: Record<string, unknown>;
    tags?: string[];
    context?: Record<string, unknown>;
}

export interface IFileSystemService {
    upload(file: Express.Multer.File, params?: SignedUploadParams): Promise<FileUploadResult>;
    uploadFromUrl(url: string, params?: SignedUploadParams): Promise<FileUploadResult>;
    delete(publicId: string, resourceType?: 'image' | 'video' | 'raw'): Promise<void>;
    generateSignedUploadUrl(params?: SignedUploadParams): {
        signature: string;
        timestamp: number;
        cloudName: string;
        apiKey: string;
        publicId: string;
        folder: string;
        resourceType: string;
    };
    generateAuthenticatedUrl(publicId: string, options?: {
        resourceType?: 'image' | 'video' | 'raw' | 'auto';
        transformation?: Record<string, unknown>;
        expiresAt?: number;
    }): string;
    getFileInfo(publicId: string, resourceType?: 'image' | 'video' | 'raw'): Promise<Record<string, unknown>>;
}