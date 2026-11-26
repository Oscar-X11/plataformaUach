import { Module } from '@nestjs/common';
import { AcademicController } from './academic.controller';
import { CatalogController } from './catalog.controller';
import { FilesModule } from '../files/files.module';
import { CatalogService } from './catalog.service';
import { TermFilesService } from './term-files.service';

@Module({
  controllers: [AcademicController, CatalogController],
  imports: [FilesModule],
  providers: [CatalogService, TermFilesService],
})
export class AcademicModule {}
