import { CallHandler, ExecutionContext } from '@nestjs/common';
import { of } from 'rxjs';
import { ResponseInterceptor } from './response.interceptor';

describe('ResponseInterceptor', () => {
  let interceptor: ResponseInterceptor<unknown>;

  beforeEach(() => {
    interceptor = new ResponseInterceptor();
  });

  it('should wrap response data in a success envelope', (done) => {
    const data = { id: 1, title: 'entry' };

    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          url: '/entries/1',
        }),
      }),
    } as ExecutionContext;

    const next: CallHandler = {
      handle: () => of(data),
    };

    interceptor.intercept(context, next).subscribe((result) => {
      expect(result.success).toBe(true);
      expect(result.path).toBe('/entries/1');
      expect(result.data).toEqual(data);
      expect(typeof result.timestamp).toBe('string');
      done();
    });
  });
});
