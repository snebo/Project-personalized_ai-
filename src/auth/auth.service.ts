import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/user.service';
import { SignInDto } from './dto/sign-in.dto';
import { SignUpDto } from './dto/sign-up.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}

  async signUp(dto: SignUpDto) {
    const { email, password, name } = dto;

    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.usersService.create({
      email,
      password: hashedPassword,
      name,
    });

    const payload = { sub: user.id, email: user.email, name: user.name };

    return {
      access_token: await this.jwtService.signAsync(payload),
      user,
    };
  }

  async signIn(dto: SignInDto) {
    const { email, password } = dto;

    const user = await this.usersService.findByEmailWithPassword(email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { sub: user.id, email: user.email, name: user.name };

    // Remove password from user object before returning
    const { password: _, ...userWithoutPassword } = user;

    return {
      access_token: await this.jwtService.signAsync(payload),
      user: userWithoutPassword,
    };
  }
}
