import { Test, TestingModule } from '@nestjs/testing';
import { CanActivate } from '@nestjs/common';
import { UserController } from './user.controller';
import { UsersService } from './user.service';
import { AuthGuard } from 'src/auth/auth.guard';

describe('UserController', () => {
  let controller: UserController;

  const mockUsersService = {};

  const mockAuthGuard: CanActivate = {
    canActivate: jest.fn(() => true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue(mockAuthGuard)
      .compile();

    controller = module.get<UserController>(UserController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return the authenticated user from request', () => {
    const req = {
      user: {
        sub: '123',
        email: 'john@example.com',
      },
    } as any;

    const result = controller.getProfile(req);

    expect(result).toEqual(req.user);
  });
});
