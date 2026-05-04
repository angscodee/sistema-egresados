import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { REPORT_QUEUE_NAME } from '../../queues/report-queue';
import { ReportesProcessor } from './reportes.processor';
import { ReportesService } from './reportes.service';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({
      name: REPORT_QUEUE_NAME,
    }),
  ],
  providers: [ReportesService, ReportesProcessor],
  exports: [ReportesService],
})
export class ReportesModule {}
