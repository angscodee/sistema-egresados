import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { createBullConnection } from './lib/redis-bull';
import { ReportesModule } from './modules/reportes/reportes.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    BullModule.forRoot({
      connection: createBullConnection(),
    }),
    ReportesModule,
  ],
})
export class WorkerAppModule {}
