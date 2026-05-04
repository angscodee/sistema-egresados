# packages/database/prisma

El schema de Prisma canónico se encuentra en `apps/api/prisma/schema.prisma`.

Esta carpeta existe para cumplir con la estructura del monorepo documentada en el checklist.
El schema se mantiene en `apps/api/` porque NestJS y el worker lo consumen directamente
y Prisma CLI necesita estar co-ubicado con el proyecto que lo usa.

Para regenerar el cliente:
```bash
npm run db:generate
```

Para ejecutar migraciones:
```bash
npm run db:migrate
```
