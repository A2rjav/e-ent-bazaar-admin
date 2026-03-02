import { Controller, Get, Query } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrderQueryDto } from './dto/order-query.dto';

@Controller('admin/transport-orders')
export class TransportOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  findAll(@Query() query: OrderQueryDto) {
    return this.ordersService.getTransportOrders(query);
  }
}
