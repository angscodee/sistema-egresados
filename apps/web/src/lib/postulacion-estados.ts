import type { EstadoPostulacion } from './api-types';

export const ESTADO_LABELS: Record<EstadoPostulacion, string> = {
  POSTULADO: 'Postulado',
  EN_REVISION: 'En revisión',
  ENTREVISTA: 'Entrevista',
  CONTRATADO: 'Contratado',
  RECHAZADO: 'Rechazado',
};

/** Tailwind classes for each estado badge */
export const ESTADO_COLORS: Record<EstadoPostulacion, string> = {
  POSTULADO: 'bg-blue-100 text-blue-800 border-blue-200',
  EN_REVISION: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  ENTREVISTA: 'bg-orange-100 text-orange-800 border-orange-200',
  CONTRATADO: 'bg-green-100 text-green-800 border-green-200',
  RECHAZADO: 'bg-red-100 text-red-800 border-red-200',
};

export const ESTADO_DOT: Record<EstadoPostulacion, string> = {
  POSTULADO: 'bg-blue-500',
  EN_REVISION: 'bg-yellow-500',
  ENTREVISTA: 'bg-orange-500',
  CONTRATADO: 'bg-green-500',
  RECHAZADO: 'bg-red-500',
};

export const ESTADOS_TRANSICION: EstadoPostulacion[] = [
  'POSTULADO',
  'EN_REVISION',
  'ENTREVISTA',
  'CONTRATADO',
  'RECHAZADO',
];

export const MODALIDAD_LABELS: Record<string, string> = {
  REMOTO: 'Remoto',
  HIBRIDO: 'Híbrido',
  PRESENCIAL: 'Presencial',
};

export const CONTRATO_LABELS: Record<string, string> = {
  TIEMPO_COMPLETO: 'Tiempo completo',
  MEDIO_TIEMPO: 'Medio tiempo',
  POR_PROYECTO: 'Por proyecto',
  PRACTICAS: 'Prácticas',
};
