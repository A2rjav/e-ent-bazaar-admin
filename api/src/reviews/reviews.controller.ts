import { Controller, Get, Delete, Param } from '@nestjs/common';
import { ReviewsService } from './reviews.service';

@Controller('admin/reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  findAll() {
    return this.reviewsService.findAll();
  }

  @Delete(':sourceTable/:id')
  delete(
    @Param('sourceTable') sourceTable: string,
    @Param('id') id: string,
  ) {
    return this.reviewsService.delete(sourceTable, id);
  }
}
