import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BookingController } from './booking.controller';
import { BookingProcessor } from './booking.processor';
import { BookingQueueEvents } from './booking.events';
import { BookingRepository } from './repositories';
import { MockVendorService } from '../../shared/services';
import { BOOKING_PROCESSING_QUEUE } from './constants';

@Module({
  imports: [
    BullModule.registerQueue({
      name: BOOKING_PROCESSING_QUEUE,
    }),
  ],
  controllers: [BookingController],
  providers: [
    BookingRepository,
    BookingProcessor,
    BookingQueueEvents,
    MockVendorService,
  ],
})
export class BookingModule {}
