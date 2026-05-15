# Library Loans API

Sistema de préstamos de biblioteca — Examen parcial ISIS 3710

## Características Implementadas

- ✅ **Autenticación JWT**: Endpoints protegidos con JWT bearer tokens
- ✅ **Gestión de Usuarios**: Roles (admin, librarian, member) con password hashing bcrypt
- ✅ **Gestión de Items**: Libros, revistas y equipos con soft delete
- ✅ **Gestión de Préstamos**: Lógica completa de préstamos con multas automáticas
- ✅ **Validación Automática**: Reglas de negocio críticas (R1-R5) implementadas
- ✅ **Swagger UI**: Documentación interactiva en `/api/docs`
- ✅ **TypeORM Migrations**: SQL puro para control de versiones de BD

## Instalación y Configuración Rápida

### 1. Variables de entorno
```bash
cp .env.example .env
```

### 2. Base de datos (Docker)
```bash
docker compose up -d
```

### 3. Dependencias
```bash
npm install
```

### 4. Migraciones
```bash
npm run migration:run
```

### 5. Iniciar servidor
```bash
npm run start:dev
```

**Servidor disponible en**: `http://localhost:3000`  
**Swagger UI**: `http://localhost:3000/api/docs`

---

## Ejemplos de Uso

### Registrar un usuario

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "librarian@example.com",
    "password": "securePassword123",
    "firstName": "Juan",
    "lastName": "Pérez"
  }'
```

**Respuesta:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "librarian@example.com",
    "firstName": "Juan",
    "lastName": "Pérez",
    "role": "member",
    "isActive": true,
    "createdAt": "2026-05-15T...",
    "updatedAt": "2026-05-15T..."
  }
}
```

### Iniciar sesión

```bash
curl -X POST http://localhost:3000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "librarian@example.com",
    "password": "securePassword123"
  }'
```

### Crear un item (requiere autenticación)

```bash
curl -X POST http://localhost:3000/api/items \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {accessToken}" \
  -d '{
    "code": "BK-0042",
    "title": "Clean Code",
    "type": "book"
  }'
```

### Crear un préstamo

```bash
curl -X POST http://localhost:3000/api/loans \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {accessToken}" \
  -d '{
    "userId": "user-uuid",
    "itemId": "item-uuid",
    "dueAt": "2026-02-15T00:00:00.000Z"
  }'
```

### Devolver un préstamo

```bash
curl -X PATCH http://localhost:3000/api/loans/{loanId}/return \
  -H "Authorization: Bearer {accessToken}"
```

---

## Estructura del Proyecto

```
src/
├── auth/                    # Autenticación JWT
│   ├── auth.service.ts      # Lógica de register/signin
│   ├── auth.controller.ts   # Endpoints /auth/register, /auth/signin, /auth/me
│   ├── auth.module.ts       # Módulo auth
│   ├── jwt-auth.guard.ts    # Guard global + @Public()
│   ├── jwt-auth.strategy.ts # Estrategia Passport JWT
│   └── dto/
│       ├── register.dto.ts
│       ├── login.dto.ts
│       └── user-me.dto.ts
├── items/                   # Gestión de items
│   ├── items.service.ts     # CRUD + cálculo de isAvailable
│   ├── items.controller.ts  # Endpoints /items
│   ├── items.module.ts
│   └── dto/
│       ├── create-item.dto.ts
│       └── update-item.dto.ts
├── loans/                   # Gestión de préstamos
│   ├── loans.service.ts     # Reglas R1-R5, cálculo de multas
│   ├── loans.controller.ts  # Endpoints /loans
│   ├── loans.module.ts
│   └── dto/
│       ├── create-loan.dto.ts
│       ├── get-loans.dto.ts
│       ├── return-loan.dto.ts
│       └── mark-lost.dto.ts
├── user/
│   └── user.entity.ts       # Entidad User con @Exclude() en passwordHash
├── item/
│   └── item.entity.ts       # Entidad Item
├── loan/
│   └── loan.entity.ts       # Entidad Loan
├── common/
│   ├── enums/
│   │   ├── role.enum.ts
│   │   ├── book-type.enum.ts
│   │   └── loan-status.enum.ts
│   └── decorators/
│       └── public.decorator.ts
├── database/
│   ├── data-source.ts
│   └── migrations/
│       └── InitialSchemaMigration.ts (raw SQL)
├── config/
│   ├── configuration.ts
│   └── validation.schema.ts
├── app.module.ts            # Global JwtAuthGuard + módulos
└── main.ts                  # Swagger + ValidationPipe
```

---

## Reglas de Negocio Implementadas

### **R1: Validación de Fechas**
- Préstamo mínimo: `dueAt > loanedAt`
- Máximo 30 días: `(dueAt - loanedAt) ≤ 30 días`
- Error: `BadRequestException` (HTTP 400)

### **R2: Item Disponible**
- Item con estado `active` u `overdue` **no puede ser prestado**
- Error: `ConflictException` (HTTP 409) con `loanId` que bloquea

### **R3: Límite de Préstamos por Usuario**
- Máximo `MAX_ACTIVE_LOANS = 3` préstamos simultáneamente
- Cuantifica: `active` + `overdue`
- Error: `ConflictException` (HTTP 409)

### **R4: Cálculo de Multa**
```
daysOverdue = max(0, ceil((returnedAt - dueAt) / 1 día))
fineAmount = daysOverdue × DAILY_FINE_RATE (default 0.50 USD/día)
```

**Tabla de ejemplos:**
| dueAt | returnedAt | daysOverdue | fineAmount |
|-------|-----------|------------|-----------|
| 2026-01-10 | 2026-01-10 | 0 | $0.00 |
| 2026-01-10 | 2026-01-11 | 1 | $0.50 |
| 2026-01-10 | 2026-01-15 | 5 | $2.50 |
| 2026-01-10 | 2026-01-12 12:00 | 3 (ceil) | $1.50 |

**Nota**: Devolver 1 minuto tarde = 1 día de multa (Math.ceil).

### **R5: Transiciones FSM de Loan**
| Desde | Hacia | Válido | Cómo |
|-------|-------|--------|------|
| `active` | `overdue` | ✅ | Automático si `dueAt < now()` |
| `active` | `returned` | ✅ | `PATCH /loans/:id/return` |
| `active` | `lost` | ✅ | `PATCH /loans/:id/mark-lost` |
| `overdue` | `returned` | ✅ | `PATCH /loans/:id/return` |
| `overdue` | `lost` | ✅ | `PATCH /loans/:id/mark-lost` |
| `returned` | * | ❌ | Terminal (BadRequestException) |
| `lost` | * | ❌ | Terminal (BadRequestException) |

---

## Configuración de Parámetros

Modifica `.env` para personalizar:

```env
# Seguridad (mínimo 32 caracteres)
JWT_ACCESS_SECRET=tu_secret_key_minimo_32_caracteres_aqui
JWT_ACCESS_EXPIRES_IN=15m

# Base de datos
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=library_loans_db

# Reglas de negocio
MAX_ACTIVE_LOANS=3              # Límite de préstamos por usuario
DAILY_FINE_RATE=0.50            # USD por día de retraso
MAX_LOAN_DAYS=30                # Días máximos de préstamo
BCRYPT_SALT_ROUNDS=12           # Costo de hash bcrypt
```

---

## Decisión: Transición Automática a Overdue (R5)

**Estrategia**: Query-time filtering (sin cron jobs)

**Cómo funciona**:
1. Al consultar `GET /loans?status=overdue`, el servicio filtra:
   ```sql
   WHERE status = 'active'
   AND dueAt < NOW()
   AND returnedAt IS NULL
   ```

2. El estado en BD **NO se actualiza automáticamente**

**Ventajas**:
- ✅ Simple, sin dependencias de infraestructura (cron, bull queue)
- ✅ Datos siempre consistentes
- ✅ Flexible: cambiar definición de overdue sin migración

**Alternativa** (no implementada):
- Usar trigger en PostgreSQL para actualizar automáticamente el estado

---

## Tests Unitarios

**Ubicación**: `src/__tests__/loans.service.spec.ts`

**Casos cubiertos**:
1. ✅ Crea préstamo exitoso (item disponible, usuario bajo límite, fechas válidas)
2. ✅ Rechaza si item ya tiene préstamo activo (R2)
3. ✅ Rechaza si usuario alcanza límite de 3 (R3)
4. ✅ Calcula multa correctamente (R4): 5 días tarde = $2.50

**Ejecutar**:
```bash
npm test                # Todos los tests
npm run test:watch     # Modo watch
npm run test:cov       # Cobertura
```

---

## Endpoints Documentados

### Auth
- `POST /auth/register` — Crear usuario (rol `member`)
- `POST /auth/signin` — Iniciar sesión (obtener JWT)
- `GET /auth/me` — Perfil del usuario autenticado

### Items
- `POST /items` — Crear item
- `GET /items` — Listar items activos (filtro opcional: `?type=book|magazine|equipment`)
- `GET /items/:id` — Detalle de item (incluye `isAvailable`)
- `PATCH /items/:id` — Actualizar item
- `DELETE /items/:id` — Soft delete

### Loans
- `POST /loans` — Crear préstamo
- `GET /loans` — Listar préstamos (filtros: `?userId=`, `?itemId=`, `?status=`)
- `GET /loans/:id` — Detalle de préstamo
- `PATCH /loans/:id/return` — Marcar como devuelto (calcula multa)
- `PATCH /loans/:id/mark-lost` — Marcar como perdido

---

## Códigos HTTP

| Código | Situación |
|--------|-----------|
| **201** | POST exitoso |
| **200** | GET/PATCH exitoso |
| **204** | DELETE exitoso (sin body) |
| **400** | DTO inválido o regla R1 violada |
| **404** | Recurso no encontrado |
| **409** | Conflicto de negocio (R2, R3) |
| **422** | Conflicto de negocio (R2, R3) — versión alternativa |
| **401** | Token JWT ausente o inválido |

---

## Scripts Disponibles

```bash
# Desarrollo
npm run start:dev       # Hot reload
npm run build           # Compilar a dist/
npm run start:prod      # Ejecutar build compilado

# Pruebas
npm test               # Tests unitarios
npm run test:watch    # Modo watch
npm run test:cov      # Cobertura

# Migraciones TypeORM
npm run migration:run  # Aplicar pendientes
npm run migration:revert # Revertir última

# Código
npm run lint          # ESLint + autofix
npm run format        # Prettier
```

---

## Bonos NO Implementados

- **B1: Queue de Reservas** — Reservar item cuando esté disponible
- **B2: Refresh Tokens** — Renovar JWT sin re-login
- **B3: Roles Diferenciados** — Permisos según admin/librarian/member

---

## Troubleshooting

| Error | Solución |
|-------|----------|
| `ECONNREFUSED 127.0.0.1:5432` | Inicia PostgreSQL: `docker compose up -d` |
| `UNIQUE constraint violation` en email | Email ya registrado, usa otro |
| `401 Unauthorized` | Token expirado o inválido, genera nuevo en `/auth/signin` |
| Swagger no carga | Verifica `SWAGGER_ENABLED=true` en `.env` y recarga |
| `Cannot find module` | Ejecuta `npm install` |

---

## Referencias

- [NestJS Docs](https://docs.nestjs.com/)
- [TypeORM Docs](https://typeorm.io/)
- [Passport JWT](https://docs.nestjs.com/recipes/passport)
- [Swagger](https://docs.nestjs.com/openapi/introduction)

---

**Versión**: 0.1.0  
**Última actualización**: 15 de mayo de 2026

## Arranque rápido

```bash
# 1) Variables de entorno
cp .env.example .env

# 2) Base de datos
docker compose up -d

# 3) Dependencias
npm install

# 4) Build
npm run build

# 5) Arrancar la app en modo desarrollo
npm run start:dev
```

Abre [http://localhost:3000/api/docs](http://localhost:3000/api/docs) y deberías ver el Swagger UI con el módulo `health` ya disponible.

## Scripts disponibles

| Script | Descripción |
|---|---|
| `npm run start:dev` | Arranca con hot reload. |
| `npm run start:prod` | Arranca el build de producción (requiere `npm run build` antes). |
| `npm run build` | Compila TypeScript a `dist/`. |
| `npm run lint` | ESLint con autofix. |
| `npm run format` | Prettier. |
| `npm test` | Tests unitarios. |
| `npm run test:cov` | Tests con coverage. |
| `npm run test:e2e` | Tests e2e con `jest-e2e.json`. |
| `npm run migration:generate src/database/migrations/NombreDeLaMigracion` | Genera migración a partir del diff entre entidades y BD. |
| `npm run migration:run` | Aplica migraciones pendientes. |
| `npm run migration:revert` | Revierte la última migración. |

## Estructura

```
library-loans-scaffold/
├── docker-compose.yml          # Postgres 16-alpine
├── .env.example                # plantilla de variables (cópiala a .env)
├── package.json
├── tsconfig.json
├── nest-cli.json
├── src/
│   ├── main.ts                 # bootstrap: ValidationPipe + Swagger + /api prefix
│   ├── app.module.ts           # ConfigModule + TypeOrmModule + HealthModule
│   ├── config/
│   │   ├── configuration.ts    # AppConfig interface + factory
│   │   └── validation.schema.ts # Joi schema
│   ├── database/
│   │   ├── data-source.ts      # DataSource para CLI de TypeORM
│   │   └── migrations/         # (vacío — aquí van tus migraciones)
│   ├── common/
│   │   └── decorators/
│   │       └── public.decorator.ts
│   └── modules/
│       └── health/
│           ├── health.module.ts
│           └── health.controller.ts
└── test/
    └── jest-e2e.json
```

## Aliases de path

Configurados en `tsconfig.json` para imports limpios:

```typescript
import { ItemsModule } from '@modules/items/items.module';
import { Public } from '@common/decorators/public.decorator';
import configuration from '@config/configuration';
import { AppDataSource } from '@database/data-source';
```

## Configuración: variables que el scaffold ya valida

El `validationSchema` de Joi exige al arranque:

- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` (todas requeridas, sin defaults).
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` (mínimo 32 caracteres).
- `BCRYPT_SALT_ROUNDS` (4-15, default 10).
- `MAX_ACTIVE_LOANS` (default 3), `DAILY_FINE_RATE` (default 0.50), `MAX_LOAN_DAYS` (default 30) — usadas por las reglas de negocio que implementarás (ver enunciado §4.4).

Si falta alguna requerida o no cumple el formato, la app **falla al arrancar** con un mensaje claro.

## Siguiente paso

Lee el enunciado completo:

```bash
open ../meditrack-api/docs/enunciado-parcial.md
```

Empieza por implementar la entidad `User` y el módulo `auth` (§4.1 del enunciado). Sin auth, los demás endpoints no se pueden probar.

¡Éxitos!
