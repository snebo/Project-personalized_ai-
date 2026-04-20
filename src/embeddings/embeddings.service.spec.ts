import { EmbeddingsService } from './embeddings.service';

describe('EmbeddingsService', () => {
  let service: EmbeddingsService;

  const mockModel = {
    embedQuery: jest.fn(),
    embedDocuments: jest.fn(),
  };

  beforeEach(() => {
    service = new EmbeddingsService();

    Object.defineProperty(service, 'model', {
      value: mockModel,
      writable: true,
    });

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('onModuleInit should initialize the embeddings model', async () => {
    const loggerSpy = jest
      .spyOn((service as any).logger, 'log')
      .mockImplementation(() => undefined);

    await service.onModuleInit();

    expect((service as any).model).toBeDefined();
    expect(loggerSpy).toHaveBeenCalledWith(
      'Embeddings model initialized (Xenova/all-MiniLM-L6-v2, 384 dimensions)',
    );
  });

  it('embedQuery should return embedding for valid text', async () => {
    const embedding = [0.1, 0.2, 0.3];
    mockModel.embedQuery.mockResolvedValue(embedding);

    const debugSpy = jest
      .spyOn((service as any).logger, 'debug')
      .mockImplementation(() => undefined);

    const result = await service.embedQuery('hello world');

    expect(mockModel.embedQuery).toHaveBeenCalledWith('hello world');
    expect(result).toEqual(embedding);
    expect(debugSpy).toHaveBeenCalled();
  });

  it('embedQuery should throw for empty text', async () => {
    const errorSpy = jest
      .spyOn((service as any).logger, 'error')
      .mockImplementation(() => undefined);

    await expect(service.embedQuery('   ')).rejects.toThrow(
      'Input text cannot be empty',
    );

    expect(mockModel.embedQuery).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
  });

  it('embedQuery should rethrow model errors', async () => {
    const errorSpy = jest
      .spyOn((service as any).logger, 'error')
      .mockImplementation(() => undefined);

    mockModel.embedQuery.mockRejectedValue(new Error('embedding failed'));

    await expect(service.embedQuery('hello world')).rejects.toThrow(
      'embedding failed',
    );

    expect(mockModel.embedQuery).toHaveBeenCalledWith('hello world');
    expect(errorSpy).toHaveBeenCalled();
  });

  it('embedDocuments should return embeddings for valid texts', async () => {
    const embeddings = [
      [0.1, 0.2],
      [0.3, 0.4],
    ];
    mockModel.embedDocuments.mockResolvedValue(embeddings);

    const debugSpy = jest
      .spyOn((service as any).logger, 'debug')
      .mockImplementation(() => undefined);

    const result = await service.embedDocuments(['hello', 'world']);

    expect(mockModel.embedDocuments).toHaveBeenCalledWith(['hello', 'world']);
    expect(result).toEqual(embeddings);
    expect(debugSpy).toHaveBeenCalled();
  });

  it('embedDocuments should return empty array for empty input', async () => {
    const result = await service.embedDocuments([]);

    expect(result).toEqual([]);
    expect(mockModel.embedDocuments).not.toHaveBeenCalled();
  });

  it('embedDocuments should rethrow model errors', async () => {
    const errorSpy = jest
      .spyOn((service as any).logger, 'error')
      .mockImplementation(() => undefined);

    mockModel.embedDocuments.mockRejectedValue(
      new Error('batch embedding failed'),
    );

    await expect(service.embedDocuments(['hello', 'world'])).rejects.toThrow(
      'batch embedding failed',
    );

    expect(mockModel.embedDocuments).toHaveBeenCalledWith(['hello', 'world']);
    expect(errorSpy).toHaveBeenCalled();
  });

  it('generate should delegate to embedQuery', async () => {
    const spy = jest
      .spyOn(service, 'embedQuery')
      .mockResolvedValue([0.5, 0.6, 0.7]);

    const result = await service.generate('delegated text');

    expect(spy).toHaveBeenCalledWith('delegated text');
    expect(result).toEqual([0.5, 0.6, 0.7]);
  });
});
