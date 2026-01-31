import { Test, TestingModule } from '@nestjs/testing';
import { Sequelize } from 'sequelize-typescript';
import { BookingRepository } from './booking.repository';
import { BookingStatus } from '../types';

describe('BookingRepository', () => {
  let repository: BookingRepository;
  let mockSequelizeRepository: {
    create: jest.Mock;
    findByPk: jest.Mock;
    findOne: jest.Mock;
    findAndCountAll: jest.Mock;
    update: jest.Mock;
    increment: jest.Mock;
  };
  let mockSequelize: { getRepository: jest.Mock };

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
    mockSequelizeRepository = {
      create: jest.fn(),
      findByPk: jest.fn(),
      findOne: jest.fn(),
      findAndCountAll: jest.fn(),
      update: jest.fn(),
      increment: jest.fn(),
    };

    mockSequelize = {
      getRepository: jest.fn().mockReturnValue(mockSequelizeRepository),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingRepository,
        { provide: Sequelize, useValue: mockSequelize },
      ],
    }).compile();

    repository = module.get<BookingRepository>(BookingRepository);
  });

  describe('create', () => {
    it('should create a booking with pending status', async () => {
      const inputData = {
        idempotencyKey: 'test-key-123',
        guestName: 'John Doe',
        guestEmail: 'john@example.com',
        checkIn: new Date('2026-02-15'),
        checkOut: new Date('2026-02-20'),
        roomType: 'deluxe',
      };
      mockSequelizeRepository.create.mockResolvedValue(mockBooking);

      const actualResult = await repository.create(inputData);

      expect(mockSequelizeRepository.create).toHaveBeenCalledWith({
        ...inputData,
        status: BookingStatus.PENDING,
        retryCount: 0,
      });
      expect(actualResult).toEqual(mockBooking);
    });
  });

  describe('findById', () => {
    it('should find a booking by id', async () => {
      mockSequelizeRepository.findByPk.mockResolvedValue(mockBooking);

      const actualResult = await repository.findById(1);

      expect(mockSequelizeRepository.findByPk).toHaveBeenCalledWith(1);
      expect(actualResult).toEqual(mockBooking);
    });

    it('should return null when booking not found', async () => {
      mockSequelizeRepository.findByPk.mockResolvedValue(null);

      const actualResult = await repository.findById(999);

      expect(actualResult).toBeNull();
    });
  });

  describe('findByIdempotencyKey', () => {
    it('should find a booking by idempotency key', async () => {
      mockSequelizeRepository.findOne.mockResolvedValue(mockBooking);

      const actualResult = await repository.findByIdempotencyKey('test-key-123');

      expect(mockSequelizeRepository.findOne).toHaveBeenCalledWith({
        where: { idempotencyKey: 'test-key-123' },
      });
      expect(actualResult).toEqual(mockBooking);
    });
  });

  describe('getPaginated', () => {
    it('should return paginated results', async () => {
      const mockRows = [mockBooking];
      mockSequelizeRepository.findAndCountAll.mockResolvedValue({
        rows: mockRows,
        count: 1,
      });

      const actualResult = await repository.getPaginated(1, 10);

      expect(mockSequelizeRepository.findAndCountAll).toHaveBeenCalledWith({
        offset: 0,
        limit: 10,
        order: [['createdAt', 'DESC']],
      });
      expect(actualResult.rows).toEqual(mockRows);
      expect(actualResult.count).toBe(1);
    });

    it('should calculate correct offset for page 2', async () => {
      mockSequelizeRepository.findAndCountAll.mockResolvedValue({
        rows: [],
        count: 0,
      });

      await repository.getPaginated(2, 10);

      expect(mockSequelizeRepository.findAndCountAll).toHaveBeenCalledWith({
        offset: 10,
        limit: 10,
        order: [['createdAt', 'DESC']],
      });
    });
  });

  describe('updateStatus', () => {
    it('should update booking status', async () => {
      mockSequelizeRepository.update.mockResolvedValue([1]);

      await repository.updateStatus(1, BookingStatus.CONFIRMED);

      expect(mockSequelizeRepository.update).toHaveBeenCalledWith(
        { status: BookingStatus.CONFIRMED },
        { where: { id: 1 } },
      );
    });

    it('should update status with additional data', async () => {
      mockSequelizeRepository.update.mockResolvedValue([1]);

      await repository.updateStatus(1, BookingStatus.CONFIRMED, {
        vendorBookingId: 'VENDOR-123',
      });

      expect(mockSequelizeRepository.update).toHaveBeenCalledWith(
        { status: BookingStatus.CONFIRMED, vendorBookingId: 'VENDOR-123' },
        { where: { id: 1 } },
      );
    });

    it('should update status with failure reason', async () => {
      mockSequelizeRepository.update.mockResolvedValue([1]);

      await repository.updateStatus(1, BookingStatus.FAILED, {
        failureReason: 'Vendor timeout',
      });

      expect(mockSequelizeRepository.update).toHaveBeenCalledWith(
        { status: BookingStatus.FAILED, failureReason: 'Vendor timeout' },
        { where: { id: 1 } },
      );
    });
  });

  describe('incrementRetryCount', () => {
    it('should increment retry count', async () => {
      mockSequelizeRepository.increment.mockResolvedValue([1]);

      await repository.incrementRetryCount(1);

      expect(mockSequelizeRepository.increment).toHaveBeenCalledWith(
        'retryCount',
        { where: { id: 1 } },
      );
    });
  });
});
