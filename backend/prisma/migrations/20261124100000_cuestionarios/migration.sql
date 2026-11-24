-- Cuestionarios calificados y encuestas por curso (estilo Google Forms).

-- AlterTable
ALTER TABLE `notificaciones` MODIFY `tipo` ENUM('ASSIGNMENT_CREATED', 'SUBMISSION_RETURNED', 'POST_CREATED', 'COMMENT_CREATED', 'MATERIAL_CREATED', 'RESOURCE_REVIEWED', 'COURSE_ASSIGNED', 'QUIZ_PUBLISHED') NOT NULL;

-- CreateTable
CREATE TABLE `cuestionarios` (
    `id` VARCHAR(191) NOT NULL,
    `curso_id` VARCHAR(191) NOT NULL,
    `titulo` VARCHAR(150) NOT NULL,
    `descripcion` TEXT NULL,
    `tipo` ENUM('QUIZ', 'SURVEY') NOT NULL DEFAULT 'QUIZ',
    `abre_en` DATETIME(3) NULL,
    `cierra_en` DATETIME(3) NULL,
    `limite_minutos` INTEGER NULL,
    `ver_resultados` ENUM('ON_SUBMIT', 'AFTER_CLOSE', 'NEVER') NOT NULL DEFAULT 'ON_SUBMIT',
    `publicado` BOOLEAN NOT NULL DEFAULT false,
    `publicado_en` DATETIME(3) NULL,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizado_en` DATETIME(3) NOT NULL,

    INDEX `cuestionarios_curso_id_publicado_idx`(`curso_id`, `publicado`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `preguntas_cuestionario` (
    `id` VARCHAR(191) NOT NULL,
    `cuestionario_id` VARCHAR(191) NOT NULL,
    `posicion` INTEGER NOT NULL,
    `tipo` ENUM('SINGLE', 'MULTIPLE', 'TRUE_FALSE', 'SHORT', 'PARAGRAPH') NOT NULL,
    `enunciado` TEXT NOT NULL,
    `puntos` INTEGER NOT NULL DEFAULT 1,
    `obligatoria` BOOLEAN NOT NULL DEFAULT true,
    `opciones` JSON NULL,
    `respuesta_correcta` JSON NULL,

    INDEX `preguntas_cuestionario_cuestionario_id_posicion_idx`(`cuestionario_id`, `posicion`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `intentos_cuestionario` (
    `id` VARCHAR(191) NOT NULL,
    `cuestionario_id` VARCHAR(191) NOT NULL,
    `alumno_id` VARCHAR(191) NOT NULL,
    `iniciado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `vence_en` DATETIME(3) NULL,
    `enviado_en` DATETIME(3) NULL,
    `puntaje` DECIMAL(7, 2) NULL,
    `puntaje_maximo` INTEGER NOT NULL DEFAULT 0,
    `por_revisar` BOOLEAN NOT NULL DEFAULT false,

    INDEX `intentos_cuestionario_alumno_id_idx`(`alumno_id`),
    UNIQUE INDEX `intentos_cuestionario_cuestionario_id_alumno_id_key`(`cuestionario_id`, `alumno_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `respuestas_cuestionario` (
    `id` VARCHAR(191) NOT NULL,
    `intento_id` VARCHAR(191) NOT NULL,
    `pregunta_id` VARCHAR(191) NOT NULL,
    `valor` JSON NOT NULL,
    `puntos` DECIMAL(6, 2) NULL,

    INDEX `respuestas_cuestionario_pregunta_id_idx`(`pregunta_id`),
    UNIQUE INDEX `respuestas_cuestionario_intento_id_pregunta_id_key`(`intento_id`, `pregunta_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `cuestionarios` ADD CONSTRAINT `cuestionarios_curso_id_fkey` FOREIGN KEY (`curso_id`) REFERENCES `cursos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `preguntas_cuestionario` ADD CONSTRAINT `preguntas_cuestionario_cuestionario_id_fkey` FOREIGN KEY (`cuestionario_id`) REFERENCES `cuestionarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `intentos_cuestionario` ADD CONSTRAINT `intentos_cuestionario_cuestionario_id_fkey` FOREIGN KEY (`cuestionario_id`) REFERENCES `cuestionarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `intentos_cuestionario` ADD CONSTRAINT `intentos_cuestionario_alumno_id_fkey` FOREIGN KEY (`alumno_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `respuestas_cuestionario` ADD CONSTRAINT `respuestas_cuestionario_intento_id_fkey` FOREIGN KEY (`intento_id`) REFERENCES `intentos_cuestionario`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `respuestas_cuestionario` ADD CONSTRAINT `respuestas_cuestionario_pregunta_id_fkey` FOREIGN KEY (`pregunta_id`) REFERENCES `preguntas_cuestionario`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

