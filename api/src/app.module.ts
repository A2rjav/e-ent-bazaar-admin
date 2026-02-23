import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
import { ParticipantsModule } from './participants/participants.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { OrdersModule } from './orders/orders.module';
import { ReviewsModule } from './reviews/reviews.module';
import { AdminUsersModule } from './admin-users/admin-users.module';

@Module({
  imports: [ParticipantsModule, DashboardModule, OrdersModule, ReviewsModule, AdminUsersModule],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}
