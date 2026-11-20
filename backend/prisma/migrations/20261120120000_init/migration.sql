-- CreateTable
CREATE TABLE `facultades` (
    `id` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `clave` VARCHAR(191) NOT NULL,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `facultades_nombre_key`(`nombre`),
    UNIQUE INDEX `facultades_clave_key`(`clave`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `carreras` (
    `id` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `clave` VARCHAR(191) NOT NULL,
    `facultad_id` VARCHAR(191) NOT NULL,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `carreras_clave_key`(`clave`),
    INDEX `carreras_facultad_id_idx`(`facultad_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `materias` (
    `id` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `clave` VARCHAR(191) NOT NULL,
    `semestre` INTEGER NOT NULL,
    `carrera_id` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `materias_clave_key`(`clave`),
    INDEX `materias_carrera_id_semestre_idx`(`carrera_id`, `semestre`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `usuarios` (
    `id` VARCHAR(191) NOT NULL,
    `usuario` VARCHAR(30) NOT NULL,
    `contrasena_hash` VARCHAR(191) NOT NULL,
    `debe_cambiar_contrasena` BOOLEAN NOT NULL DEFAULT false,
    `nombre_completo` VARCHAR(191) NOT NULL,
    `ruta_avatar` VARCHAR(191) NULL,
    `rol` ENUM('STUDENT', 'TEACHER', 'ADMIN') NOT NULL,
    `estado` ENUM('ACTIVE', 'INACTIVE', 'GRADUATED') NOT NULL DEFAULT 'ACTIVE',
    `facultad_id` VARCHAR(191) NULL,
    `carrera_id` VARCHAR(191) NULL,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizado_en` DATETIME(3) NOT NULL,

    UNIQUE INDEX `usuarios_usuario_key`(`usuario`),
    INDEX `usuarios_rol_estado_idx`(`rol`, `estado`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cursos` (
    `id` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `periodo` VARCHAR(191) NOT NULL,
    `codigo_invitacion` VARCHAR(191) NOT NULL,
    `materia_id` VARCHAR(191) NOT NULL,
    `docente_id` VARCHAR(191) NOT NULL,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `cursos_codigo_invitacion_key`(`codigo_invitacion`),
    INDEX `cursos_docente_id_idx`(`docente_id`),
    INDEX `cursos_materia_id_idx`(`materia_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inscripciones` (
    `id` VARCHAR(191) NOT NULL,
    `curso_id` VARCHAR(191) NOT NULL,
    `alumno_id` VARCHAR(191) NOT NULL,
    `inscrito_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `inscripciones_curso_id_alumno_id_key`(`curso_id`, `alumno_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `publicaciones` (
    `id` VARCHAR(191) NOT NULL,
    `contenido` TEXT NOT NULL,
    `curso_id` VARCHAR(191) NOT NULL,
    `autor_id` VARCHAR(191) NOT NULL,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `publicaciones_curso_id_creado_en_idx`(`curso_id`, `creado_en`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `comentarios` (
    `id` VARCHAR(191) NOT NULL,
    `contenido` TEXT NOT NULL,
    `publicacion_id` VARCHAR(191) NOT NULL,
    `autor_id` VARCHAR(191) NOT NULL,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `comentarios_publicacion_id_creado_en_idx`(`publicacion_id`, `creado_en`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tareas` (
    `id` VARCHAR(191) NOT NULL,
    `titulo` VARCHAR(191) NOT NULL,
    `instrucciones` TEXT NOT NULL,
    `fecha_limite` DATETIME(3) NULL,
    `puntos` INTEGER NOT NULL DEFAULT 10,
    `curso_id` VARCHAR(191) NOT NULL,
    `docente_id` VARCHAR(191) NOT NULL,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizado_en` DATETIME(3) NOT NULL,

    INDEX `tareas_curso_id_fecha_limite_idx`(`curso_id`, `fecha_limite`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `entregas` (
    `id` VARCHAR(191) NOT NULL,
    `tarea_id` VARCHAR(191) NOT NULL,
    `alumno_id` VARCHAR(191) NOT NULL,
    `estado` ENUM('ASSIGNED', 'SUBMITTED', 'RETURNED') NOT NULL DEFAULT 'ASSIGNED',
    `calificacion` DECIMAL(5, 2) NULL,
    `retroalimentacion` TEXT NULL,
    `entregada_en` DATETIME(3) NULL,
    `devuelta_en` DATETIME(3) NULL,
    `actualizado_en` DATETIME(3) NOT NULL,

    INDEX `entregas_alumno_id_estado_idx`(`alumno_id`, `estado`),
    UNIQUE INDEX `entregas_tarea_id_alumno_id_key`(`tarea_id`, `alumno_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `archivos_entrega` (
    `id` VARCHAR(191) NOT NULL,
    `entrega_id` VARCHAR(191) NOT NULL,
    `ruta_archivo` VARCHAR(191) NOT NULL,
    `nombre_original` VARCHAR(191) NOT NULL,
    `tipo_mime` VARCHAR(191) NOT NULL,
    `tamano_bytes` INTEGER NOT NULL,
    `sha256` CHAR(64) NOT NULL,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `archivos_entrega_ruta_archivo_key`(`ruta_archivo`),
    INDEX `archivos_entrega_entrega_id_idx`(`entrega_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notificaciones` (
    `id` VARCHAR(191) NOT NULL,
    `usuario_id` VARCHAR(191) NOT NULL,
    `tipo` ENUM('ASSIGNMENT_CREATED', 'SUBMISSION_RETURNED', 'POST_CREATED', 'COMMENT_CREATED', 'MATERIAL_CREATED', 'RESOURCE_REVIEWED') NOT NULL,
    `titulo` VARCHAR(191) NOT NULL,
    `enlace` VARCHAR(191) NULL,
    `leida_en` DATETIME(3) NULL,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `notificaciones_usuario_id_leida_en_creado_en_idx`(`usuario_id`, `leida_en`, `creado_en`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `recursos` (
    `id` VARCHAR(191) NOT NULL,
    `titulo` VARCHAR(191) NOT NULL,
    `descripcion` TEXT NULL,
    `tipo` ENUM('NOTE', 'STUDY_GUIDE', 'EXAM', 'BOOK', 'OTHER') NOT NULL,
    `estado` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `ruta_archivo` VARCHAR(191) NOT NULL,
    `nombre_original` VARCHAR(191) NOT NULL,
    `tipo_mime` VARCHAR(191) NOT NULL,
    `tamano_bytes` INTEGER NOT NULL,
    `sha256` CHAR(64) NULL,
    `materia_id` VARCHAR(191) NOT NULL,
    `autor_id` VARCHAR(191) NOT NULL,
    `nota_revision` VARCHAR(500) NULL,
    `revisado_por_id` VARCHAR(191) NULL,
    `revisado_en` DATETIME(3) NULL,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `recursos_ruta_archivo_key`(`ruta_archivo`),
    INDEX `recursos_materia_id_tipo_idx`(`materia_id`, `tipo`),
    INDEX `recursos_estado_creado_en_idx`(`estado`, `creado_en`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `temas_curso` (
    `id` VARCHAR(191) NOT NULL,
    `curso_id` VARCHAR(191) NOT NULL,
    `titulo` VARCHAR(120) NOT NULL,
    `posicion` INTEGER NOT NULL DEFAULT 0,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `temas_curso_curso_id_posicion_idx`(`curso_id`, `posicion`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `materiales_curso` (
    `id` VARCHAR(191) NOT NULL,
    `curso_id` VARCHAR(191) NOT NULL,
    `tema_id` VARCHAR(191) NULL,
    `titulo` VARCHAR(150) NOT NULL,
    `descripcion` TEXT NULL,
    `tipo` ENUM('FILE', 'LINK') NOT NULL,
    `ruta_archivo` VARCHAR(191) NULL,
    `url` VARCHAR(500) NULL,
    `nombre_original` VARCHAR(191) NULL,
    `tipo_mime` VARCHAR(191) NULL,
    `tamano_bytes` INTEGER NULL,
    `sha256` CHAR(64) NULL,
    `autor_id` VARCHAR(191) NOT NULL,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `materiales_curso_ruta_archivo_key`(`ruta_archivo`),
    INDEX `materiales_curso_curso_id_tema_id_idx`(`curso_id`, `tema_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `grupos_estudio` (
    `id` VARCHAR(191) NOT NULL,
    `titulo` VARCHAR(191) NOT NULL,
    `descripcion` TEXT NOT NULL,
    `cupo` INTEGER NOT NULL,
    `lugar_horario` VARCHAR(200) NULL,
    `materia_id` VARCHAR(191) NULL,
    `creador_id` VARCHAR(191) NOT NULL,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `grupos_estudio_materia_id_idx`(`materia_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `miembros_grupo_estudio` (
    `grupo_id` VARCHAR(191) NOT NULL,
    `usuario_id` VARCHAR(191) NOT NULL,
    `unido_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `miembros_grupo_estudio_usuario_id_idx`(`usuario_id`),
    PRIMARY KEY (`grupo_id`, `usuario_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `carreras` ADD CONSTRAINT `carreras_facultad_id_fkey` FOREIGN KEY (`facultad_id`) REFERENCES `facultades`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `materias` ADD CONSTRAINT `materias_carrera_id_fkey` FOREIGN KEY (`carrera_id`) REFERENCES `carreras`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `usuarios` ADD CONSTRAINT `usuarios_facultad_id_fkey` FOREIGN KEY (`facultad_id`) REFERENCES `facultades`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `usuarios` ADD CONSTRAINT `usuarios_carrera_id_fkey` FOREIGN KEY (`carrera_id`) REFERENCES `carreras`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cursos` ADD CONSTRAINT `cursos_materia_id_fkey` FOREIGN KEY (`materia_id`) REFERENCES `materias`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cursos` ADD CONSTRAINT `cursos_docente_id_fkey` FOREIGN KEY (`docente_id`) REFERENCES `usuarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inscripciones` ADD CONSTRAINT `inscripciones_curso_id_fkey` FOREIGN KEY (`curso_id`) REFERENCES `cursos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inscripciones` ADD CONSTRAINT `inscripciones_alumno_id_fkey` FOREIGN KEY (`alumno_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `publicaciones` ADD CONSTRAINT `publicaciones_curso_id_fkey` FOREIGN KEY (`curso_id`) REFERENCES `cursos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `publicaciones` ADD CONSTRAINT `publicaciones_autor_id_fkey` FOREIGN KEY (`autor_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `comentarios` ADD CONSTRAINT `comentarios_publicacion_id_fkey` FOREIGN KEY (`publicacion_id`) REFERENCES `publicaciones`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `comentarios` ADD CONSTRAINT `comentarios_autor_id_fkey` FOREIGN KEY (`autor_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tareas` ADD CONSTRAINT `tareas_curso_id_fkey` FOREIGN KEY (`curso_id`) REFERENCES `cursos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tareas` ADD CONSTRAINT `tareas_docente_id_fkey` FOREIGN KEY (`docente_id`) REFERENCES `usuarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `entregas` ADD CONSTRAINT `entregas_tarea_id_fkey` FOREIGN KEY (`tarea_id`) REFERENCES `tareas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `entregas` ADD CONSTRAINT `entregas_alumno_id_fkey` FOREIGN KEY (`alumno_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `archivos_entrega` ADD CONSTRAINT `archivos_entrega_entrega_id_fkey` FOREIGN KEY (`entrega_id`) REFERENCES `entregas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notificaciones` ADD CONSTRAINT `notificaciones_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recursos` ADD CONSTRAINT `recursos_materia_id_fkey` FOREIGN KEY (`materia_id`) REFERENCES `materias`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recursos` ADD CONSTRAINT `recursos_autor_id_fkey` FOREIGN KEY (`autor_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recursos` ADD CONSTRAINT `recursos_revisado_por_id_fkey` FOREIGN KEY (`revisado_por_id`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `temas_curso` ADD CONSTRAINT `temas_curso_curso_id_fkey` FOREIGN KEY (`curso_id`) REFERENCES `cursos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `materiales_curso` ADD CONSTRAINT `materiales_curso_curso_id_fkey` FOREIGN KEY (`curso_id`) REFERENCES `cursos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `materiales_curso` ADD CONSTRAINT `materiales_curso_tema_id_fkey` FOREIGN KEY (`tema_id`) REFERENCES `temas_curso`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `materiales_curso` ADD CONSTRAINT `materiales_curso_autor_id_fkey` FOREIGN KEY (`autor_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `grupos_estudio` ADD CONSTRAINT `grupos_estudio_materia_id_fkey` FOREIGN KEY (`materia_id`) REFERENCES `materias`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `grupos_estudio` ADD CONSTRAINT `grupos_estudio_creador_id_fkey` FOREIGN KEY (`creador_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `miembros_grupo_estudio` ADD CONSTRAINT `miembros_grupo_estudio_grupo_id_fkey` FOREIGN KEY (`grupo_id`) REFERENCES `grupos_estudio`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `miembros_grupo_estudio` ADD CONSTRAINT `miembros_grupo_estudio_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

