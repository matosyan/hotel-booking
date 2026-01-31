import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SharedBullConfigurationFactory } from '@nestjs/bullmq';
import { QueueOptions } from 'bullmq';

@Injectable()
export class BullMQConfigService implements SharedBullConfigurationFactory {
  constructor(private readonly configService: ConfigService) {}

  createSharedConfiguration(): QueueOptions {
    return {
      connection: {
        host: this.configService.get<string>('redis.host'),
        port: this.configService.get<number>('redis.port'),
      },
    };
  }
}
