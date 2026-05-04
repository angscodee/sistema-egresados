import { describe, expect, it } from 'vitest';
import { AppService } from './app.service';

describe('AppService', () => {
  it('returns health payload', () => {
    const service = new AppService();
    const health = service.getHealth();
    expect(health.status).toBe('ok');
    expect(health.service).toBe('api');
    expect(typeof health.timestamp).toBe('string');
  });
});
