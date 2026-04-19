import {
  Controller,
  Post,
  Param,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  Request,
  ParseUUIDPipe,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentsService } from './documents.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('conversations')
@UseGuards(AuthGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post(':conversationId/upload')
  @UseInterceptors(FileInterceptor('file', {
    limits: {
      fileSize: 50 * 1024, // 50 KB
    },
    fileFilter: (req, file, callback) => {
      if (!file.originalname.match(/\.(txt|md)$/)) {
        return callback(new BadRequestException('Only .txt and .md files are allowed'), false);
      }
      callback(null, true);
    },
  }))
  async uploadDocument(
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
    @Request() req: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const userId = req.user.sub;
    
    // Trigger async processing
    // We return early to the user, but processing continues in background
    return this.documentsService.processDocumentUpload(
      userId,
      conversationId,
      file,
    );
  }
}
