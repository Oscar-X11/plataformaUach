import { Module } from '@nestjs/common';
import { AcademicController } from './academic.controller';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';

@Module({
  controllers: [AcademicController, CatalogController],
  providers: [CatalogService],
})
export class AcademicModule {}
