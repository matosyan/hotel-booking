import * as models from '../../models';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  SequelizeModuleOptions,
  SequelizeOptionsFactory,
} from '@nestjs/sequelize';

@Injectable()
export class SequelizeConfigService implements SequelizeOptionsFactory {
  constructor(private readonly configService: ConfigService) {}

  createSequelizeOptions(): SequelizeModuleOptions {
    return {
      dialect: 'postgres',
      host: this.configService.get<string>('database.host'),
      port: this.configService.get<number>('database.port'),
      username: this.configService.get<string>('database.user'),
      password: this.configService.get<string>('database.password'),
      database: this.configService.get<string>('database.name'),
      models: Object.values(models),
      underscored: true,
      synchronize: false,
      dialectOptions: {},
      retryAttempts: 5,
      retryDelay: 3000,
      define: {
        underscored: true,
        timestamps: true,
        paranoid: true,
        freezeTableName: false,
      },
    } as SequelizeModuleOptions;
  }
}
