import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getQueueToken } from '@nestjs/bullmq';
import { ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import { BookingController } from './booking.controller';
import { BookingRepository } from './repositories';
import { BookingStatus } from './types';

describe('BookingController', () => {
  let controller: BookingController;
  let mockBookingRepository: jest.Mocked<BookingRepository>;
  let mockQueue: { add: jest.Mock };
  let mockConfigService: jest.Mocked<ConfigService>;

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

  beforeEach(async () => {
    mockBookingRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByIdempotencyKey: jest.fn(),
      getPaginated: jest.fn(),
      updateStatus: jest.fn(),
      incrementRetryCount: jest.fn(),
    } as any;

    mockQueue = {
      add: jest.fn(),
    };

    mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'retry.maxAttempts') return 5;
        if (key === 'retry.delayMs') return 1000;
        return undefined;
      }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BookingController],
      providers: [
        { provide: BookingRepository, useValue: mockBookingRepository },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: getQueueToken('booking-processing'), useValue: mockQueue },
      ],
    }).compile();

    controller = module.get<BookingController>(BookingController);
  });

  describe('createBooking', () => {
    const inputCreateBookingDto = {
      guestName: 'John Doe',
      guestEmail: 'john@example.com',
      checkIn: '2026-02-15',
      checkOut: '2026-02-20',
      roomType: 'deluxe',
    };

    it('should create a booking and queue a job', async () => {
      mockBookingRepository.findByIdempotencyKey.mockResolvedValue(null);
      mockBookingRepository.create.mockResolvedValue(mockBooking as any);

      const actualResult = await controller.createBooking(
        'test-key-123',
        inputCreateBookingDto,
      );

      expect(mockBookingRepository.findByIdempotencyKey).toHaveBeenCalledWith('test-key-123');
      expect(mockBookingRepository.create).toHaveBeenCalledWith({
        idempotencyKey: 'test-key-123',
        guestName: 'John Doe',
        guestEmail: 'john@example.com',
        checkIn: expect.any(Date),
        checkOut: expect.any(Date),
        roomType: 'deluxe',
      });
      expect(mockQueue.add).toHaveBeenCalledWith(
        'process-booking',
        { bookingId: 1 },
        {
          attempts: 5,
          backoff: { type: 'exponential', delay: 1000 },
        },
      );
      expect(actualResult.data.id).toBe(1);
      expect(actualResult.data.status).toBe(BookingStatus.PENDING);
    });

    it('should throw BadRequestException when idempotency key is missing', async () => {
      await expect(
        controller.createBooking('', inputCreateBookingDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException when idempotency key already exists', async () => {
      mockBookingRepository.findByIdempotencyKey.mockResolvedValue(mockBooking as any);

      await expect(
        controller.createBooking('test-key-123', inputCreateBookingDto),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('getBooking', () => {
    it('should return a booking by id', async () => {
      mockBookingRepository.findById.mockResolvedValue(mockBooking as any);

      const actualResult = await controller.getBooking(1);

      expect(mockBookingRepository.findById).toHaveBeenCalledWith(1);
      expect(actualResult.data.id).toBe(1);
      expect(actualResult.data.guestName).toBe('John Doe');
    });

    it('should throw NotFoundException when booking does not exist', async () => {
      mockBookingRepository.findById.mockResolvedValue(null);

      await expect(controller.getBooking(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('listBookings', () => {
    it('should return paginated bookings', async () => {
      const mockRows = [mockBooking, { ...mockBooking, id: 2 }];
      mockBookingRepository.getPaginated.mockResolvedValue({
        rows: mockRows as any,
        count: 25,
      });

      const actualResult = await controller.listBookings(1, 10);

      expect(mockBookingRepository.getPaginated).toHaveBeenCalledWith(1, 10);
      expect(actualResult.data).toHaveLength(2);
      expect(actualResult.meta.total).toBe(25);
      expect(actualResult.meta.page).toBe(1);
      expect(actualResult.meta.pageCount).toBe(3);
      expect(actualResult.meta.hasNext).toBe(true);
      expect(actualResult.meta.hasPrev).toBe(false);
    });

    it('should clamp page and limit values', async () => {
      mockBookingRepository.getPaginated.mockResolvedValue({
        rows: [],
        count: 0,
      });

      await controller.listBookings(-1, 200);

      expect(mockBookingRepository.getPaginated).toHaveBeenCalledWith(1, 100);
    });
  });
});
