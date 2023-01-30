import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { EnvironmentVariables } from 'types/environment-variables.interface';

@Injectable()
export class PostgresService {
  private readonly _pool: Pool;

  public get pool() {
    return this._pool;
  }

  constructor(private configService: ConfigService<EnvironmentVariables, true>) {
    this._pool = new Pool({
      host: this.configService.get('PG_HOST'),
      port: this.configService.get('PG_PORT'),
      user: this.configService.get('PG_USER'),
      password: this.configService.get('PG_PASS'),
      database: this.configService.get('PG_DB_NAME'),
      max: 20,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 2000
    });
  }
}