# Nexlang Chat

Aplicación de mensajería para equipos inspirada en Slack y Microsoft Teams: chats directos,
grupos de trabajo, bandeja de conversaciones con clientes y panel de detalles del visitante.

El acceso funciona con **código de un solo uso enviado al correo** y el panel solo se renderiza
cuando existe un **token válido + el perfil del usuario** en la sesión.

> Esta versión **no incluye datos ni backend de demostración**: todas las peticiones van a la
> API configurada en `VITE_BASE_API_URL`.

---

## Stack

| Área | Librería |
| --- | --- |
| UI | React 19 + TypeScript + Vite 8 |
| Estilos | **Tailwind CSS v4** (`@tailwindcss/vite`) + design tokens propios |
| Estado del servidor | **TanStack Query v5** (+ devtools) |
| Animaciones | **Framer Motion** |
| Navegación | **React Router DOM v7** (rutas lazy) |
| Sesión | **Zustand** con `persist` (localStorage) |
| Formularios | **React Hook Form** + **Zod** (`@hookform/resolvers`) |
| Iconos | **Lucide React** |
| Notificaciones | **Sonner** |
| Utilidades | `clsx`, `tailwind-merge`, `date-fns` (locale `es`) |
| Tipografía | `@fontsource-variable/inter` (fuente local, sin CDN) |

---

## Inicio rápido

```bash
npm install
cp .env.example .env.local   # ajusta VITE_BASE_API_URL
npm run dev                  # http://localhost:5176
```

| Comando | Modo de Vite | Variables que carga |
| --- | --- | --- |
| `npm run dev` | `development` | `.env` + `.env.development` |
| `npm run dev:staging` | `staging` | `.env` + `.env.staging` |
| `npm run build` | `production` | `.env` + `.env.production` |
| `npm run build:staging` | `staging` | `.env` + `.env.staging` |
| `npm run preview` | sirve `dist/` | — (ya vienen compiladas) |
| `npm run lint` | ESLint (reglas del React Compiler) | — |
| `npm run typecheck` | `tsc -b` | — |

---

## Variables de entorno

Vite carga los archivos en cascada; **el último gana**:

```
.env  →  .env.local  →  .env.[modo]  →  .env.[modo].local
```

| Archivo | ¿Se versiona? | Cuándo se usa |
| --- | --- | --- |
| `.env` | ✅ | valores compartidos por todos los entornos |
| `.env.development` | ✅ | `npm run dev` |
| `.env.staging` | ✅ | `npm run dev:staging`, `npm run build:staging` |
| `.env.production` | ✅ | `npm run build` |
| `.env.example` | ✅ | plantilla documentada |
| `.env.local` / `.env.*.local` | ❌ (gitignored) | secretos u overrides personales |

| Variable | Ejemplo | Uso |
| --- | --- | --- |
| `VITE_BASE_API_URL` | `https://api.nexlang.io` | **base de todas las peticiones** (sin barra final) |
| `VITE_ENVIRONMENT` | `production` | entorno lógico que se muestra en el menú de cuenta |
| `VITE_REQUEST_TIMEOUT_MS` | `20000` | timeout por petición |
| `VITE_DEBUG_REQUESTS` | `false` | loguea método + URL en consola |
| `VITE_APP_NAME` | `Nexlang Chat` | nombre visible de la app |

> Solo las variables con prefijo `VITE_` llegan al navegador: **nunca guardes secretos** en ellas.

---

## Autenticación

Todo el flujo usa **un solo endpoint**:

```
POST ${VITE_BASE_API_URL}/v1/chat/login-code
```

| Paso | Body | Resultado en la app |
| --- | --- | --- |
| 1 · solicitar código | `{ "email": "nombre@empresa.com" }` | muestra el formulario de 6 dígitos |
| 2 · validar código | `{ "email": "nombre@empresa.com", "code": "123456" }` | guarda token + usuario y abre el panel |

El reenvío del código vuelve a llamar al **paso 1** con el mismo `email`.

### Respuestas aceptadas

El servicio (`src/features/auth/api.ts`) normaliza la respuesta para tolerar distintas
implementaciones:

```jsonc
// Paso 1 (opcional: solo necesitamos que la petición sea exitosa)
{ "message": "Código enviado", "challengeId": "abc123", "resendAfterSeconds": 30 }

// Paso 2
{
  "accessToken": "eyJhbGciOi...",       // también: token, access_token, jwt, auth_token…
  "refreshToken": "…",                   // opcional
  "expiresAt": "2026-10-30T02:00:00Z",   // opcional: si falta se usa el `exp` del JWT
  "user": {                              // también: usuario, profile, account
    "id": 42,
    "name": "Ana Pérez",                 // o fullName / full_name / displayName
    "email": "ana@empresa.com",
    "username": "ana.perez",
    "role": "admin",
    "title": "Team Lead",
    "workspace": "Nexlang HQ",
    "avatarUrl": "https://…"
  }
}
```

* La respuesta puede venir envuelta en `data` / `result` / `payload`.
* Si el paso 2 no incluye ningún token se lanza un `ApiError` (`502 invalid_response`) con un
  mensaje claro en el formulario.
* Si el usuario no viene completo se completa con el correo del login (nombre derivado del
  correo), de modo que la sesión nunca queda a medias.

### Sesión

* `Zustand` + `persist` guarda `accessToken`, `refreshToken`, `expiresAt` y `user` en
  `localStorage` (`nexlang.session`).
* `RequireAuth` (`src/routes/guards.tsx`) bloquea `/` y `/c/:id` si falta el token o el usuario,
  o si `expiresAt` ya pasó; redirige a `/login` conservando la ruta de origen.
* `RedirectIfAuthenticated` evita que un usuario con sesión vea el login.
* Cualquier `401` de la API limpia la sesión y la caché de TanStack Query.

---

## Cliente de API

Todo el tráfico sale por **`src/lib/api/client.ts`** y las rutas viven en
**`src/lib/api/endpoints.ts`**.

```ts
import { apiClient } from '@/lib/api/client'
import { API_PATHS } from '@/lib/api/endpoints'

const conversations = await apiClient.get<Conversation[]>(API_PATHS.conversations)
await apiClient.post(API_PATHS.conversations, { type: 'direct', memberIds: [2] })
await apiClient.get('/reports', { query: { page: 2, status: 'open' } })
```

* **Base** `VITE_BASE_API_URL` + ruta (acepta URLs absolutas si necesitas otra base).
* **Bearer token automático**: agrega `Authorization: Bearer <accessToken>` cuando hay sesión
  guardada; se puede desactivar con `{ auth: false }` (lo usan los endpoints de login).
  El token se lee del store en memoria y, como respaldo, del `localStorage`, así se envía incluso
  tras recargar.
* **Timeout** cancelable (`VITE_REQUEST_TIMEOUT_MS`) combinado con el `AbortSignal` de TanStack Query.
* **Errores normalizados** en `ApiError` (`status`, `code`, `fieldErrors`) y cierre de sesión
  automático ante un `401`.

### Endpoints utilizados

| Método | Ruta | Uso |
| --- | --- | --- |
| `POST` | `/v1/chat/login-code` | solicitar código (email) y validarlo (email + code) |
| `POST` | `/v1/chat/logout` | cerrar sesión en el servidor |
| `GET` | `/v1/chat/conversations` | bandeja de entrada |
| `POST` | `/v1/chat/conversations` | crear chat directo o grupo |
| `GET` | `/v1/chat/conversations/:id` | conversación + mensajes |
| `PATCH` | `/v1/chat/conversations/:id` | fijar, silenciar, archivar, notas, etiquetas |
| `GET` | `/v1/chat/conversations/:id/messages` | historial |
| `POST` | `/v1/chat/conversations/:id/messages` | enviar mensaje (`{ body, attachment? }`) |
| `POST` | `/v1/chat/conversations/:id/read` | marcar como leída |
| `GET` | `/v1/chat/directory` | contactos para nuevos chats/grupos |

Los errores se esperan como `{ message, code, errors?: { campo: string[] } }`; los mensajes de
validación se muestran automáticamente en los formularios.

Si las rutas de tu backend cambian, solo hay que editar `src/lib/api/endpoints.ts`.

---

## Estructura

```
src/
├── lib/
│   ├── api/
│   │   ├── client.ts     base URL, bearer token, timeout y errores
│   │   ├── endpoints.ts  rutas de la API centralizadas
│   │   └── errors.ts     ApiError + helpers
│   ├── constants.ts      claves de storage compartidas
│   ├── cn.ts · format.ts · query-client.ts · use-countdown.ts · use-media-query.ts
├── components/
│   ├── brand/            logo Nexlang (marca y logotipo, claro/oscuro)
│   └── ui/               Button, Input, Avatar, Modal, Dropdown, Badge, Skeletons…
├── features/
│   ├── auth/             servicio de login-code, hooks, esquemas Zod, sesión y pantalla
│   └── chat/             api, hooks (queries/mutations con optimistic), componentes y página
├── routes/               guards de sesión
├── types/                modelos compartidos
├── App.tsx               providers + router + toasts
└── index.css             Tailwind v4 + design tokens
```

### Pantallas

* **Login** (`/login`): layout partido con panel de marca, correo electrónico y segundo paso con
  OTP de 6 dígitos (autoadvance, pegado, reenvío con cuenta atrás).
* **Panel** (`/`, `/c/:conversationId`): rail de navegación, bandeja con filtros
  (todos / no leídos / grupos / archivados), búsqueda (`⌘K`), orden, lista de conversaciones,
  hilo de mensajes con burbujas agrupadas, composer (emojis, adjuntos, respuestas rápidas)
  y panel derecho con resumen del usuario, mapa, etiquetas, notas y archivos.
* **Nueva conversación**: chats directos o grupos, con búsqueda de contactos y multi-selección.

Si la API de chats aún no está disponible, la bandeja muestra su estado de error con opción de
reintentar (no hay datos falsos en la app).

---

## Marca y diseño

El logotipo se procesó en `public/brand/`:

| Archivo | Uso |
| --- | --- |
| `nexlang-mark.png` | isotipo a color (favicon, cabeceras) |
| `nexlang-mark-white.png` | isotipo blanco (rail oscuro/púrpura) |
| `nexlang-logo-dark.png` | logotipo completo en tinta oscura (fondos claros) |
| `nexlang-logo-white.png` | logotipo completo en blanco (fondos oscuros) |
| `nexlang-wordmark-dark.png` | solo el wordmark |
| `favicon.png` | icono de la pestaña |

Los colores de marca viven en `@theme` (`src/index.css`): `brand` (índigo del isotipo) y
`aqua` (cian), más tokens de superficies, líneas y sombras.

---

## Notas técnicas

* `typescript` está fijado en `~6.0.3` porque `typescript-eslint@8` declara peer
  `typescript <6.1.0`; con TS 7 `npm install` falla por conflicto de peers.
* Las rutas se cargan con `React.lazy` (login y panel son bundles separados).
* El composer hace **actualización optimista** del mensaje y revierte si la API falla.
* El tiempo real no está conectado todavía: `features/chat/hooks.ts` es el punto para añadir
  WebSocket/SSE invalidando las mismas query keys.
