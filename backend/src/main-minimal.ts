/**
 * Minimal main entry point for rapid Railway deployment
 */

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { MinimalAppModule } from './app-minimal.module';

async function bootstrap() {
  const app = await NestFactory.create(MinimalAppModule);

  // Get configuration service
  const configService = app.get(ConfigService);

  // Enable CORS
  app.enableCors({
    origin: configService.get('CORS_ORIGIN') || '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // API prefix
  app.setGlobalPrefix('api');

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Balloond API')
    .setDescription('Balloond Dating App API (Minimal Version)')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Get port from environment
  const port = configService.get('PORT') || 3000;

  // Start the application
  await app.listen(port);

  console.log(`🚀 Balloon'd API (minimal) running on: http://localhost:${port}`);
  console.log(`📚 API documentation: http://localhost:${port}/api/docs`);
  console.log(`💚 Health check: http://localhost:${port}/api/health`);
}

bootstrap();
