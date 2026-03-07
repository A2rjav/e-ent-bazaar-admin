import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  ParseUUIDPipe,
  ValidationPipe,
  BadRequestException,
} from '@nestjs/common';
import { ParticipantsService, PaginatedParticipants } from './participants.service';
import { ParticipantQueryDto, PARTICIPANT_TYPES, type ParticipantType } from './dto/participant-query.dto';

@Controller('admin/participants')
export class ParticipantsController {
  constructor(private readonly participantsService: ParticipantsService) {}

  @Get()
  async list(
    @Query(new ValidationPipe({ transform: true })) query: ParticipantQueryDto,
  ): Promise<PaginatedParticipants> {
    const { type, search, page = 1, limit = 10, status } = query;
    return this.participantsService.findAll(type, search, page, limit, status);
  }

  @Patch(':type/:id/activate')
  async activate(
    @Param('type') type: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ success: boolean }> {
    if (!PARTICIPANT_TYPES.includes(type as ParticipantType)) {
      throw new BadRequestException(`Invalid type: ${type}`);
    }
    return this.participantsService.activate(type as ParticipantType, id);
  }

  @Patch(':type/:id/deactivate')
  async deactivate(
    @Param('type') type: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ success: boolean }> {
    if (!PARTICIPANT_TYPES.includes(type as ParticipantType)) {
      throw new BadRequestException(`Invalid type: ${type}`);
    }
    return this.participantsService.deactivate(type as ParticipantType, id);
  }
}
