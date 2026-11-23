-- Repositorio: un recurso puede ser un archivo subido o un enlace (p. ej. Google Drive).
ALTER TABLE `recursos` ADD COLUMN `url` VARCHAR(500) NULL,
    MODIFY `ruta_archivo` VARCHAR(191) NULL,
    MODIFY `nombre_original` VARCHAR(191) NULL,
    MODIFY `tipo_mime` VARCHAR(191) NULL,
    MODIFY `tamano_bytes` INTEGER NULL;
