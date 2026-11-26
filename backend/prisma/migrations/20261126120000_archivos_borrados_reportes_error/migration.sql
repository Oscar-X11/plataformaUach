-- AlterTable
ALTER TABLE `archivos_entrega` ADD COLUMN `archivo_borrado_en` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `materiales_curso` ADD COLUMN `archivo_borrado_en` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `notificaciones` MODIFY `tipo` ENUM('ASSIGNMENT_CREATED', 'SUBMISSION_RETURNED', 'POST_CREATED', 'COMMENT_CREATED', 'MATERIAL_CREATED', 'RESOURCE_REVIEWED', 'COURSE_ASSIGNED', 'QUIZ_PUBLISHED', 'ERROR_REPORTED', 'REPORT_RESOLVED') NOT NULL;

-- CreateTable
CREATE TABLE `reportes_error` (
    `id` VARCHAR(191) NOT NULL,
    `origen` ENUM('SERVER', 'CLIENT', 'USER') NOT NULL,
    `mensaje` VARCHAR(500) NOT NULL,
    `detalle` TEXT NULL,
    `ruta` VARCHAR(300) NULL,
    `huella` CHAR(64) NULL,
    `veces` INTEGER NOT NULL DEFAULT 1,
    `navegador` VARCHAR(300) NULL,
    `usuario_id` VARCHAR(191) NULL,
    `resuelto_en` DATETIME(3) NULL,
    `nota_resolucion` VARCHAR(300) NULL,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `visto_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `reportes_error_resuelto_en_visto_en_idx`(`resuelto_en`, `visto_en`),
    INDEX `reportes_error_huella_resuelto_en_idx`(`huella`, `resuelto_en`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `reportes_error` ADD CONSTRAINT `reportes_error_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

