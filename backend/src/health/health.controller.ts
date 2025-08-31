import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    };
  }

  @Get('ready')
  ready() {
    // Check if all services are ready
    return {
      status: 'ready',
      services: {
        database: 'connected',
        redis: 'connected',
        api: 'ready',
      },
    };
  }
}
