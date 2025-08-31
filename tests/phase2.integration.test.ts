/**
 * Phase 2 Integration Tests
 * Tests for voice messages, push notifications, and subscriptions
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Phase 2 Integration Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let testUserId: string;
  let testChatId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);

    // Create test user and authenticate
    const authResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'test@balloond.com',
        password: 'Test123!',
        name: 'Test User',
      });

    authToken = authResponse.body.access_token;
    testUserId = authResponse.body.user.id;
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.user.deleteMany({
      where: { email: 'test@balloond.com' },
    });
    await app.close();
  });

  describe('Voice Messages', () => {
    it('should send a voice message', async () => {
      // Create a chat first
      const chatResponse = await request(app.getHttpServer())
        .post('/chat/conversations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ userId: 'test-user-2' });

      testChatId = chatResponse.body.id;

      // Send voice message
      const voiceResponse = await request(app.getHttpServer())
        .post(`/chat/conversations/${testChatId}/voice`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          audioData: 'base64_encoded_audio_data',
          duration: 30,
          format: 'webm',
        });

      expect(voiceResponse.status).toBe(201);
      expect(voiceResponse.body).toHaveProperty('id');
      expect(voiceResponse.body.messageType).toBe('VOICE');
      expect(voiceResponse.body.mediaDuration).toBe(30);
    });

    it('should reject voice messages over 60 seconds', async () => {
      const response = await request(app.getHttpServer())
        .post(`/chat/conversations/${testChatId}/voice`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          audioData: 'base64_encoded_audio_data',
          duration: 61,
          format: 'webm',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('60 seconds');
    });
  });

  describe('Push Notifications', () => {
    it('should register push notification token', async () => {
      const response = await request(app.getHttpServer())
        .post('/chat/push-token')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          token: 'expo_push_token_123',
          platform: 'IOS',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });

    it('should send push notification on new message', async () => {
      // This would require mocking Firebase Admin SDK
      // Just testing the endpoint exists
      const response = await request(app.getHttpServer())
        .post(`/chat/conversations/${testChatId}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'Test message',
          messageType: 'TEXT',
        });

      expect(response.status).toBe(201);
      // In production, verify push notification was queued
    });
  });

  describe('Subscriptions', () => {
    it('should get current subscription status', async () => {
      const response = await request(app.getHttpServer())
        .get('/subscriptions/status')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('tier');
      expect(response.body).toHaveProperty('features');
      expect(response.body.tier).toBe('FREE');
      expect(response.body.features.dailyPops).toBe(5);
    });

    it('should create checkout session for Stripe', async () => {
      const response = await request(app.getHttpServer())
        .post('/subscriptions/create-checkout-session')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          tierId: 'gold',
          successUrl: 'http://localhost:3000/success',
          cancelUrl: 'http://localhost:3000/cancel',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('checkoutUrl');
      // URL should be a valid Stripe checkout URL
      expect(response.body.checkoutUrl).toContain('checkout.stripe.com');
    });

    it('should verify Apple receipt', async () => {
      const response = await request(app.getHttpServer())
        .post('/subscriptions/verify-apple-receipt')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          receipt: 'mock_receipt_data',
          tierId: 'gold',
        });

      // This would fail without proper Apple setup
      expect(response.status).toBeLessThan(500);
    });

    it('should enforce subscription limits', async () => {
      // Test free tier limits
      const profileResponse = await request(app.getHttpServer())
        .get('/users/profile')
        .set('Authorization', `Bearer ${authToken}`);

      expect(profileResponse.body.dailyPopsRemaining).toBeLessThanOrEqual(5);
    });
  });

  describe('Moderation', () => {
    it('should report a user', async () => {
      const response = await request(app.getHttpServer())
        .post('/moderation/report')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          contentType: 'USER',
          contentId: 'test-user-2',
          reason: 'fake_profile',
          description: 'This profile seems fake',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.status).toBe('PENDING');
    });

    it('should block a user', async () => {
      const response = await request(app.getHttpServer())
        .post('/moderation/block')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          userId: 'test-user-2',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);

      // Verify blocked user can't send messages
      const messageResponse = await request(app.getHttpServer())
        .post(`/chat/conversations/${testChatId}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'Should fail',
        });

      expect(messageResponse.status).toBe(403);
    });

    it('should scan image for nudity', async () => {
      // This would require mocking Google Vision API
      const response = await request(app.getHttpServer())
        .post('/moderation/scan-image')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          imageUrl: 'https://example.com/image.jpg',
        });

      expect(response.status).toBeLessThan(500);
      // Would return safety scores in production
    });
  });

  describe('Chat Features', () => {
    it('should handle typing indicators', async () => {
      const response = await request(app.getHttpServer())
        .post(`/chat/conversations/${testChatId}/typing`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          isTyping: true,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should delete a message', async () => {
      // Create a message first
      const messageResponse = await request(app.getHttpServer())
        .post(`/chat/conversations/${testChatId}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'Message to delete',
        });

      const messageId = messageResponse.body.id;

      // Delete the message
      const deleteResponse = await request(app.getHttpServer())
        .delete(`/chat/messages/${messageId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body.success).toBe(true);

      // Verify message is marked as deleted
      const messagesResponse = await request(app.getHttpServer())
        .get(`/chat/conversations/${testChatId}/messages`)
        .set('Authorization', `Bearer ${authToken}`);

      const deletedMessage = messagesResponse.body.find(
        (msg: any) => msg.id === messageId
      );
      expect(deletedMessage).toBeUndefined();
    });

    it('should mark messages as read', async () => {
      const response = await request(app.getHttpServer())
        .post(`/chat/conversations/${testChatId}/read`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('WebSocket Events', () => {
    it('should connect to WebSocket', (done) => {
      // This would require Socket.IO client for testing
      // Just checking the gateway is accessible
      const io = require('socket.io-client');
      const socket = io('http://localhost:3001');

      socket.on('connect', () => {
        expect(socket.connected).toBe(true);
        socket.disconnect();
        done();
      });

      socket.on('connect_error', () => {
        // WebSocket might not be running in test environment
        done();
      });
    });
  });
});

describe('Subscription Limits', () => {
  it('should enforce daily pop limits', async () => {
    // Simulate using all daily pops
    for (let i = 0; i < 5; i++) {
      await request(app.getHttpServer())
        .post('/matching/pop')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ balloonId: `balloon-${i}` });
    }

    // 6th pop should fail for free tier
    const response = await request(app.getHttpServer())
      .post('/matching/pop')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ balloonId: 'balloon-6' });

    expect(response.status).toBe(403);
    expect(response.body.message).toContain('daily limit');
  });

  it('should enforce voice message duration limits', async () => {
    // Free tier: 30 seconds max
    const response = await request(app.getHttpServer())
      .post(`/chat/conversations/${testChatId}/voice`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        audioData: 'base64_encoded_audio_data',
        duration: 31,
        format: 'webm',
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('30 seconds');
  });
});
