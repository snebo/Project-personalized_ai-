import { ArgumentsHost, BadRequestException, HttpStatus } from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;

  beforeEach(() => {
    filter = new AllExceptionsFilter();
  });

  it('should handle HttpException correctly', () => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });

    const host = {
      switchToHttp: () => ({
        getRequest: () => ({
          method: 'GET',
          url: '/test',
        }),
        getResponse: () => ({
          status,
        }),
      }),
    } as unknown as ArgumentsHost;

    const exception = new BadRequestException('Validation failed');

    filter.catch(exception, host);

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: HttpStatus.BAD_REQUEST,
        path: '/test',
        message: 'Validation failed',
      }),
    );
  });

  it('should handle unknown exceptions as 500', () => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });

    const host = {
      switchToHttp: () => ({
        getRequest: () => ({
          method: 'GET',
          url: '/test',
        }),
        getResponse: () => ({
          status,
        }),
      }),
    } as unknown as ArgumentsHost;

    const exception = new Error('Unexpected');

    filter.catch(exception, host);

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        path: '/test',
        message: 'Internal server error',
        error: 'Internal Server Error',
      }),
    );
  });
});
