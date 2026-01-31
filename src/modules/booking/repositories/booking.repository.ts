import { Injectable } from '@nestjs/common';
import { Sequelize } from 'sequelize-typescript';
import { Booking } from '../../../models/booking.model';
import { BookingStatus } from '../types';

@Injectable()
export class BookingRepository {
  private readonly repository;

  constructor(private readonly sequelize: Sequelize) {
    this.repository = this.sequelize.getRepository(Booking);
  }

  async create(data: {
    idempotencyKey: string;
    guestName: string;
    guestEmail: string;
    checkIn: Date;
    checkOut: Date;
    roomType: string;
  }): Promise<Booking> {
    return this.repository.create({
      ...data,
      status: BookingStatus.PENDING,
      retryCount: 0,
    });
  }

  async findById(id: number): Promise<Booking | null> {
    return this.repository.findByPk(id);
  }

  async findByIdempotencyKey(idempotencyKey: string): Promise<Booking | null> {
    return this.repository.findOne({ where: { idempotencyKey } });
  }

  async getPaginated(
    page: number,
    limit: number,
  ): Promise<{ rows: Booking[]; count: number }> {
    const offset = (page - 1) * limit;
    return this.repository.findAndCountAll({
      offset,
      limit,
      order: [['createdAt', 'DESC']],
    });
  }

  async updateStatus(
    id: number,
    status: BookingStatus,
    additionalData?: {
      vendorBookingId?: string;
      failureReason?: string;
      retryCount?: number;
    },
  ): Promise<void> {
    await this.repository.update(
      { status, ...additionalData },
      { where: { id } },
    );
  }

  async incrementRetryCount(id: number): Promise<void> {
    await this.repository.increment('retryCount', { where: { id } });
  }
}
