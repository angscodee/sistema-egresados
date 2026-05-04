import {
  EstadoPostulacion,
  EstadoValidacion,
  Modalidad,
  NivelHabilidad,
  PrismaClient,
  Role,
  TipoContrato,
  TipoHabilidad,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const SALT = 10;

// ─── helpers ────────────────────────────────────────────────────────────────

async function hashPwd(plain: string) {
  return bcrypt.hash(plain, SALT);
}

// ─── main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱  Iniciando seed…');

  // ── 1. Admin ──────────────────────────────────────────────────────────────
  const adminEmail = 'admin@example.com';
  const adminPwd = 'password123';

  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash: await hashPwd(adminPwd),
        role: Role.ADMIN,
        admin: { create: { nombreCompleto: 'Administrador del Sistema', area: 'TI' } },
      },
    });
    console.log(`  ✔ Admin creado: ${adminEmail} / ${adminPwd}`);
  } else {
    console.log(`  ⏭  Admin ya existe: ${adminEmail}`);
  }

  // ── 2. Habilidades ────────────────────────────────────────────────────────
  const tecnicas = [
    'JavaScript', 'TypeScript', 'React', 'Node.js', 'Python',
    'SQL', 'Docker', 'Git', 'Java', 'PHP',
  ];
  const blandas = [
    'Comunicación', 'Trabajo en equipo', 'Liderazgo',
    'Resolución de problemas', 'Adaptabilidad',
  ];

  const habilidadMap: Record<string, string> = {};

  for (const nombre of tecnicas) {
    const h = await prisma.habilidad.upsert({
      where: { nombre },
      update: {},
      create: { nombre, tipo: TipoHabilidad.TECNICA, categoria: 'Desarrollo' },
    });
    habilidadMap[nombre] = h.id;
  }
  for (const nombre of blandas) {
    const h = await prisma.habilidad.upsert({
      where: { nombre },
      update: {},
      create: { nombre, tipo: TipoHabilidad.BLANDA, categoria: 'Soft Skills' },
    });
    habilidadMap[nombre] = h.id;
  }
  console.log(`  ✔ ${tecnicas.length + blandas.length} habilidades upserted`);

  // ── 3. Empresas demo ──────────────────────────────────────────────────────
  const empresasData = [
    {
      email: 'empresa@example.com',
      pwd: 'password123',
      nombreComercial: 'TechCorp SAC',
      razonSocial: 'TechCorp Sociedad Anónima Cerrada',
      ruc: '20123456781',
      sector: 'Tecnología',
      descripcion: 'Empresa líder en desarrollo de software empresarial.',
      ofertas: [
        {
          titulo: 'Desarrollador Full Stack',
          descripcion: 'Buscamos desarrollador con experiencia en React y Node.js para proyectos de alto impacto.',
          modalidad: Modalidad.HIBRIDO,
          tipoContrato: TipoContrato.TIEMPO_COMPLETO,
          salarioMin: 3500,
          salarioMax: 5000,
          habilidades: ['JavaScript', 'TypeScript', 'React', 'Node.js'],
        },
        {
          titulo: 'DevOps Engineer',
          descripcion: 'Responsable de la infraestructura CI/CD y contenedores Docker.',
          modalidad: Modalidad.REMOTO,
          tipoContrato: TipoContrato.TIEMPO_COMPLETO,
          salarioMin: 4000,
          salarioMax: 6000,
          habilidades: ['Docker', 'Git', 'Python'],
        },
      ],
    },
    {
      email: 'empresa2@demo.com',
      pwd: 'password123',
      nombreComercial: 'DataSolutions Peru',
      razonSocial: 'DataSolutions Peru S.A.',
      ruc: '20987654321',
      sector: 'Consultoría',
      descripcion: 'Consultoría especializada en análisis de datos y BI.',
      ofertas: [
        {
          titulo: 'Analista de Datos',
          descripcion: 'Análisis de grandes volúmenes de datos con Python y SQL.',
          modalidad: Modalidad.PRESENCIAL,
          tipoContrato: TipoContrato.TIEMPO_COMPLETO,
          salarioMin: 2800,
          salarioMax: 4200,
          habilidades: ['Python', 'SQL'],
        },
      ],
    },
  ];

  const empresaIds: string[] = [];

  for (const ed of empresasData) {
    let user = await prisma.user.findUnique({ where: { email: ed.email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: ed.email,
          passwordHash: await hashPwd(ed.pwd),
          role: Role.EMPRESA,
          empresa: {
            create: {
              nombreComercial: ed.nombreComercial,
              razonSocial: ed.razonSocial,
              ruc: ed.ruc,
              sector: ed.sector,
              descripcion: ed.descripcion,
              estadoValidacion: EstadoValidacion.APROBADA,
            },
          },
        },
      });
      console.log(`  ✔ Empresa creada: ${ed.email}`);
    } else {
      console.log(`  ⏭  Empresa ya existe: ${ed.email}`);
    }
    empresaIds.push(user.id);

    // Create offers
    for (const o of ed.ofertas) {
      const existing = await prisma.ofertaLaboral.findFirst({
        where: { empresaId: user.id, titulo: o.titulo },
        select: { id: true },
      });
      if (!existing) {
        await prisma.ofertaLaboral.create({
          data: {
            empresaId: user.id,
            titulo: o.titulo,
            descripcion: o.descripcion,
            modalidad: o.modalidad,
            tipoContrato: o.tipoContrato,
            salarioMin: o.salarioMin,
            salarioMax: o.salarioMax,
            habilidades: {
              create: o.habilidades
                .filter((h) => habilidadMap[h])
                .map((h) => ({ habilidadId: habilidadMap[h], requerido: true })),
            },
          },
        });
      }
    }
  }

  // ── 4. Egresados demo ─────────────────────────────────────────────────────
  const egresadosData = [
    {
      email: 'egresado@example.com',
      pwd: 'password123',
      nombre: 'Juan',
      apellido: 'Pérez',
      dni: '12345678',
      carrera: 'Ingeniería de Sistemas',
      anioEgreso: 2021,
      habilidades: [
        { nombre: 'JavaScript', nivel: NivelHabilidad.AVANZADO },
        { nombre: 'React', nivel: NivelHabilidad.INTERMEDIO },
        { nombre: 'Git', nivel: NivelHabilidad.AVANZADO },
        { nombre: 'Comunicación', nivel: NivelHabilidad.INTERMEDIO },
      ],
    },
    {
      email: 'maria.garcia@demo.com',
      pwd: 'Demo1234!',
      nombre: 'María',
      apellido: 'García',
      dni: '87654321',
      carrera: 'Ingeniería de Software',
      anioEgreso: 2022,
      habilidades: [
        { nombre: 'Python', nivel: NivelHabilidad.AVANZADO },
        { nombre: 'SQL', nivel: NivelHabilidad.AVANZADO },
        { nombre: 'Docker', nivel: NivelHabilidad.INTERMEDIO },
        { nombre: 'Trabajo en equipo', nivel: NivelHabilidad.AVANZADO },
      ],
    },
    {
      email: 'carlos.lopez@demo.com',
      pwd: 'Demo1234!',
      nombre: 'Carlos',
      apellido: 'López',
      dni: '11223344',
      carrera: 'Ciencias de la Computación',
      anioEgreso: 2020,
      habilidades: [
        { nombre: 'Java', nivel: NivelHabilidad.AVANZADO },
        { nombre: 'TypeScript', nivel: NivelHabilidad.INTERMEDIO },
        { nombre: 'Git', nivel: NivelHabilidad.AVANZADO },
        { nombre: 'Liderazgo', nivel: NivelHabilidad.INTERMEDIO },
      ],
    },
    {
      email: 'ana.torres@demo.com',
      pwd: 'Demo1234!',
      nombre: 'Ana',
      apellido: 'Torres',
      dni: '44332211',
      carrera: 'Ingeniería Industrial',
      anioEgreso: 2023,
      habilidades: [
        { nombre: 'SQL', nivel: NivelHabilidad.INTERMEDIO },
        { nombre: 'Python', nivel: NivelHabilidad.BASICO },
        { nombre: 'Adaptabilidad', nivel: NivelHabilidad.AVANZADO },
        { nombre: 'Resolución de problemas', nivel: NivelHabilidad.AVANZADO },
      ],
    },
    {
      email: 'luis.mendoza@demo.com',
      pwd: 'Demo1234!',
      nombre: 'Luis',
      apellido: 'Mendoza',
      dni: '55667788',
      carrera: 'Ingeniería de Sistemas',
      anioEgreso: 2022,
      habilidades: [
        { nombre: 'Node.js', nivel: NivelHabilidad.AVANZADO },
        { nombre: 'TypeScript', nivel: NivelHabilidad.AVANZADO },
        { nombre: 'Docker', nivel: NivelHabilidad.INTERMEDIO },
        { nombre: 'Git', nivel: NivelHabilidad.EXPERTO },
      ],
    },
  ];

  const egresadoIds: string[] = [];

  for (const ed of egresadosData) {
    let user = await prisma.user.findUnique({ where: { email: ed.email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: ed.email,
          passwordHash: await hashPwd(ed.pwd),
          role: Role.EGRESADO,
          egresado: {
            create: {
              nombre: ed.nombre,
              apellido: ed.apellido,
              dni: ed.dni,
              carrera: ed.carrera,
              anioEgreso: ed.anioEgreso,
              habilidades: {
                create: ed.habilidades
                  .filter((h) => habilidadMap[h.nombre])
                  .map((h) => ({
                    habilidadId: habilidadMap[h.nombre],
                    nivel: h.nivel,
                  })),
              },
            },
          },
        },
      });
      console.log(`  ✔ Egresado creado: ${ed.email}`);
    } else {
      console.log(`  ⏭  Egresado ya existe: ${ed.email}`);
    }
    egresadoIds.push(user.id);
  }

  // ── 5. Postulaciones demo ─────────────────────────────────────────────────
  // Get all active offers
  const ofertas = await prisma.ofertaLaboral.findMany({
    select: { id: true, empresaId: true },
    take: 10,
  });

  if (ofertas.length > 0 && egresadoIds.length > 0) {
    let postCount = 0;
    for (let i = 0; i < Math.min(egresadoIds.length, ofertas.length); i++) {
      const egresadoId = egresadoIds[i];
      const oferta = ofertas[i % ofertas.length];

      const existing = await prisma.postulacion.findUnique({
        where: { ofertaId_egresadoId: { ofertaId: oferta.id, egresadoId } },
        select: { id: true },
      });

      if (!existing) {
        const estados: EstadoPostulacion[] = [
          EstadoPostulacion.POSTULADO,
          EstadoPostulacion.EN_REVISION,
          EstadoPostulacion.ENTREVISTA,
          EstadoPostulacion.CONTRATADO,
          EstadoPostulacion.RECHAZADO,
        ];
        const estado = estados[i % estados.length];

        const post = await prisma.postulacion.create({
          data: { ofertaId: oferta.id, egresadoId, estado },
        });

        // Add history if not initial state
        if (estado !== EstadoPostulacion.POSTULADO) {
          await prisma.historialEstado.create({
            data: {
              postulacionId: post.id,
              estadoAnterior: EstadoPostulacion.POSTULADO,
              estadoNuevo: estado,
              motivo: 'Actualización automática de demo',
            },
          });
        }
        postCount++;
      }
    }
    console.log(`  ✔ ${postCount} postulaciones demo creadas`);
  }

  console.log('\n✅  Seed completado.');
  console.log('\n  Credenciales de acceso:');
  console.log(`  Admin:    admin@example.com / password123`);
  console.log(`  Empresa:  empresa@example.com / password123`);
  console.log(`  Empresa2: empresa2@demo.com / password123`);
  console.log(`  Egresado: egresado@example.com / password123`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
