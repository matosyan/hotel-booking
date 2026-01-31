import { BookingStatus } from '../types';

export class BookingResponseDto {
  id: number;
  idempotencyKey: string;
  status: BookingStatus;
  vendorBookingId: string | null;
  guestName: string;
  guestEmail: string;
  checkIn: string;
  checkOut: string;
  roomType: string;
  failureReason: string | null;
  retryCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export class ResponseDataDto<T> {
  data: T;
}

export class PaginatedMetaDto {
  count: number;
  total: number;
  page: number;
  pageCount: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export class PaginatedDataDto<T> {
  data: T[];
  meta: PaginatedMetaDto;
}
