import {
  IsString,
  IsEmail,
  IsDateString,
  IsNotEmpty,
  MaxLength,
} from 'class-validator';

export class CreateBookingDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  guestName: string;

  @IsEmail()
  @IsNotEmpty()
  @MaxLength(255)
  guestEmail: string;

  @IsDateString()
  @IsNotEmpty()
  checkIn: string;

  @IsDateString()
  @IsNotEmpty()
  checkOut: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  roomType: string;
}
