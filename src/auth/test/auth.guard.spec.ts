import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from '../auth.guard';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let jwtService: jest.Mocked<JwtService>;

  beforeEach(() => {
    jwtService = {
      verifyAsync: jest.fn(),
    } as unknown as jest.Mocked<JwtService>;

    guard = new AuthGuard(jwtService);
  });

  const createExecutionContext = (headers: Record<string, string> = {}) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({
          headers,
        }),
      }),
    }) as ExecutionContext;

  it('should throw if authorization header is missing', async () => {
    const context = createExecutionContext();

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('Missing bearer token'),
    );
  });

  it('should throw if token is invalid', async () => {
    jwtService.verifyAsync.mockRejectedValue(new Error('invalid token'));

    const context = createExecutionContext({
      authorization: 'Bearer bad-token',
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('Invalid token'),
    );
  });

  it('should attach user to request if token is valid', async () => {
    const payload = { sub: 1, email: 'test@example.com' };
    jwtService.verifyAsync.mockResolvedValue(payload as never);

    const request = {
      headers: {
        authorization: 'Bearer valid-token',
      },
    };

    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as ExecutionContext;

    await expect(guard.canActivate(context)).resolves.toBe(true);

    expect(jwtService.verifyAsync).toHaveBeenCalledWith('valid-token', {
      secret: expect.any(String),
    });

    expect((request as any).user).toEqual(payload);
  });
});
