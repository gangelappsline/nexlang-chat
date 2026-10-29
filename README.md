# Nexlang Chat

Aplicación de mensajería para equipos inspirada en Slack y Microsoft Teams: chats directos,
grupos de trabajo, bandeja de conversaciones con clientes y panel de detalles del visitante.

El acceso funciona con **código de un solo uso enviado al correo** (passwordless) y el panel
solo se renderiza cuando existe un **token válido + el perfil del usuario** en la sesión.

> La app incluye un **backend demo** completo (en `src/mocks`) con latencia realista, persistencia
> en `localStorage` y respuestas automáticas. No necesitas servidor para probarla.

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
npm run dev      # development · http://localhost:5176
```

Otros scripts (cada uno carga su propio archivo `.env`):

| Comando | Modo de Vite | Variables de entorno |
| --- | --- | --- |
| `npm run dev` | `development` | `.env` + `.env.development` |
| `npm run dev:staging` | `staging` | `.env` + `.env.staging` |
| `npm run build` | `production` | `.env` + `.env.production` |
| `npm run build:staging` | `staging` | `.env` + `.env.staging` |
| `npm run preview` | sirve `dist/` | — (el build ya las incluyó) |
| `npm run lint` | ESLint (reglas del React Compiler) | — |
| `npm run typecheck` | `tsc -b` | — |

### Cómo entrar (modo demo)

1. Escribe cualquier correo o usuario (o pulsa **Usar demo** → `devon.lane@nexlang.io`).
2. La app muestra el código de 6 dígitos en una tarjeta **Modo demostración** (no se envían
   correos reales). También puedes pulsar **Autocompletar**.
3. Al verificarlo se guarda la sesión y entras a la bandeja de entrada.

Los datos de la demo (conversaciones, mensajes, notas, etiquetas) se guardan en
`localStorage` bajo `nexlang.demo.db.v1`. Para reiniciar todo:

```js
localStorage.removeItem('nexlang.demo.db.v1') // datos
localStorage.removeItem('nexlang.session')    // sesión
```

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
| `.env.example` | ✅ | plantilla documentada para copiar |
| `.env.local` / `.env.*.local` | ❌ (gitignored) | secretos u overrides personales |

Variables disponibles:

| Variable | Ejemplo | Uso |
| --- | --- | --- |
| `VITE_BASE_API_URL` | `https://api.nexlang.io/v1` | **base de todas las peticiones** (sin barra final) |
| `VITE_USE_MOCK_API` | `true` | `false` desactiva el backend demo y usa la API real |
| `VITE_ENVIRONMENT` | `production` | se muestra en el menú de cuenta |
| `VITE_REQUEST_TIMEOUT_MS` | `20000` | timeout por petición |
| `VITE_DEBUG_REQUESTS` | `false` | loguea método + URL en consola |
| `VITE_APP_NAME` | `Nexlang Chat` | nombre visible de la app |

> Solo las variables con prefijo `VITE_` llegan al navegador: **nunca guardes secretos** en ellas.
> El modo demo se mantiene activo en `.env.production` para que el build funcione sin backend;
> cámbialo a `false` cuando la API real esté desplegada.

Puedes abrir el **menú de cuenta** (avatar del rail o de la bandeja) para ver el entorno y el
estado de la API (`API demo` / `API real`) que quedaron compilados.

---

## Cliente de API

Todo el tráfico sale por un único archivo: **`src/lib/api/client.ts`**.

```ts
import { apiClient } from '@/lib/api/client'

const conversations = await apiClient.get<Conversation[]>('/conversations')

await apiClient.post('/conversations/c-1/messages', { body: 'Hola' })

await apiClient.get('/reports', { query: { page: 2, status: 'open' } })
```

Qué resuelve:

* **Base de ruta** desde `VITE_BASE_API_URL`: `request('/auth/me')` → `https://api.…/v1/auth/me`
  (acepta rutas absolutas `https://…` cuando quieres saltarte la base).
* **Bearer token automático**: si hay sesión guardada agrega
  `Authorization: Bearer <accessToken>`; se puede desactivar por petición con `{ auth: false }`
  (lo usan los endpoints de login).
* El token se lee del store en memoria (`Zustand`) y, si aún no está hidratado, del
  `localStorage` (`nexlang.session`), así también se envía al recargar la página.
* **Timeout** cancelable (`VITE_REQUEST_TIMEOUT_MS`) combinado con el `AbortSignal` de TanStack Query.
* **Errores normalizados** en `ApiError` (`status`, `code`, `fieldErrors`) y cierre de sesión
  automático ante un `401`.
* **Modo demo**: con `VITE_USE_MOCK_API=true` las mismas llamadas se resuelven contra `src/mocks`
  sin hacer red, de modo que los componentes no cambian entre demo y API real.

Los módulos de cada feature (`features/auth/api.ts`, `features/chat/api.ts`) solo declaran rutas
y tipos; la sesión se conecta con `setAuthTokenProvider(...)` en `features/auth/session.ts`.

---

## Flujo de autenticación

```
/ (panel protegido)  ──sin token+usuario──▶  /login
/login
  ├─ paso 1  POST /auth/request-code   { identifier }        → { challengeId, emailHint, expiresAt, demoCode? }
  ├─ paso 2  POST /auth/verify-code    { challengeId, code } → { accessToken, refreshToken, expiresAt, user }
  └─          POST /auth/resend-code   { challengeId }
```

* El código caduca a los **10 minutos**, admite **5 intentos** y se invalida al reenviarse.
* `RequireAuth` (`src/routes/guards.tsx`) bloquea el panel si falta el token o el usuario,
  o si `expiresAt` ya pasó; en ese caso limpia la sesión y redirige a `/login` conservando
  la ruta de origen para volver después del login.
* `RedirectIfAuthenticated` evita que un usuario con sesión vea el login.
* Ante un `401` de la API, el cliente HTTP limpia la sesión y vacía la caché de TanStack Query.

---

## Estructura

```
src/
├── lib/
│   ├── api/
│   │   ├── client.ts     base URL, bearer token, timeout, errores y modo demo
│   │   └── errors.ts     ApiError + helpers
│   ├── constants.ts      claves de storage compartidas
│   ├── cn.ts · format.ts · query-client.ts · use-countdown.ts · use-media-query.ts
├── components/
│   ├── brand/            logo Nexlang (marca y logotipo, claro/oscuro)
│   └── ui/               Button, Input, Avatar, Modal, Dropdown, Badge, Skeletons…
├── features/
│   ├── auth/             api, hooks, esquemas Zod, store de sesión y pantalla de login
│   └── chat/             api, hooks (queries/mutations/optimistic), componentes y página
├── mocks/                backend demo: seed, base de datos, router y bus de eventos
├── routes/               guards de sesión
├── types/                modelos compartidos
├── App.tsx               providers + router + toasts
└── index.css             Tailwind v4 + design tokens (colores de marca, sombras, animaciones)
```

### Pantallas

* **Login** (`/login`): layout partido con panel de marca, formulario de correo/usuario y
  segundo paso con OTP de 6 dígitos (autoadvance, pegado, reenvío con cuenta atrás).
* **Panel** (`/`, `/c/:conversationId`): rail de navegación, bandeja con filtros
  (todos / no leídos / grupos / archivados), búsqueda (`⌘K`), orden, lista de conversaciones,
  hilo de mensajes con burbujas agrupadas, composer (emojis, adjuntos, respuestas rápidas)
  y panel derecho con resumen del usuario, mapa, etiquetas, notas y archivos.
* **Nueva conversación**: chats directos o grupos, con búsqueda de contactos y multi-selección.

---

## Conectar un backend real

1. Copia la plantilla y ajusta los valores:

   ```bash
   cp .env.example .env.local
   ```

   ```dotenv
   VITE_BASE_API_URL=https://api.tu-dominio.com/v1
   VITE_USE_MOCK_API=false
   ```

2. Reinicia el dev server (Vite no recarga variables en caliente).

Endpoints esperados:

| Método | Ruta | Respuesta |
| --- | --- | --- |
| `POST` | `/auth/request-code` | `{ challengeId, identifier, emailHint, expiresAt, resendAfterSeconds, demoCode? }` |
| `POST` | `/auth/resend-code` | igual que `request-code` |
| `POST` | `/auth/verify-code` | `{ accessToken, refreshToken, expiresAt, user }` |
| `GET` | `/auth/me` | `User` |
| `POST` | `/auth/logout` | `{ ok: true }` |
| `GET` | `/conversations` | `Conversation[]` |
| `POST` | `/conversations` | `{ type, title?, memberIds }` → `Conversation` |
| `GET` | `/conversations/:id` | `{ conversation, messages }` |
| `PATCH` | `/conversations/:id` | `Conversation` |
| `GET` | `/conversations/:id/messages` | `Message[]` |
| `POST` | `/conversations/:id/messages` | `{ body, attachment? }` → `Message` |
| `POST` | `/conversations/:id/read` | `Conversation` |
| `GET` | `/directory` | `DirectoryPerson[]` |

Los errores se esperan como `{ message, code, errors?: { campo: string[] } }`; los mensajes de
validación se muestran automáticamente en los formularios.

Para el tiempo real, `useRealtimeSync()` es el único punto a cambiar: hoy escucha el bus del
backend demo (`src/mocks/events.ts`) y en producción debería abrir un WebSocket/SSE e invalidar
las mismas query keys.

---

## Marca y diseño

El logotipo proporcionado se procesó en `public/brand/`:

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
* La sesión se valida con `GET /auth/me` al montar el panel (`useSessionUser`).
