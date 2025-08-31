import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as compression from 'compression';
import * as helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Security
  app.use(helmet({
    contentSecurityPolicy: false, // Disable for API
  }));
  
  // Compression
  app.use(compression());
  
  // CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true,
  });
  
  // Validation
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
  }));
  
  // Global prefix
  app.setGlobalPrefix('api');
  
  const port = process.env.PORT || 8000;
  await app.listen(port);
  
  console.log(`Application is running on: http://localhost:${port}/api`);
}

bootstrap();
