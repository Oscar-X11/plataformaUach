-- La clase se define por carrera y cuatrimestre/semestre (como «Crear clase» de Classroom).
-- La materia pasa a ser opcional. Los cursos existentes toman la carrera y el grado de su materia.

-- 1. Columnas nuevas, primero opcionales para poder rellenarlas.
ALTER TABLE `cursos` ADD COLUMN `carrera_id` VARCHAR(191) NULL,
    ADD COLUMN `grado` INTEGER NULL,
    MODIFY `materia_id` VARCHAR(191) NULL;

-- 2. Rellenar desde la materia de cada curso.
UPDATE `cursos` c
JOIN `materias` m ON m.`id` = c.`materia_id`
SET c.`carrera_id` = m.`carrera_id`, c.`grado` = m.`semestre`;

-- 3. Ya obligatorias.
ALTER TABLE `cursos` MODIFY `carrera_id` VARCHAR(191) NOT NULL,
    MODIFY `grado` INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE `cursos` ADD CONSTRAINT `cursos_carrera_id_fkey` FOREIGN KEY (`carrera_id`) REFERENCES `carreras`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
