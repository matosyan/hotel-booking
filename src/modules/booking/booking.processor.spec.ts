import { Test, TestingModule } from '@nestjs/testing';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Job } from 'bullmq';
import { BookingProcessor, BookingJobData } from './booking.processor';
import { BookingRepository } from './repositories';
import { BookingStatus } from './types';
import { MockVendorService } from '../../shared/services';

describe('BookingProcessor', () => {
  let processor: BookingProcessor;
  let mockBookingRepository: jest.Mocked<BookingRepository>;
  let mockVendorService: jest.Mocked<MockVendorService>;
  let mockLogger: { info: jest.Mock; error: jest.Mock };

  const mockBooking = {
    id: 1,
    idempotencyKey: 'test-key-123',
    status: BookingStatus.PENDING,
    vendorBookingId: null,
    guestName: 'John Doe',
    guestEmail: 'john@example.com',
    checkIn: new Date('2026-02-15'),
    checkOut: new Date('2026-02-20'),
    roomType: 'deluxe',
    failureReason: null,
    retryCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockVendorResponse = {
    id: 'VENDOR-abc123',
    status: 'confirmed',
    confirmedAt: new Date(),
  };

  beforeEach(async () => {
    mockBookingRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByIdempotencyKey: jest.fn(),
      getPaginated: jest.fn(),
      updateStatus: jest.fn(),
      incrementRetryCount: jest.fn(),
    } as any;

    mockVendorService = {
      createBooking: jest.fn(),
    } as any;

    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingProcessor,
        { provide: BookingRepository, useValue: mockBookingRepository },
        { provide: MockVendorService, useValue: mockVendorService },
        { provide: WINSTON_MODULE_PROVIDER, useValue: mockLogger },
      ],
    }).compile();

    processor = module.get<BookingProcessor>(BookingProcessor);
  });

  describe('process', () => {
    const createMockJob = (data: BookingJobData, attemptsMade = 0): Job<BookingJobData> =>
      ({
        data,
        attemptsMade,
        opts: { attempts: 5 },
      }) as any;

    it('should process booking successfully and update status to confirmed', async () => {
      const inputJob = createMockJob({ bookingId: 1 });
      mockBookingRepository.findById.mockResolvedValue(mockBooking as any);
      mockVendorService.createBooking.mockResolvedValue(mockVendorResponse);

      await processor.process(inputJob);

      expect(mockBookingRepository.findById).toHaveBeenCalledWith(1);
      expect(mockVendorService.createBooking).toHaveBeenCalledWith({
        guestName: 'John Doe',
        guestEmail: 'john@example.com',
        checkIn: mockBooking.checkIn,
        checkOut: mockBooking.checkOut,
        roomType: 'deluxe',
      });
      expect(mockBookingRepository.updateStatus).toHaveBeenCalledWith(
        1,
        BookingStatus.CONFIRMED,
        { vendorBookingId: 'VENDOR-abc123' },
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('confirmed with vendor ID'),
      );
    });

    it('should log error and return early when booking not found', async () => {
      const inputJob = createMockJob({ bookingId: 999 });
      mockBookingRepository.findById.mockResolvedValue(null);

      await processor.process(inputJob);

      expect(mockLogger.error).toHaveBeenCalledWith('Booking 999 not found');
      expect(mockVendorService.createBooking).not.toHaveBeenCalled();
    });

    it('should increment retry count and throw error on vendor failure', async () => {
      const inputJob = createMockJob({ bookingId: 1 });
      const vendorError = new Error('Vendor timeout');
      mockBookingRepository.findById.mockResolvedValue(mockBooking as any);
      mockVendorService.createBooking.mockRejectedValue(vendorError);

      await expect(processor.process(inputJob)).rejects.toThrow('Vendor timeout');

      expect(mockBookingRepository.incrementRetryCount).toHaveBeenCalledWith(1);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('failed on attempt'),
        expect.objectContaining({
          bookingId: 1,
          attempt: 1,
          error: 'Vendor timeout',
        }),
      );
    });

    it('should log correct attempt number on retry', async () => {
      const inputJob = createMockJob({ bookingId: 1 }, 2); // 3rd attempt
      const vendorError = new Error('Vendor unavailable');
      mockBookingRepository.findById.mockResolvedValue(mockBooking as any);
      mockVendorService.createBooking.mockRejectedValue(vendorError);

      await expect(processor.process(inputJob)).rejects.toThrow();

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Processing booking 1, attempt 3',
      );
    });
  });

  describe('onFailed', () => {
    it('should log failure with retry info', () => {
      const inputJob = {
        data: { bookingId: 1 },
        attemptsMade: 2,
        opts: { attempts: 5 },
      } as Job<BookingJobData>;
      const inputError = new Error('Test error');

      processor.onFailed(inputJob, inputError);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Job failed for booking 1',
        expect.objectContaining({
          bookingId: 1,
          attempt: 2,
          error: 'Test error',
          willRetry: true,
        }),
      );
    });

    it('should indicate no retry when max attempts reached', () => {
      const inputJob = {
        data: { bookingId: 1 },
        attemptsMade: 5,
        opts: { attempts: 5 },
      } as Job<BookingJobData>;
      const inputError = new Error('Final failure');

      processor.onFailed(inputJob, inputError);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Job failed for booking 1',
        expect.objectContaining({
          willRetry: false,
        }),
      );
    });
  });

  describe('onCompleted', () => {
    it('should log job completion', () => {
      const inputJob = {
        data: { bookingId: 1 },
      } as Job<BookingJobData>;

      processor.onCompleted(inputJob);

      expect(mockLogger.info).toHaveBeenCalledWith('Job completed for booking 1');
    });
  });
});
