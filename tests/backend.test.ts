/**
 * Backend API Tests
 * Test suite for backend API endpoints
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('Health Check', () => {
    it('/ (GET) should return health status', () => {
      return request(app.getHttpServer())
        .get('/')
        .expect(200)
        .expect('🎈 Balloon\'d API is running!');
    });

    it('/health (GET) should return detailed health check', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .then(response => {
          expect(response.body).toHaveProperty('status', 'ok');
          expect(response.body).toHaveProperty('service', 'balloond-api');
        });
    });
  });

  describe('Authentication', () => {
    const testUser = {
      email: 'test@example.com',
      password: 'TestPassword123!',
      name: 'Test User',
    };

    it('/api/auth/signup (POST) should create new user', () => {
      return request(app.getHttpServer())
        .post('/api/auth/signup')
        .send(testUser)
        .expect(201)
        .then(response => {
          expect(response.body).toHaveProperty('token');
          expect(response.body).toHaveProperty('user');
          expect(response.body.user.email).toBe(testUser.email);
        });
    });

    it('/api/auth/login (POST) should authenticate user', async () => {
      // First create user
      await request(app.getHttpServer())
        .post('/api/auth/signup')
        .send(testUser);

      // Then login
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200)
        .then(response => {
          expect(response.body).toHaveProperty('token');
          expect(response.body).toHaveProperty('user');
        });
    });

    it('/api/auth/login (POST) should reject invalid credentials', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'wrong@example.com',
          password: 'WrongPassword',
        })
        .expect(401);
    });
  });

  describe('Protected Routes', () => {
    let authToken: string;

    beforeEach(async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/signup')
        .send({
          email: 'protected@example.com',
          password: 'SecurePass123!',
          name: 'Protected User',
        });
      authToken = response.body.token;
    });

    it('/api/users/profile (GET) should require authentication', () => {
      return request(app.getHttpServer())
        .get('/api/users/profile')
        .expect(401);
    });

    it('/api/users/profile (GET) should return user profile with valid token', () => {
      return request(app.getHttpServer())
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .then(response => {
          expect(response.body).toHaveProperty('email');
          expect(response.body).toHaveProperty('name');
        });
    });
  });
});
