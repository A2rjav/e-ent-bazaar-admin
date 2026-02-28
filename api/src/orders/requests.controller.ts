import { Controller, Get, Patch, Param, Body } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { RequestsReassignDto } from './dto/order-query.dto';

/**
 * Mirrors the Railway /api/admin/requests contract for local dev.
 * Routes:
 *   GET  /api/admin/requests/:id                  → order detail
 *   PATCH /api/admin/requests/:id/reassign         → reassign manufacturer
 */
@Controller('admin/requests')
export class RequestsController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ordersService.findById(id);
  }

  @Patch(':id/reassign')
  reassign(@Param('id') id: string, @Body() body: RequestsReassignDto) {
    return this.ordersService.reassign(id, body.new_manufacturer_id);
  }
}
