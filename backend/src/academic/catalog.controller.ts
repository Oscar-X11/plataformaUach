import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Put, Req } from '@nestjs/common';
import { ActivityService } from '../activity/activity.service';
import type { AuthenticatedRequest } from '../common/types/auth-request';
import { Roles } from '../common/decorators/roles.decorator';
import { CareerDto, FacultyDto, SubjectDto, TermDto, UpdateTermDto } from './catalog.dto';
import { CatalogService } from './catalog.service';

/**
 * Administración de catálogos y periodos. La lectura de periodos la usan también
 * los docentes (formulario para crear cursos); todo lo demás es solo ADMIN.
 */
@Controller('academic')
export class CatalogController {
  constructor(
    private readonly catalog: CatalogService,
    private readonly activity: ActivityService,
  ) {}

  @Get('terms')
  terms() {
    return this.catalog.terms();
  }

  @Roles('ADMIN')
  @Post('terms')
  async createTerm(@Body() dto: TermDto, @Req() { user }: AuthenticatedRequest) {
    const term = await this.catalog.createTerm(dto);
    this.activity.log({ userId: user.sub, action: 'TERM_CHANGED', summary: `Creó el periodo ${term.code}` });
    return term;
  }

  @Roles('ADMIN')
  @Patch('terms/:id')
  async updateTerm(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTermDto,
    @Req() { user }: AuthenticatedRequest,
  ) {
    const term = await this.catalog.updateTerm(id, dto);
    const what =
      dto.closed === true ? 'Cerró' : dto.closed === false ? 'Reabrió' : dto.isCurrent ? 'Marcó como actual' : 'Editó';
    this.activity.log({ userId: user.sub, action: 'TERM_CHANGED', summary: `${what} el periodo ${term.code}` });
    return term;
  }

  @Roles('ADMIN')
  @HttpCode(204)
  @Delete('terms/:id')
  deleteTerm(@Param('id', ParseUUIDPipe) id: string) {
    return this.catalog.deleteTerm(id);
  }

  @Roles('ADMIN')
  @Get('catalog')
  tree() {
    return this.catalog.catalog();
  }

  @Roles('ADMIN')
  @Post('faculties')
  createFaculty(@Body() dto: FacultyDto) {
    return this.catalog.createFaculty(dto);
  }

  @Roles('ADMIN')
  @Put('faculties/:id')
  updateFaculty(@Param('id', ParseUUIDPipe) id: string, @Body() dto: FacultyDto) {
    return this.catalog.updateFaculty(id, dto);
  }

  @Roles('ADMIN')
  @HttpCode(204)
  @Delete('faculties/:id')
  deleteFaculty(@Param('id', ParseUUIDPipe) id: string) {
    return this.catalog.deleteFaculty(id);
  }

  @Roles('ADMIN')
  @Post('careers')
  createCareer(@Body() dto: CareerDto) {
    return this.catalog.createCareer(dto);
  }

  @Roles('ADMIN')
  @Put('careers/:id')
  updateCareer(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CareerDto) {
    return this.catalog.updateCareer(id, dto);
  }

  @Roles('ADMIN')
  @HttpCode(204)
  @Delete('careers/:id')
  deleteCareer(@Param('id', ParseUUIDPipe) id: string) {
    return this.catalog.deleteCareer(id);
  }

  @Roles('ADMIN')
  @Post('subjects')
  createSubject(@Body() dto: SubjectDto) {
    return this.catalog.createSubject(dto);
  }

  @Roles('ADMIN')
  @Put('subjects/:id')
  updateSubject(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SubjectDto) {
    return this.catalog.updateSubject(id, dto);
  }

  @Roles('ADMIN')
  @HttpCode(204)
  @Delete('subjects/:id')
  deleteSubject(@Param('id', ParseUUIDPipe) id: string) {
    return this.catalog.deleteSubject(id);
  }
}
