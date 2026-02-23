import { Controller, Get, Patch, Param, Query, Body } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrderQueryDto, ReassignDto } from './dto/order-query.dto';

@Controller('admin/orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  findAll(@Query() query: OrderQueryDto) {
    return this.ordersService.findAll(query);
  }

  @Get('manufacturer-options')
  getManufacturerOptions() {
    return this.ordersService.getManufacturerOptions();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ordersService.findById(id);
  }

  @Patch(':id/reassign')
  reassign(@Param('id') id: string, @Body() body: ReassignDto) {
    return this.ordersService.reassign(id, body.manufacturerId);
  }
}
