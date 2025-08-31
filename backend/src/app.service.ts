/**
 * Root application service
 */

import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return '🎈 Balloon\'d API is running!';
  }

  healthCheck() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'balloond-api',
      version: '1.0.0',
    };
  }
}
