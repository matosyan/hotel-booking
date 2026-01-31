import { Module } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import 'winston-daily-rotate-file';

@Module({
  imports: [
    WinstonModule.forRoot({
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.colorize(),
            winston.format.printf(({ timestamp, level, message, ...meta }) => {
              const metaStr = Object.keys(meta).length
                ? JSON.stringify(meta)
                : '';
              return `${timestamp} [${level}]: ${message} ${metaStr}`;
            }),
          ),
        }),
        new winston.transports.DailyRotateFile({
          filename: 'logs/booking-errors-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          level: 'error',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
          maxSize: '20m',
          maxFiles: '14d',
        }),
      ],
    }),
  ],
  exports: [WinstonModule],
})
export class AppLoggerModule {}
