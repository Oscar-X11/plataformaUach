-- Rúbricas, libro de calificaciones con pesos, calificación aprobatoria por nivel,
-- progreso (material visto), acceso condicional y bitácora de actividad.

-- AlterTable
ALTER TABLE `cuestionarios` ADD COLUMN `requiere_id` VARCHAR(191) NULL,
    ADD COLUMN `requiere_tipo` VARCHAR(20) NULL;

-- AlterTable
ALTER TABLE `cursos` ADD COLUMN `peso_cuestionarios` INTEGER NOT NULL DEFAULT 40,
    ADD COLUMN `peso_tareas` INTEGER NOT NULL DEFAULT 60;

-- AlterTable
ALTER TABLE `entregas` ADD COLUMN `seleccion_rubrica` JSON NULL;

-- AlterTable
ALTER TABLE `facultades` ADD COLUMN `calificacion_aprobatoria` DECIMAL(4, 2) NOT NULL DEFAULT 7;

-- AlterTable
ALTER TABLE `tareas` ADD COLUMN `disponible_desde` DATETIME(3) NULL,
    ADD COLUMN `requiere_id` VARCHAR(191) NULL,
    ADD COLUMN `requiere_tipo` VARCHAR(20) NULL;

-- CreateTable
CREATE TABLE `criterios_rubrica` (
    `id` VARCHAR(191) NOT NULL,
    `tarea_id` VARCHAR(191) NOT NULL,
    `posicion` INTEGER NOT NULL,
    `titulo` VARCHAR(150) NOT NULL,
    `descripcion` TEXT NULL,
    `niveles` JSON NOT NULL,

    INDEX `criterios_rubrica_tarea_id_posicion_idx`(`tarea_id`, `posicion`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `materiales_vistos` (
    `id` VARCHAR(191) NOT NULL,
    `material_id` VARCHAR(191) NOT NULL,
    `alumno_id` VARCHAR(191) NOT NULL,
    `visto_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `materiales_vistos_alumno_id_idx`(`alumno_id`),
    UNIQUE INDEX `materiales_vistos_material_id_alumno_id_key`(`material_id`, `alumno_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bitacora_actividad` (
    `id` VARCHAR(191) NOT NULL,
    `usuario_id` VARCHAR(191) NULL,
    `curso_id` VARCHAR(191) NULL,
    `accion` VARCHAR(40) NOT NULL,
    `resumen` VARCHAR(300) NOT NULL,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `bitacora_actividad_curso_id_creado_en_idx`(`curso_id`, `creado_en`),
    INDEX `bitacora_actividad_creado_en_idx`(`creado_en`),
    INDEX `bitacora_actividad_usuario_id_creado_en_idx`(`usuario_id`, `creado_en`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `criterios_rubrica` ADD CONSTRAINT `criterios_rubrica_tarea_id_fkey` FOREIGN KEY (`tarea_id`) REFERENCES `tareas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `materiales_vistos` ADD CONSTRAINT `materiales_vistos_material_id_fkey` FOREIGN KEY (`material_id`) REFERENCES `materiales_curso`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `materiales_vistos` ADD CONSTRAINT `materiales_vistos_alumno_id_fkey` FOREIGN KEY (`alumno_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bitacora_actividad` ADD CONSTRAINT `bitacora_actividad_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;


-- La preparatoria aprueba con 6.
UPDATE `facultades` SET `calificacion_aprobatoria` = 6 WHERE `tipo_periodo` = 'SEMESTRAL';
