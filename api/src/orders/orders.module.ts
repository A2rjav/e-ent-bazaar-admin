import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { SampleOrdersController } from './sample-orders.controller';
import { RequestsController } from './requests.controller';
import { OrdersService } from './orders.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [OrdersController, SampleOrdersController, RequestsController],
  providers: [OrdersService, PrismaService],
})
export class OrdersModule {}
