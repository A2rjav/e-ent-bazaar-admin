import { Controller, Get, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller('admin/dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  /** GET /api/admin/dashboard — combined (legacy) */
  @Get()
  getSummary() {
    return this.dashboardService.getSummary();
  }

  /** GET /api/admin/dashboard/overview */
  @Get('overview')
  getOverview(
    @Query('from_date') fromDate?: string,
    @Query('to_date') toDate?: string,
  ) {
    return this.dashboardService.getOverview(fromDate, toDate);
  }

  /** GET /api/admin/dashboard/requests-by-status */
  @Get('requests-by-status')
  getRequestsByStatus() {
    return this.dashboardService.getRequestsByStatus();
  }

  /** GET /api/admin/dashboard/regional-trends */
  @Get('regional-trends')
  getRegionalTrends() {
    return this.dashboardService.getRegionalTrends();
  }

  /** GET /api/admin/dashboard/participant-performance */
  @Get('participant-performance')
  getParticipantPerformance(
    @Query('type') type: string,
    @Query('metric') metric: string,
    @Query('limit') limit: number,
  ) {
    return this.dashboardService.getParticipantPerformance(type, metric, +limit || 5);
  }
}
