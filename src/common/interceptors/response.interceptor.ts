import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { Request as ExpressRequest } from 'express';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  Record<string, unknown>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<Record<string, unknown>> {
    const request = context.switchToHttp().getRequest<Request>();

    return next.handle().pipe(
      map((data) => ({
        success: true,
        path: request.url,
        timestamp: new Date().toISOString(),
        data,
      })),
    );
  }
}
