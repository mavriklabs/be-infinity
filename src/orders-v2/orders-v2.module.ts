import { Module } from '@nestjs/common';
import { OrdersV2Controller } from './orders-v2.controller';
import { OrdersModule } from 'v2/orders/orders.module';

@Module({
  controllers: [OrdersV2Controller],
  imports: [OrdersModule]
})
export class OrdersV2Module {}
