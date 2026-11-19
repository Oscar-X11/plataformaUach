import { Controller, Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Roles } from '../common/decorators/roles.decorator';
import { ReportsService } from './reports.service';

@Controller('reports')
@Roles('ADMIN')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('courses')
  courses(@Query('term') term?: string) {
    return this.reports.courses(term || undefined);
  }

  @Get('courses/export')
  async export(@Query('term') term: string | undefined, @Res() res: Response) {
    const content = await this.reports.coursesCsv(term || undefined);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="reporte-cursos.csv"');
    res.setHeader('Cache-Control', 'private, no-store');
    res.send(content);
  }
}
