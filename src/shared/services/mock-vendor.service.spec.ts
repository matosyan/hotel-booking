import { Test, TestingModule } from '@nestjs/testing';
import {
  MockVendorService,
  VendorBookingRequest,
} from './mock-vendor.service';
import {
  VendorTimeoutError,
  VendorUnavailableError,
  VendorRejectionError,
} from './vendor-errors';

describe('MockVendorService', () => {
  let service: MockVendorService;

  const inputBookingRequest: VendorBookingRequest = {
    guestName: 'John Doe',
    guestEmail: 'john@example.com',
    checkIn: new Date('2026-02-15'),
    checkOut: new Date('2026-02-20'),
    roomType: 'deluxe',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MockVendorService],
    }).compile();

    service = module.get<MockVendorService>(MockVendorService);
  });

  describe('createBooking', () => {
    it('should return a vendor booking response on success', async () => {
      // Mock Math.random to always return success (> 0.3)
      jest.spyOn(Math, 'random').mockReturnValue(0.5);

      const actualResult = await service.createBooking(inputBookingRequest);

      expect(actualResult).toHaveProperty('id');
      expect(actualResult.id).toMatch(/^VENDOR-/);
      expect(actualResult.status).toBe('confirmed');
      expect(actualResult.confirmedAt).toBeInstanceOf(Date);

      jest.restoreAllMocks();
    });

    it('should throw an error when random value is below failure rate', async () => {
      // Mock Math.random: 1st for delay, 2nd for failure check, 3rd for error selection
      jest
        .spyOn(Math, 'random')
        .mockReturnValueOnce(0) // For delay (minimum)
        .mockReturnValueOnce(0.1) // For failure check (< 0.3 = fail)
        .mockReturnValueOnce(0); // For error selection (index 0)

      await expect(service.createBooking(inputBookingRequest)).rejects.toThrow(
        VendorTimeoutError,
      );

      jest.restoreAllMocks();
    });

    it('should throw VendorUnavailableError when selected', async () => {
      // Mock Math.random: 1st for delay, 2nd for failure check, 3rd for error selection
      jest
        .spyOn(Math, 'random')
        .mockReturnValueOnce(0) // For delay (minimum)
        .mockReturnValueOnce(0.1) // For failure check (< 0.3 = fail)
        .mockReturnValueOnce(0.4); // For error selection (index 1)

      await expect(service.createBooking(inputBookingRequest)).rejects.toThrow(
        VendorUnavailableError,
      );

      jest.restoreAllMocks();
    });

    it('should throw VendorRejectionError when selected', async () => {
      // Mock Math.random: 1st for delay, 2nd for failure check, 3rd for error selection
      jest
        .spyOn(Math, 'random')
        .mockReturnValueOnce(0) // For delay (minimum)
        .mockReturnValueOnce(0.1) // For failure check (< 0.3 = fail)
        .mockReturnValueOnce(0.8); // For error selection (index 2)

      await expect(service.createBooking(inputBookingRequest)).rejects.toThrow(
        VendorRejectionError,
      );

      jest.restoreAllMocks();
    });

    it('should have delay between 100-2000ms', async () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.5);
      const startTime = Date.now();

      await service.createBooking(inputBookingRequest);

      const elapsedTime = Date.now() - startTime;
      // With mocked random at 0.5, delay should be around 1050ms
      // Allow some tolerance for test execution
      expect(elapsedTime).toBeGreaterThanOrEqual(100);
      expect(elapsedTime).toBeLessThanOrEqual(2500);

      jest.restoreAllMocks();
    });
  });
});

describe('VendorErrors', () => {
  it('VendorTimeoutError should have correct message and name', () => {
    const error = new VendorTimeoutError();

    expect(error.message).toBe('Vendor API timed out');
    expect(error.name).toBe('VendorTimeoutError');
    expect(error).toBeInstanceOf(Error);
  });

  it('VendorUnavailableError should have correct message and name', () => {
    const error = new VendorUnavailableError();

    expect(error.message).toBe('Vendor service unavailable (503)');
    expect(error.name).toBe('VendorUnavailableError');
    expect(error).toBeInstanceOf(Error);
  });

  it('VendorRejectionError should have correct message and name', () => {
    const error = new VendorRejectionError();

    expect(error.message).toBe('Booking rejected by vendor');
    expect(error.name).toBe('VendorRejectionError');
    expect(error).toBeInstanceOf(Error);
  });
});
