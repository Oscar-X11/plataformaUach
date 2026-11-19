import { Controller, Get } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { PrismaService } from '../database/prisma.service';

@Controller('academic')
export class AcademicController {
  constructor(private readonly prisma: PrismaService) {}

  /** Catálogo público de facultades y carreras (usado en el registro). */
  @Public()
  @Get('faculties')
  faculties() {
    return this.prisma.faculty.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        code: true,
        careers: {
          orderBy: { name: 'asc' },
          select: { id: true, name: true, code: true },
        },
      },
    });
  }
}
