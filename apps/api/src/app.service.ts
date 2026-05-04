import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      status: 'ok' as const,
      service: 'api',
      timestamp: new Date().toISOString(),
    };
  }
}
