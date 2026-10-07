-- CreateTable
CREATE TABLE `Usuario` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(120) NOT NULL,
    `usuario` VARCHAR(60) NOT NULL,
    `email` VARCHAR(160) NOT NULL,
    `passwordHash` VARCHAR(100) NOT NULL,
    `rol` ENUM('VENDEDOR', 'RECEPCION', 'OFICINA_TECNICA', 'PRODUCCION', 'ADMIN') NOT NULL,
    `telefono` VARCHAR(40) NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `creadoEl` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizadoEl` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Usuario_usuario_key`(`usuario`),
    UNIQUE INDEX `Usuario_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Cliente` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(150) NOT NULL,
    `contacto` VARCHAR(150) NULL,
    `telefono` VARCHAR(40) NULL,
    `email` VARCHAR(160) NULL,
    `localidad` VARCHAR(120) NULL,
    `creadoEl` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Cliente_nombre_key`(`nombre`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Contador` (
    `anio` INTEGER NOT NULL,
    `ultimo` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`anio`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Solicitud` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `numero` VARCHAR(20) NOT NULL,
    `anio` INTEGER NOT NULL,
    `correlativo` INTEGER NOT NULL,
    `tokenQr` VARCHAR(40) NOT NULL,
    `clienteId` INTEGER NOT NULL,
    `vendedorId` INTEGER NOT NULL,
    `creadaPorId` INTEGER NOT NULL,
    `fechaIngreso` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `tipoIngreso` ENUM('FOTOS', 'FISICA', 'AMBAS') NOT NULL,
    `descripcion` TEXT NOT NULL,
    `cantidadEstimada` INTEGER NULL,
    `urgencia` ENUM('BAJA', 'NORMAL', 'ALTA', 'URGENTE') NOT NULL DEFAULT 'NORMAL',
    `implemento` VARCHAR(200) NULL,
    `estado` ENUM('INGRESADA', 'RECIBIDA_EN_PLANTA', 'EN_ANALISIS', 'MEDICIONES_PLANO', 'DEFINICION_PROCESOS', 'EVALUACION_MATRIZ', 'APROBADA', 'RECHAZADA', 'CODIGO_CREADO', 'CARGADA_EN_PRODUCCION', 'CERRADA') NOT NULL DEFAULT 'INGRESADA',
    `enEspera` BOOLEAN NOT NULL DEFAULT false,
    `motivoEspera` VARCHAR(500) NULL,
    `fechaUltimoMovimiento` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `sector` VARCHAR(100) NULL,
    `estante` VARCHAR(100) NULL,
    `tenidaPorId` INTEGER NULL,
    `material` VARCHAR(150) NULL,
    `espesor` VARCHAR(60) NULL,
    `dimensiones` VARCHAR(250) NULL,
    `requiereMatriz` ENUM('SIN_EVALUAR', 'SI', 'NO') NOT NULL DEFAULT 'SIN_EVALUAR',
    `matrizObservaciones` TEXT NULL,
    `matrizCostoEstimado` DECIMAL(14, 2) NULL,
    `matrizTiempoEstimadoDias` INTEGER NULL,
    `aprobada` BOOLEAN NULL,
    `motivoRechazo` TEXT NULL,
    `codigoPieza` VARCHAR(100) NULL,
    `codigoCargadoPorId` INTEGER NULL,
    `codigoCargadoEl` DATETIME(3) NULL,
    `cargadaEnProduccionPorId` INTEGER NULL,
    `cargadaEnProduccionEl` DATETIME(3) NULL,
    `idExternoProduccion` VARCHAR(100) NULL,
    `sincronizadaEl` DATETIME(3) NULL,
    `creadoEl` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizadoEl` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Solicitud_numero_key`(`numero`),
    UNIQUE INDEX `Solicitud_tokenQr_key`(`tokenQr`),
    UNIQUE INDEX `Solicitud_codigoPieza_key`(`codigoPieza`),
    INDEX `Solicitud_estado_idx`(`estado`),
    INDEX `Solicitud_vendedorId_idx`(`vendedorId`),
    INDEX `Solicitud_clienteId_idx`(`clienteId`),
    INDEX `Solicitud_fechaIngreso_idx`(`fechaIngreso`),
    INDEX `Solicitud_fechaUltimoMovimiento_idx`(`fechaUltimoMovimiento`),
    UNIQUE INDEX `Solicitud_anio_correlativo_key`(`anio`, `correlativo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Foto` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `solicitudId` INTEGER NOT NULL,
    `ruta` VARCHAR(255) NOT NULL,
    `rutaMiniatura` VARCHAR(255) NOT NULL,
    `tamano` INTEGER NOT NULL,
    `subidaPorId` INTEGER NOT NULL,
    `creadoEl` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Foto_solicitudId_idx`(`solicitudId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Adjunto` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `solicitudId` INTEGER NOT NULL,
    `tipo` ENUM('PLANO', 'IMAGEN', 'DOCUMENTO') NOT NULL,
    `nombreOriginal` VARCHAR(255) NOT NULL,
    `ruta` VARCHAR(255) NOT NULL,
    `mime` VARCHAR(120) NOT NULL,
    `tamano` INTEGER NOT NULL,
    `subidoPorId` INTEGER NOT NULL,
    `creadoEl` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Adjunto_solicitudId_idx`(`solicitudId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Proceso` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(100) NOT NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `orden` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `Proceso_nombre_key`(`nombre`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SolicitudProceso` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `solicitudId` INTEGER NOT NULL,
    `procesoId` INTEGER NOT NULL,
    `orden` INTEGER NOT NULL,
    `observaciones` VARCHAR(500) NULL,

    INDEX `SolicitudProceso_solicitudId_orden_idx`(`solicitudId`, `orden`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MovimientoEstado` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `solicitudId` INTEGER NOT NULL,
    `estadoAnterior` ENUM('INGRESADA', 'RECIBIDA_EN_PLANTA', 'EN_ANALISIS', 'MEDICIONES_PLANO', 'DEFINICION_PROCESOS', 'EVALUACION_MATRIZ', 'APROBADA', 'RECHAZADA', 'CODIGO_CREADO', 'CARGADA_EN_PRODUCCION', 'CERRADA') NULL,
    `estadoNuevo` ENUM('INGRESADA', 'RECIBIDA_EN_PLANTA', 'EN_ANALISIS', 'MEDICIONES_PLANO', 'DEFINICION_PROCESOS', 'EVALUACION_MATRIZ', 'APROBADA', 'RECHAZADA', 'CODIGO_CREADO', 'CARGADA_EN_PRODUCCION', 'CERRADA') NOT NULL,
    `enEspera` BOOLEAN NOT NULL DEFAULT false,
    `motivo` VARCHAR(500) NULL,
    `usuarioId` INTEGER NOT NULL,
    `fecha` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `MovimientoEstado_solicitudId_fecha_idx`(`solicitudId`, `fecha`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MovimientoUbicacion` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `solicitudId` INTEGER NOT NULL,
    `sector` VARCHAR(100) NULL,
    `estante` VARCHAR(100) NULL,
    `tenidaPorId` INTEGER NULL,
    `usuarioId` INTEGER NOT NULL,
    `fecha` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `MovimientoUbicacion_solicitudId_fecha_idx`(`solicitudId`, `fecha`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Comentario` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `solicitudId` INTEGER NOT NULL,
    `usuarioId` INTEGER NOT NULL,
    `texto` TEXT NOT NULL,
    `fecha` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Comentario_solicitudId_fecha_idx`(`solicitudId`, `fecha`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Notificacion` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `usuarioId` INTEGER NOT NULL,
    `solicitudId` INTEGER NULL,
    `canal` ENUM('EMAIL', 'WHATSAPP') NOT NULL DEFAULT 'EMAIL',
    `asunto` VARCHAR(200) NOT NULL,
    `cuerpo` TEXT NOT NULL,
    `estado` ENUM('PENDIENTE', 'ENVIADA', 'ERROR') NOT NULL DEFAULT 'PENDIENTE',
    `error` VARCHAR(500) NULL,
    `creadaEl` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `enviadaEl` DATETIME(3) NULL,

    INDEX `Notificacion_estado_idx`(`estado`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Configuracion` (
    `clave` VARCHAR(60) NOT NULL,
    `valor` VARCHAR(500) NOT NULL,

    PRIMARY KEY (`clave`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ExportacionProduccion` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `solicitudId` INTEGER NOT NULL,
    `usuarioId` INTEGER NOT NULL,
    `formato` VARCHAR(10) NOT NULL,
    `fecha` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ExportacionProduccion_solicitudId_idx`(`solicitudId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Solicitud` ADD CONSTRAINT `Solicitud_clienteId_fkey` FOREIGN KEY (`clienteId`) REFERENCES `Cliente`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Solicitud` ADD CONSTRAINT `Solicitud_vendedorId_fkey` FOREIGN KEY (`vendedorId`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Solicitud` ADD CONSTRAINT `Solicitud_creadaPorId_fkey` FOREIGN KEY (`creadaPorId`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Solicitud` ADD CONSTRAINT `Solicitud_tenidaPorId_fkey` FOREIGN KEY (`tenidaPorId`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Solicitud` ADD CONSTRAINT `Solicitud_codigoCargadoPorId_fkey` FOREIGN KEY (`codigoCargadoPorId`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Solicitud` ADD CONSTRAINT `Solicitud_cargadaEnProduccionPorId_fkey` FOREIGN KEY (`cargadaEnProduccionPorId`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Foto` ADD CONSTRAINT `Foto_solicitudId_fkey` FOREIGN KEY (`solicitudId`) REFERENCES `Solicitud`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Foto` ADD CONSTRAINT `Foto_subidaPorId_fkey` FOREIGN KEY (`subidaPorId`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Adjunto` ADD CONSTRAINT `Adjunto_solicitudId_fkey` FOREIGN KEY (`solicitudId`) REFERENCES `Solicitud`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Adjunto` ADD CONSTRAINT `Adjunto_subidoPorId_fkey` FOREIGN KEY (`subidoPorId`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SolicitudProceso` ADD CONSTRAINT `SolicitudProceso_solicitudId_fkey` FOREIGN KEY (`solicitudId`) REFERENCES `Solicitud`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SolicitudProceso` ADD CONSTRAINT `SolicitudProceso_procesoId_fkey` FOREIGN KEY (`procesoId`) REFERENCES `Proceso`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MovimientoEstado` ADD CONSTRAINT `MovimientoEstado_solicitudId_fkey` FOREIGN KEY (`solicitudId`) REFERENCES `Solicitud`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MovimientoEstado` ADD CONSTRAINT `MovimientoEstado_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MovimientoUbicacion` ADD CONSTRAINT `MovimientoUbicacion_solicitudId_fkey` FOREIGN KEY (`solicitudId`) REFERENCES `Solicitud`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MovimientoUbicacion` ADD CONSTRAINT `MovimientoUbicacion_tenidaPorId_fkey` FOREIGN KEY (`tenidaPorId`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MovimientoUbicacion` ADD CONSTRAINT `MovimientoUbicacion_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Comentario` ADD CONSTRAINT `Comentario_solicitudId_fkey` FOREIGN KEY (`solicitudId`) REFERENCES `Solicitud`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Comentario` ADD CONSTRAINT `Comentario_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Notificacion` ADD CONSTRAINT `Notificacion_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Notificacion` ADD CONSTRAINT `Notificacion_solicitudId_fkey` FOREIGN KEY (`solicitudId`) REFERENCES `Solicitud`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExportacionProduccion` ADD CONSTRAINT `ExportacionProduccion_solicitudId_fkey` FOREIGN KEY (`solicitudId`) REFERENCES `Solicitud`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExportacionProduccion` ADD CONSTRAINT `ExportacionProduccion_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
