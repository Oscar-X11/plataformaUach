import { Controller, Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Roles } from '../common/decorators/roles.decorator';
import { ReportFilters, ReportsService } from './reports.service';

const filters = (term?: string, career?: string): ReportFilters => ({
  term: term?.trim() || undefined,
  careerId: career?.trim() || undefined,
});

function sendCsv(res: Response, filename: string, content: string) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Cache-Control', 'private, no-store');
  res.send(content);
}

@Controller('reports')
@Roles('ADMIN')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('courses')
  courses(@Query('term') term?: string, @Query('career') career?: string) {
    return this.reports.courses(filters(term, career));
  }

  @Get('courses/export')
  async exportCourses(@Query('term') term: string | undefined, @Query('career') career: string | undefined, @Res() res: Response) {
    sendCsv(res, 'reporte-cursos.csv', await this.reports.coursesCsv(filters(term, career)));
  }

  @Get('students')
  students(@Query('term') term?: string, @Query('career') career?: string) {
    return this.reports.students(filters(term, career));
  }

  @Get('students/export')
  async exportStudents(@Query('term') term: string | undefined, @Query('career') career: string | undefined, @Res() res: Response) {
    sendCsv(res, 'alumnos-en-riesgo.csv', await this.reports.studentsCsv(filters(term, career)));
  }
}
