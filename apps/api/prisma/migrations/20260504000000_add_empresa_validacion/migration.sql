-- CreateEnum
CREATE TYPE "EstadoValidacion" AS ENUM ('PENDIENTE', 'APROBADA', 'RECHAZADA');

-- AlterTable
ALTER TABLE "Empresa" ADD COLUMN "estadoValidacion" "EstadoValidacion" NOT NULL DEFAULT 'PENDIENTE';
ALTER TABLE "Empresa" ADD COLUMN "motivoRechazo" TEXT;
