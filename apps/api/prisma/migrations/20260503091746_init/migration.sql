-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'EGRESADO', 'EMPRESA');

-- CreateEnum
CREATE TYPE "TipoHabilidad" AS ENUM ('TECNICA', 'BLANDA');

-- CreateEnum
CREATE TYPE "NivelHabilidad" AS ENUM ('BASICO', 'INTERMEDIO', 'AVANZADO', 'EXPERTO');

-- CreateEnum
CREATE TYPE "Modalidad" AS ENUM ('REMOTO', 'HIBRIDO', 'PRESENCIAL');

-- CreateEnum
CREATE TYPE "TipoContrato" AS ENUM ('TIEMPO_COMPLETO', 'MEDIO_TIEMPO', 'POR_PROYECTO', 'PRACTICAS');

-- CreateEnum
CREATE TYPE "EstadoOferta" AS ENUM ('ACTIVA', 'CERRADA', 'EN_REVISION');

-- CreateEnum
CREATE TYPE "EstadoPostulacion" AS ENUM ('POSTULADO', 'EN_REVISION', 'ENTREVISTA', 'CONTRATADO', 'RECHAZADO');

-- CreateEnum
CREATE TYPE "EstadoReporte" AS ENUM ('PENDIENTE', 'PROCESANDO', 'COMPLETADO', 'FALLIDO');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLogin" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Egresado" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "dni" TEXT NOT NULL,
    "fechaNacimiento" TIMESTAMP(3),
    "telefono" TEXT,
    "direccion" TEXT,
    "carrera" TEXT,
    "anioEgreso" INTEGER,
    "cvUrl" TEXT,
    "formacionAcademica" JSONB NOT NULL DEFAULT '[]',
    "experienciaLaboral" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "Egresado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Empresa" (
    "id" TEXT NOT NULL,
    "nombreComercial" TEXT NOT NULL,
    "razonSocial" TEXT NOT NULL,
    "ruc" TEXT NOT NULL,
    "sector" TEXT,
    "sitioWeb" TEXT,
    "descripcion" TEXT,
    "logoUrl" TEXT,

    CONSTRAINT "Empresa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Administrador" (
    "id" TEXT NOT NULL,
    "nombreCompleto" TEXT NOT NULL,
    "area" TEXT,

    CONSTRAINT "Administrador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Habilidad" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" "TipoHabilidad" NOT NULL,
    "categoria" TEXT,

    CONSTRAINT "Habilidad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EgresadoHabilidad" (
    "egresadoId" TEXT NOT NULL,
    "habilidadId" TEXT NOT NULL,
    "nivel" "NivelHabilidad" NOT NULL,

    CONSTRAINT "EgresadoHabilidad_pkey" PRIMARY KEY ("egresadoId","habilidadId")
);

-- CreateTable
CREATE TABLE "OfertaLaboral" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "ubicacion" TEXT,
    "modalidad" "Modalidad" NOT NULL,
    "tipoContrato" "TipoContrato" NOT NULL,
    "salarioMin" DOUBLE PRECISION,
    "salarioMax" DOUBLE PRECISION,
    "fechaPublicacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaCierre" TIMESTAMP(3),
    "estado" "EstadoOferta" NOT NULL DEFAULT 'ACTIVA',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OfertaLaboral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfertaHabilidad" (
    "ofertaId" TEXT NOT NULL,
    "habilidadId" TEXT NOT NULL,
    "requerido" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "OfertaHabilidad_pkey" PRIMARY KEY ("ofertaId","habilidadId")
);

-- CreateTable
CREATE TABLE "Postulacion" (
    "id" TEXT NOT NULL,
    "ofertaId" TEXT NOT NULL,
    "egresadoId" TEXT NOT NULL,
    "estado" "EstadoPostulacion" NOT NULL DEFAULT 'POSTULADO',
    "comentario" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Postulacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistorialEstado" (
    "id" TEXT NOT NULL,
    "postulacionId" TEXT NOT NULL,
    "estadoAnterior" "EstadoPostulacion",
    "estadoNuevo" "EstadoPostulacion" NOT NULL,
    "motivo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistorialEstado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notificacion" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "contenido" TEXT NOT NULL,
    "leida" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notificacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reporte" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "nombreArchivo" TEXT NOT NULL,
    "urlArchivo" TEXT,
    "parametros" JSONB,
    "estado" "EstadoReporte" NOT NULL DEFAULT 'PENDIENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Reporte_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditoriaLog" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT,
    "accion" TEXT NOT NULL,
    "entidad" TEXT NOT NULL,
    "datosPrevios" JSONB,
    "datosNuevos" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditoriaLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Egresado_dni_key" ON "Egresado"("dni");

-- CreateIndex
CREATE UNIQUE INDEX "Empresa_ruc_key" ON "Empresa"("ruc");

-- CreateIndex
CREATE UNIQUE INDEX "Habilidad_nombre_key" ON "Habilidad"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Postulacion_ofertaId_egresadoId_key" ON "Postulacion"("ofertaId", "egresadoId");

-- AddForeignKey
ALTER TABLE "Egresado" ADD CONSTRAINT "Egresado_id_fkey" FOREIGN KEY ("id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Empresa" ADD CONSTRAINT "Empresa_id_fkey" FOREIGN KEY ("id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Administrador" ADD CONSTRAINT "Administrador_id_fkey" FOREIGN KEY ("id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EgresadoHabilidad" ADD CONSTRAINT "EgresadoHabilidad_egresadoId_fkey" FOREIGN KEY ("egresadoId") REFERENCES "Egresado"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EgresadoHabilidad" ADD CONSTRAINT "EgresadoHabilidad_habilidadId_fkey" FOREIGN KEY ("habilidadId") REFERENCES "Habilidad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfertaLaboral" ADD CONSTRAINT "OfertaLaboral_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfertaHabilidad" ADD CONSTRAINT "OfertaHabilidad_ofertaId_fkey" FOREIGN KEY ("ofertaId") REFERENCES "OfertaLaboral"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfertaHabilidad" ADD CONSTRAINT "OfertaHabilidad_habilidadId_fkey" FOREIGN KEY ("habilidadId") REFERENCES "Habilidad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Postulacion" ADD CONSTRAINT "Postulacion_ofertaId_fkey" FOREIGN KEY ("ofertaId") REFERENCES "OfertaLaboral"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Postulacion" ADD CONSTRAINT "Postulacion_egresadoId_fkey" FOREIGN KEY ("egresadoId") REFERENCES "Egresado"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistorialEstado" ADD CONSTRAINT "HistorialEstado_postulacionId_fkey" FOREIGN KEY ("postulacionId") REFERENCES "Postulacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notificacion" ADD CONSTRAINT "Notificacion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reporte" ADD CONSTRAINT "Reporte_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
