import { Module } from '@nestjs/common';
import { ClassworkModule } from '../classwork/classwork.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [ClassworkModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
