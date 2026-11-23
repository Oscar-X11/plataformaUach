-- Fase 2: periodos académicos y aviso de curso asignado.

-- AlterTable
ALTER TABLE `notificaciones` MODIFY `tipo` ENUM('ASSIGNMENT_CREATED', 'SUBMISSION_RETURNED', 'POST_CREATED', 'COMMENT_CREATED', 'MATERIAL_CREATED', 'RESOURCE_REVIEWED', 'COURSE_ASSIGNED') NOT NULL;

-- CreateTable
CREATE TABLE `periodos` (
    `id` VARCHAR(191) NOT NULL,
    `clave` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `inicia_en` DATE NULL,
    `termina_en` DATE NULL,
    `actual` BOOLEAN NOT NULL DEFAULT false,
    `cerrado` BOOLEAN NOT NULL DEFAULT false,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `periodos_clave_key`(`clave`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Los cursos existentes guardaban el periodo como texto libre: se da de alta cada
-- valor distinto como periodo (sin fechas) para no romper la llave foránea.
INSERT INTO `periodos` (`id`, `clave`, `nombre`)
SELECT UUID(), t.`periodo`, t.`periodo`
FROM (SELECT DISTINCT `periodo` FROM `cursos`) AS t;

-- CreateIndex
CREATE INDEX `cursos_periodo_idx` ON `cursos`(`periodo`);

-- AddForeignKey
ALTER TABLE `cursos` ADD CONSTRAINT `cursos_periodo_fkey` FOREIGN KEY (`periodo`) REFERENCES `periodos`(`clave`) ON DELETE RESTRICT ON UPDATE CASCADE;
