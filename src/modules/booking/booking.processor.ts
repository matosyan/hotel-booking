import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Inject } from '@nestjs/common';
import { Job } from 'bullmq';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { BookingRepository } from './repositories';
import { BookingStatus } from './types';
import { MockVendorService } from '../../shared/services';

export interface BookingJobData {
  bookingId: number;
}

@Processor('booking-processing')
export class BookingProcessor extends WorkerHost {
  constructor(
    private readonly bookingRepository: BookingRepository,
    private readonly mockVendorService: MockVendorService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {
    super();
  }

  async process(job: Job<BookingJobData>): Promise<void> {
    const { bookingId } = job.data;
    const attemptNumber = job.attemptsMade + 1;

    this.logger.info(
      `Processing booking ${bookingId}, attempt ${attemptNumber}`,
    );

    const booking = await this.bookingRepository.findById(bookingId);
    if (!booking) {
      this.logger.error(`Booking ${bookingId} not found`);
      return;
    }

    try {
      const vendorResponse = await this.mockVendorService.createBooking({
        guestName: booking.guestName,
        guestEmail: booking.guestEmail,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        roomType: booking.roomType,
      });

      await this.bookingRepository.updateStatus(
        bookingId,
        BookingStatus.CONFIRMED,
        {
          vendorBookingId: vendorResponse.id,
        },
      );

      this.logger.info(
        `Booking ${bookingId} confirmed with vendor ID: ${vendorResponse.id}`,
      );
    } catch (error) {
      await this.bookingRepository.incrementRetryCount(bookingId);

      this.logger.error(
        `Booking ${bookingId} failed on attempt ${attemptNumber}`,
        {
          bookingId,
          attempt: attemptNumber,
          error: error.message,
          stack: error.stack,
        },
      );

      throw error;
    }
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<BookingJobData>, error: Error) {
    const { bookingId } = job.data;
    const attemptNumber = job.attemptsMade;

    this.logger.error(`Job failed for booking ${bookingId}`, {
      bookingId,
      attempt: attemptNumber,
      error: error.message,
      willRetry: attemptNumber < (job.opts.attempts ?? 0),
    });
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<BookingJobData>) {
    this.logger.info(`Job completed for booking ${job.data.bookingId}`);
  }
}
