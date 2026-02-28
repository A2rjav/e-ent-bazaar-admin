import { Controller, Get, Query } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrderQueryDto } from './dto/order-query.dto';

/** Mirrors /api/admin/orders but locked to SAMPLE orderType.
 *  Frontend calls /api/admin/sample-orders for sample order list. */
@Controller('admin/sample-orders')
export class SampleOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  findAll(@Query() query: OrderQueryDto) {
    return this.ordersService.findAll({ ...query, orderType: 'SAMPLE' });
  }
}
