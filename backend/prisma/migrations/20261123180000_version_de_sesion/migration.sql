-- Versión de sesión: al subirla se invalidan los tokens emitidos antes.

-- AlterTable
ALTER TABLE `usuarios` ADD COLUMN `version_sesion` INTEGER NOT NULL DEFAULT 0;

