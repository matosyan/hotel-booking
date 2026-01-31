import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  VendorTimeoutError,
  VendorUnavailableError,
  VendorRejectionError,
} from './vendor-errors';

export interface VendorBookingRequest {
  guestName: string;
  guestEmail: string;
  checkIn: Date;
  checkOut: Date;
  roomType: string;
}

export interface VendorBookingResponse {
  id: string;
  status: string;
  confirmedAt: Date;
}

@Injectable()
export class MockVendorService {
  private readonly FAILURE_RATE = 0.3;
  private readonly MIN_DELAY_MS = 100;
  private readonly MAX_DELAY_MS = 2000;

  async createBooking(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    data: VendorBookingRequest,
  ): Promise<VendorBookingResponse> {
    await this.randomDelay();

    if (Math.random() < this.FAILURE_RATE) {
      throw this.randomError();
    }

    return {
      id: `VENDOR-${randomUUID()}`,
      status: 'confirmed',
      confirmedAt: new Date(),
    };
  }

  private async randomDelay(): Promise<void> {
    const delay = Math.floor(
      Math.random() * (this.MAX_DELAY_MS - this.MIN_DELAY_MS) +
        this.MIN_DELAY_MS,
    );
    return new Promise((resolve) => setTimeout(resolve, delay));
  }

  private randomError(): Error {
    const errors = [
      new VendorTimeoutError(),
      new VendorUnavailableError(),
      new VendorRejectionError(),
    ];
    return errors[Math.floor(Math.random() * errors.length)];
  }
}
