-- Se elimina el tipo «Examen resuelto» del repositorio.
-- Los recursos que ya lo tuvieran pasan a «Otro» antes de reducir el ENUM.
UPDATE `recursos` SET `tipo` = 'OTHER' WHERE `tipo` = 'EXAM';

-- AlterTable
ALTER TABLE `recursos` MODIFY `tipo` ENUM('NOTE', 'STUDY_GUIDE', 'BOOK', 'OTHER') NOT NULL;
