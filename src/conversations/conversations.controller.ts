import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { AuthGuard } from '../auth/auth.guard';
import { CreateConversationDto, CreateMessageDto } from './dto/create-conversation.dto';

@Controller('conversations')
@UseGuards(AuthGuard)
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Post()
  create(@Request() req: any, @Body() dto: CreateConversationDto) {
    return this.conversationsService.createConversation(req.user.sub, dto.title);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.conversationsService.getConversationById(id);
  }

  @Post(':id/messages')
  addMessage(
    @Param('id') id: string,
    @Request() req: any,
    @Body() dto: CreateMessageDto,
  ) {
    return this.conversationsService.addMessage(
      id,
      req.user.sub,
      dto.role,
      dto.content,
      dto.metadata,
    );
  }

  @Get(':id/messages')
  listMessages(@Param('id') id: string) {
    return this.conversationsService.listMessages(id);
  }
}
