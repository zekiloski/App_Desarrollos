-- AlterTable
ALTER TABLE `Usuario` ADD COLUMN `verRecorrido` BOOLEAN NOT NULL DEFAULT false;

-- Habilitados de entrada: Oficina Técnica, José Melián y Pablo Del Boca. El administrador lo cambia por usuario.
UPDATE `Usuario` SET `verRecorrido` = true
WHERE `rol` IN ('ADMIN', 'OFICINA_TECNICA')
   OR `nombre` LIKE '%Jose%Melian%'
   OR `nombre` LIKE '%Pablo%Del%Boca%'
   OR `nombre` LIKE '%Pablo%Delboca%';
