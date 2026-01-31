import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SequelizeModule } from '@nestjs/sequelize';
import { BullModule } from '@nestjs/bullmq';
import configuration, { validationSchema } from './config/configuration';
import { AppLoggerModule } from './shared/logger';
import { SequelizeConfigService, BullMQConfigService } from './shared/config';
import { BookingModule } from './modules/booking/booking.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
    }),
    SequelizeModule.forRootAsync({
      useClass: SequelizeConfigService,
    }),
    BullModule.forRootAsync({
      useClass: BullMQConfigService,
    }),
    AppLoggerModule,
    BookingModule,
  ],
})
export class AppModule {}
