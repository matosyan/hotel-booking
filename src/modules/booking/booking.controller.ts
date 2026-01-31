import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Headers,
  Query,
  ParseIntPipe,
  HttpStatus,
  HttpCode,
  ConflictException,
  NotFoundException,
  BadRequestException,
  DefaultValuePipe,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { BookingRepository } from './repositories';
import {
  CreateBookingDto,
  ResponseDataDto,
  PaginatedDataDto,
  BookingResponseDto,
} from './dto';
import { BookingJobData } from './booking.processor';

@Controller('bookings')
export class BookingController {
  constructor(
    private readonly bookingRepository: BookingRepository,
    private readonly configService: ConfigService,
    @InjectQueue('booking-processing') private readonly bookingQueue: Queue,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createBooking(
    @Headers('x-idempotency-key') idempotencyKey: string,
    @Body() createBookingDto: CreateBookingDto,
  ): Promise<ResponseDataDto<BookingResponseDto>> {
    if (!idempotencyKey) {
      throw new BadRequestException('X-Idempotency-Key header is required');
    }

    const existingBooking =
      await this.bookingRepository.findByIdempotencyKey(idempotencyKey);
    if (existingBooking) {
      throw new ConflictException(
        'Booking with this idempotency key already exists',
      );
    }

    const booking = await this.bookingRepository.create({
      idempotencyKey,
      guestName: createBookingDto.guestName,
      guestEmail: createBookingDto.guestEmail,
      checkIn: new Date(createBookingDto.checkIn),
      checkOut: new Date(createBookingDto.checkOut),
      roomType: createBookingDto.roomType,
    });

    const maxAttempts = this.configService.get<number>('retry.maxAttempts');
    const delayMs = this.configService.get<number>('retry.delayMs');

    await this.bookingQueue.add(
      'process-booking',
      { bookingId: booking.id } as BookingJobData,
      {
        attempts: maxAttempts,
        backoff: {
          type: 'exponential',
          delay: delayMs,
        },
      },
    );

    return { data: this.toResponseDto(booking) };
  }

  @Get(':id')
  async getBooking(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ResponseDataDto<BookingResponseDto>> {
    const booking = await this.bookingRepository.findById(id);
    if (!booking) {
      throw new NotFoundException(`Booking with ID ${id} not found`);
    }

    return { data: this.toResponseDto(booking) };
  }

  @Get()
  async listBookings(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ): Promise<PaginatedDataDto<BookingResponseDto>> {
    if (page < 1) page = 1;
    if (limit < 1) limit = 1;
    if (limit > 100) limit = 100;

    const { rows, count } = await this.bookingRepository.getPaginated(
      page,
      limit,
    );
    const pageCount = Math.ceil(count / limit);

    return {
      data: rows.map((booking) => this.toResponseDto(booking)),
      meta: {
        count: rows.length,
        total: count,
        page,
        pageCount,
        hasNext: page < pageCount,
        hasPrev: page > 1,
      },
    };
  }

  private toResponseDto(booking: any): BookingResponseDto {
    return {
      id: booking.id,
      idempotencyKey: booking.idempotencyKey,
      status: booking.status,
      vendorBookingId: booking.vendorBookingId,
      guestName: booking.guestName,
      guestEmail: booking.guestEmail,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      roomType: booking.roomType,
      failureReason: booking.failureReason,
      retryCount: booking.retryCount,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt,
    };
  }
}
