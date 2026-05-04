/**
 * Tipos explícitos para listados (evita "Type instantiation is excessively deep" al inferir AppRouter completo en el cliente).
 */
export type EgresadoListItem = {
  id: string;
  nombre: string;
  apellido: string;
  dni: string;
  carrera: string | null;
  anioEgreso: number | null;
  habilidades: Array<{ habilidadId: string; habilidad: { nombre: string } }>;
};

export type EgresadoCursorItem = EgresadoListItem & {
  user: { email: string };
};

export type OfertaListItem = {
  id: string;
  titulo: string;
  modalidad: string;
  tipoContrato: string;
  salarioMin: number | null;
  salarioMax: number | null;
  estado: string;
  empresa: { nombreComercial: string };
};

export type ReporteListItem = {
  id: string;
  nombreArchivo: string;
  tipo: string;
  estado: string;
  createdAt: Date | string;
  urlArchivo: string | null;
};

export type NotificacionItem = {
  id: string;
  usuarioId: string;
  tipo: string;
  titulo: string;
  contenido: string;
  leida: boolean;
  metadata: unknown;
  createdAt: Date | string;
};

export type EstadoPostulacion = 'POSTULADO' | 'EN_REVISION' | 'ENTREVISTA' | 'CONTRATADO' | 'RECHAZADO';

export type HistorialEstadoItem = {
  id: string;
  estadoAnterior: EstadoPostulacion | null;
  estadoNuevo: EstadoPostulacion;
  motivo: string | null;
  createdAt: Date | string;
};

export type PostulacionListItem = {
  id: string;
  estado: EstadoPostulacion;
  createdAt: Date | string;
  oferta: {
    id: string;
    titulo: string;
    modalidad: string;
    tipoContrato: string;
    empresa: { id: string; nombreComercial: string; logoUrl: string | null };
  };
};

export type PostulanteItem = {
  id: string;
  estado: EstadoPostulacion;
  createdAt: Date | string;
  egresado: {
    id: string;
    nombre: string;
    apellido: string;
    carrera: string | null;
    cvUrl: string | null;
    habilidades: Array<{ habilidadId: string; nivel: string; habilidad: { nombre: string } }>;
  };
};

export type OfertaDetail = {
  id: string;
  titulo: string;
  descripcion: string;
  ubicacion: string | null;
  modalidad: string;
  tipoContrato: string;
  salarioMin: number | null;
  salarioMax: number | null;
  fechaPublicacion: Date | string;
  fechaCierre: Date | string | null;
  estado: string;
  empresa: {
    id: string;
    nombreComercial: string;
    razonSocial: string;
    sector: string | null;
    sitioWeb: string | null;
    descripcion: string | null;
    logoUrl: string | null;
  };
  habilidades: Array<{
    habilidadId: string;
    requerido: boolean;
    habilidad: { id: string; nombre: string; tipo: string };
  }>;
};

export type MiOfertaItem = {
  id: string;
  titulo: string;
  estado: string;
  fechaPublicacion: Date | string;
  _count: { postulaciones: number };
};

export type EstadoValidacion = 'PENDIENTE' | 'APROBADA' | 'RECHAZADA';

export type EmpresaListItem = {
  id: string;
  nombreComercial: string;
  razonSocial: string;
  ruc: string;
  sector: string | null;
  logoUrl: string | null;
  estadoValidacion: EstadoValidacion;
  motivoRechazo: string | null;
  _count: { ofertas: number };
};

export type EmpresaOfertaItem = {
  id: string;
  titulo: string;
  estado: string;
  modalidad: string;
  tipoContrato: string;
  fechaPublicacion: Date | string;
  _count: { postulaciones: number };
};

export type EmpresaDetail = {
  id: string;
  nombreComercial: string;
  razonSocial: string;
  ruc: string;
  sector: string | null;
  sitioWeb: string | null;
  descripcion: string | null;
  logoUrl: string | null;
  estadoValidacion: EstadoValidacion;
  motivoRechazo: string | null;
  ofertas: EmpresaOfertaItem[];
};
