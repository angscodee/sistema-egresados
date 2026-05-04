import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { WorkerAppModule } from './worker-app.module';

async function bootstrap() {
  const logger = new Logger('ReportWorker');
  const app = await NestFactory.createApplicationContext(WorkerAppModule, {
    logger: ['error', 'warn', 'log'],
  });

  logger.log('Worker BullMQ activo (cola "reports", job "generate-pdf")');

  const close = async () => {
    await app.close();
    process.exit(0);
  };

  process.on('SIGINT', () => void close());
  process.on('SIGTERM', () => void close());
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
