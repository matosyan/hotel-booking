import { BookingStatus } from '../modules/booking/types';
import { Table, Column, Model, DataType } from 'sequelize-typescript';

@Table({
  tableName: 'bookings',
  timestamps: true,
})
export class Booking extends Model {
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  })
  id: number;

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
    unique: true,
  })
  idempotencyKey: string;

  @Column({
    type: DataType.STRING(20),
    allowNull: false,
    defaultValue: BookingStatus.PENDING,
  })
  status: BookingStatus;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
  })
  vendorBookingId: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
  })
  guestName: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
  })
  guestEmail: string;

  @Column({
    type: DataType.DATEONLY,
    allowNull: false,
  })
  checkIn: Date;

  @Column({
    type: DataType.DATEONLY,
    allowNull: false,
  })
  checkOut: Date;

  @Column({
    type: DataType.STRING(100),
    allowNull: false,
  })
  roomType: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  failureReason: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
  })
  retryCount: number;
}
