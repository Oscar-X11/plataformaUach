-- Licenciaturas e ingenierías son cuatrimestrales; el bachillerato, semestral.
-- Lo existente queda como cuatrimestral (valor por omisión).

-- AlterTable
ALTER TABLE `facultades` ADD COLUMN `tipo_periodo` ENUM('CUATRIMESTRAL', 'SEMESTRAL') NOT NULL DEFAULT 'CUATRIMESTRAL';

-- AlterTable
ALTER TABLE `periodos` ADD COLUMN `tipo` ENUM('CUATRIMESTRAL', 'SEMESTRAL') NOT NULL DEFAULT 'CUATRIMESTRAL';

