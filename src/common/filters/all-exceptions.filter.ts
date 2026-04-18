import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request as ExpressRequest, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse = isHttpException ? exception.getResponse() : null;

    const message =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : ((exceptionResponse as any)?.message ?? 'Internal server error');

    const error =
      typeof exceptionResponse === 'object' && exceptionResponse !== null
        ? (exceptionResponse as any)?.error
        : undefined;

    const stack = exception instanceof Error ? exception.stack : undefined;

    this.logger.error(
      `${request.method} ${request.url} ${status} - ${JSON.stringify(message)}`,
      stack,
    );

    response['status'](status).json({
      success: false,
      statusCode: status,
      message,
      error: error ?? (status === 500 ? 'Internal Server Error' : undefined),
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
