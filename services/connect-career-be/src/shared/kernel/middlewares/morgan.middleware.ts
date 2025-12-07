import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import morgan from 'morgan';
import { createStream } from 'rotating-file-stream';
import { join } from 'path';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MorganMiddleware implements NestMiddleware {
  private morganInstance: any;

  constructor(private readonly configService: ConfigService) {
    const isDevelopment = this.configService.get('NODE_ENV') === 'development';

    // Create rotating file stream for access logs
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    const accessLogStream = createStream('access.log', {
      interval: '1d',
      path: join(process.cwd(), 'logs'),
      maxSize: '10M',
      maxFiles: 14,
    });

    // Morgan format
    const format = isDevelopment
      ? 'dev'
      : ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"';

    this.morganInstance = morgan(format, {
      stream: isDevelopment
        ? process.stdout
        : {
            write: (message: string) => {
              accessLogStream.write(message);
            },
          },
      skip: (req: Request) => {
        // Skip health check endpoints
        return req.url === '/health' || req.url === '/api/health';
      },
    });
  }

  use(req: Request, res: Response, next: NextFunction) {
    this.morganInstance(req, res, next);
  }
}
