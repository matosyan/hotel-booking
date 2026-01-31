import { Injectable, Inject, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, QueueEvents } from 'bullmq';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { BookingRepository } from './repositories';
import { BookingStatus } from './types';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class BookingQueueEvents implements OnModuleInit {
  private queueEvents: QueueEvents;

  constructor(
    @InjectQueue('booking-processing') private readonly bookingQueue: Queue,
    private readonly bookingRepository: BookingRepository,
    private readonly configService: ConfigService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  onModuleInit() {
    const redisHost = this.configService.get<string>('redis.host');
    const redisPort = this.configService.get<number>('redis.port');

    this.queueEvents = new QueueEvents('booking-processing', {
      connection: {
        host: redisHost,
        port: redisPort,
      },
    });

    this.queueEvents.on('failed', async ({ jobId, failedReason }) => {
      const job = await this.bookingQueue.getJob(jobId);
      if (!job) return;

      const maxAttempts =
        this.configService.get<number>('retry.maxAttempts') ?? 5;
      if (job.attemptsMade >= maxAttempts) {
        const { bookingId } = job.data;

        this.logger.error(
          `Booking ${bookingId} exhausted all ${maxAttempts} retry attempts`,
          {
            bookingId,
            finalError: failedReason,
          },
        );

        await this.bookingRepository.updateStatus(
          bookingId,
          BookingStatus.FAILED,
          {
            failureReason: failedReason,
          },
        );
      }
    });
  }
}
