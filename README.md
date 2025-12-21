# Egremy Spaces - Frontend

Sistema de Gestión de Proyectos para Automatizaciones n8n.

## Stack

- **React 18** + TypeScript
- **Vite** para build/dev
- **Tailwind CSS** con dark mode
- **Supabase** para auth y data
- **Zustand** para estado global
- **React Router 6** para navegación
- **Lucide React** para iconos
- **Sonner** para toasts

## Setup

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
```

Editar `.env`:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
VITE_APP_URL=http://localhost:5173
```

### 3. Ejecutar en desarrollo

```bash
npm run dev
```

La app estará disponible en `http://localhost:5173`

## Estructura

```
src/
├── components/
│   ├── ui/              # Componentes base (Button, Input, Card, etc.)
│   └── layout/          # Layout, Sidebar, Header, AuthGuard
├── pages/
│   ├── auth/            # Login
│   ├── app/             # Dashboard, Projects, Inbox, MyTasks
│   └── public/          # ApprovalPage (zero-auth)
├── lib/
│   ├── supabase.ts      # Cliente Supabase
│   ├── edge-functions.ts # Wrappers para Edge Functions
│   └── utils.ts         # Utilidades (cn, formatDate, etc.)
├── stores/
│   ├── auth.store.ts    # Estado de autenticación
│   └── ui.store.ts      # Estado de UI (sidebar, modals)
├── types/
│   └── index.ts         # Tipos TypeScript
└── styles/
    └── globals.css      # Estilos globales + Tailwind
```

## Rutas

| Ruta | Auth | Descripción |
|------|------|-------------|
| `/login` | Guest | Login/Registro |
| `/approval/:token` | Public | Aprobación de cliente (zero-auth) |
| `/app/dashboard` | Protected | Dashboard principal |
| `/app/inbox` | Protected | Notificaciones |
| `/app/my-tasks` | Protected | Tareas asignadas |
| `/app/projects` | Protected | Lista de proyectos |
| `/app/projects/:id` | Protected | Kanban del proyecto |

## Edge Functions

El frontend se comunica con estas Edge Functions de Supabase:

### `create-approval-link`
Genera link de aprobación para enviar al cliente.

```typescript
import { createApprovalLink } from '@/lib/edge-functions'

const { approval_url, expires_at } = await createApprovalLink({
  task_id: 'uuid',
  expires_in_hours: 48,
  client_phone: '529981234567',
  note: 'Revisar el flujo de WhatsApp',
})
```

### `process-approval/validate-token`
Valida token y obtiene detalles de la tarea (público).

```typescript
import { getApprovalDetails } from '@/lib/edge-functions'

const { valid, task, expires_at } = await getApprovalDetails(token)
```

### `process-approval/submit-approval`
Envía decisión del cliente (público).

```typescript
import { submitApproval } from '@/lib/edge-functions'

const { success, message } = await submitApproval({
  token,
  decision: 'approved', // o 'changes_requested'
  feedback: 'Comentario opcional',
})
```

## Design System

### Colores (Dark Mode)

| Variable | Hex | Uso |
|----------|-----|-----|
| `bg-primary` | #0D0D0D | Fondo principal |
| `bg-secondary` | #1A1A1A | Cards, sidebar |
| `bg-tertiary` | #262626 | Inputs, hover |
| `text-primary` | #FFFFFF | Texto principal |
| `text-secondary` | #A3A3A3 | Texto secundario |
| `accent-primary` | #6366F1 | Indigo (n8n) |
| `accent-success` | #22C55E | Verde (aprobado) |
| `accent-warning` | #F59E0B | Ámbar (pendiente) |
| `accent-danger` | #EF4444 | Rojo (bloqueado) |

### Estados de Tareas

```
discovery → design → build → qa → deploy → live → optimization
+ blocked | needs_client_approval | bug | hotfix
```

## Comandos

```bash
npm run dev      # Desarrollo
npm run build    # Build producción
npm run preview  # Preview del build
npm run lint     # Lint
```

## Próximos Pasos (Sprint 2)

- [ ] Drag & drop en Kanban (@dnd-kit)
- [ ] Task detail drawer con edición
- [ ] Crear proyecto modal
- [ ] Crear tarea modal
- [ ] Filtros avanzados en proyectos
- [ ] Real-time subscriptions
