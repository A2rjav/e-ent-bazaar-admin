import { Module } from '@nestjs/common';
import { ParticipantsController } from './participants.controller';
import { ParticipantsService } from './participants.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [ParticipantsController],
  providers: [ParticipantsService, PrismaService],
  exports: [ParticipantsService],
})
export class ParticipantsModule {}
