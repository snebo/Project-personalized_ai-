import { BadRequestException, CanActivate } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthGuard } from '../auth/auth.guard';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';

describe('DocumentsController', () => {
  let controller: DocumentsController;

  const mockDocumentsService = {
    processDocumentUpload: jest.fn(),
  };

  const mockAuthGuard: CanActivate = {
    canActivate: jest.fn(() => true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DocumentsController],
      providers: [
        {
          provide: DocumentsService,
          useValue: mockDocumentsService,
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue(mockAuthGuard)
      .compile();

    controller = module.get<DocumentsController>(DocumentsController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should throw when no file is uploaded', async () => {
    const req = { user: { sub: 'user-1' } };

    await expect(
      controller.uploadDocument(
        '11111111-1111-1111-1111-111111111111',
        req,
        undefined as any,
      ),
    ).rejects.toThrow(new BadRequestException('No file uploaded'));
  });

  it('should call processDocumentUpload with userId, conversationId and file', async () => {
    const req = { user: { sub: 'user-1' } };
    const file = {
      originalname: 'notes.txt',
      mimetype: 'text/plain',
      size: 120,
      buffer: Buffer.from('hello world'),
    } as Express.Multer.File;

    const expected = {
      message: 'File upload started. Processing in background.',
      documentId: 'doc-1',
    };

    mockDocumentsService.processDocumentUpload.mockResolvedValue(expected);

    const result = await controller.uploadDocument(
      '11111111-1111-1111-1111-111111111111',
      req,
      file,
    );

    expect(mockDocumentsService.processDocumentUpload).toHaveBeenCalledWith(
      'user-1',
      '11111111-1111-1111-1111-111111111111',
      file,
    );
    expect(result).toEqual(expected);
  });
});
