import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { ConfigService } from '@nestjs/config';

export const createWinstonLogger = (configService: ConfigService) => {
  const isDevelopment = configService.get<string>('NODE_ENV') === 'development';
  const logLevel = configService.get<string>('LOG_LEVEL') || (isDevelopment ? 'debug' : 'info');

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  return WinstonModule.createLogger({
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
              const contextStr = context ? `[${String(context) as string}]` : '';
              const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
              return `${timestamp} ${level} ${contextStr} ${message} ${metaStr}`;
            },
          ),
        ),
      }),
      new winston.transports.File({
        filename: 'logs/combined.log',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json(),
        ),
      }),
    ],
    // Filter out TypeORM logs
    exceptionHandlers: [
      new winston.transports.File({ filename: 'logs/exceptions.log' }),
    ],
    rejectionHandlers: [
      new winston.transports.File({ filename: 'logs/rejections.log' }),
    ],
  });
};