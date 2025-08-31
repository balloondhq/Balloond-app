/**
 * Authentication service
 * Handles user authentication logic, token generation
 */

import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { SignupDto, LoginDto } from './dto/auth.dto';
import { AuthProvider } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  /**
   * Register a new user
   */
  async signup(signupDto: SignupDto) {
    const { email, password, name } = signupDto;

    // Check if user exists
    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('User already exists with this email');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await this.usersService.create({
      email,
      password: hashedPassword,
      name,
      provider: AuthProvider.LOCAL,
    });

    // Generate token
    const token = this.generateToken(user);

    return {
      user: this.sanitizeUser(user),
      token,
    };
  }

  /**
   * Login user with email and password
   */
  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // Find user
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last seen
    await this.usersService.updateLastSeen(user.id);

    // Generate token
    const token = this.generateToken(user);

    return {
      user: this.sanitizeUser(user),
      token,
    };
  }

  /**
   * Handle OAuth login
   */
  async oauthLogin(oauthUser: any) {
    let user = await this.usersService.findByEmail(oauthUser.email);

    if (!user) {
      // Create new user from OAuth
      user = await this.usersService.create({
        email: oauthUser.email,
        name: oauthUser.name,
        provider: oauthUser.provider,
        providerId: oauthUser.providerId,
        photos: oauthUser.photos || [],
      });
    } else {
      // Update last seen
      await this.usersService.updateLastSeen(user.id);
    }

    const token = this.generateToken(user);

    return {
      user: this.sanitizeUser(user),
      token,
    };
  }

  /**
   * Validate user by ID (for JWT strategy)
   */
  async validateUser(userId: string) {
    return this.usersService.findById(userId);
  }

  /**
   * Refresh JWT token
   */
  async refreshToken(user: any) {
    const token = this.generateToken(user);
    return { token };
  }

  /**
   * Generate JWT token
   */
  private generateToken(user: any) {
    const payload = { 
      sub: user.id, 
      email: user.email,
      name: user.name 
    };
    return this.jwtService.sign(payload);
  }

  /**
   * Remove sensitive fields from user object
   */
  private sanitizeUser(user: any) {
    const { password, ...sanitized } = user;
    return sanitized;
  }
}
