# Nexlang Chat

Aplicación de mensajería para equipos inspirada en Slack y Microsoft Teams: chats directos,
grupos de trabajo y bandeja de conversaciones con último mensaje, contador de no leídos y panel
de participantes. Todas las conversaciones y mensajes vienen de la API real.

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

Flujo sin contraseña con dos endpoints:

| Paso | Petición | Resultado en la app |
| --- | --- | --- |
| 1 · solicitar código | `POST ${VITE_BASE_API_URL}/v1/chat/login-code` · `{ "email": "ana@empresa.com" }` | si responde OK se muestra el formulario de 6 dígitos |
| 2 · validar código | `POST ${VITE_BASE_API_URL}/v1/chat/login-validation` · `{ "email": "ana@empresa.com", "code": "123456" }` | guarda la sesión y abre el panel |

El reenvío del código vuelve a llamar al **paso 1**. Las rutas viven en
`src/lib/api/endpoints.ts`.

### Respuesta esperada del paso 2

```json
{
  "user": {
    "data": {
      "id": 42,
      "name": "Ana Pérez",
      "email": "ana@empresa.com",
      "username": "ana.perez",
      "avatar_url": null
    }
  },
  "access_token": "42|Xr7jh...",
  "token_type": "Bearer"
}
```

El servicio (`src/features/auth/api.ts`) normaliza la respuesta y tolera variantes:

* token en `access_token` / `accessToken` / `token` / `jwt` / `bearer`;
* `token_type` se usa tal cual en la cabecera `Authorization` (por defecto `Bearer`);
* `user` puede venir como `UserResource` (anidado en `data`), en `usuario`, `profile` o
  `account`; si faltan campos se completan con el correo del login;
* `expiresAt` es opcional: se toma de `expires_at` o del `exp` del JWT. Con tokens tipo Sanctum
  (sin caducidad) se guarda `null` y la validez se confirma con la API (un `401` cierra sesión);
* si el paso 2 no devuelve ningún token se lanza un `ApiError` (`502 invalid_response`) y el
  formulario muestra el mensaje.

### Sesión y almacenamiento seguro

* `Zustand` + `persist` guarda **token, tipo de token, refresh token y perfil** en
  `nexlang.session`.
* Por defecto la sesión vive en **`sessionStorage`**: se borra al cerrar la pestaña.
  El usuario puede activar **“Mantener la sesión”** en el paso del código para persistirla en
  `localStorage` durante más tiempo.
* Nunca se guardan contraseñas ni códigos; el token no se imprime en consola y en la UI solo se
  muestra el correo del usuario.
* Al cerrar sesión se limpian ambos almacenes, el estado de TanStack Query y se llama a
  `POST /v1/chat/logout`.
* `RequireAuth` (`src/routes/guards.tsx`) bloquea `/` y `/c/:id` si falta el token o el usuario,
  o si la sesión caducó; redirige a `/login` conservando la ruta de origen.
* Cualquier `401` de la API limpia la sesión y la caché automáticamente.
* El cliente envía `Authorization: <token_type> <access_token>` en todas las peticiones
  autenticadas (login y validación van con `{ auth: false }`).

## Cliente de API

Todo el tráfico sale por **`src/lib/api/client.ts`** y las rutas viven en
**`src/lib/api/endpoints.ts`**.

```ts
import { apiClient } from '@/lib/api/client'
import { API_PATHS } from '@/lib/api/endpoints'

const conversations = await apiClient.get<unknown>(API_PATHS.conversations)
await apiClient.post(API_PATHS.conversations, { participants: [18], type: 'private' })
await apiClient.get('/reports', { query: { page: 2, status: 'open' } })
```

* **Base** `VITE_BASE_API_URL` + ruta (acepta URLs absolutas si necesitas otra base).
* **Bearer token automático**: agrega `Authorization: <token_type> <accessToken>` (normalmente
  `Bearer`) cuando hay sesión guardada; se puede desactivar con `{ auth: false }` (lo usan los
  endpoints de login). El token se lee del store en memoria y, como respaldo, del almacén de
  sesión (`sessionStorage` o `localStorage`), así se envía incluso tras recargar.
* **Timeout** cancelable (`VITE_REQUEST_TIMEOUT_MS`) combinado con el `AbortSignal` de TanStack Query.
* **Errores normalizados** en `ApiError` (`status`, `code`, `fieldErrors`) y cierre de sesión
  automático ante un `401`.

### Endpoints utilizados

| Método | Ruta | Uso |
| --- | --- | --- |
| `POST` | `/v1/chat/login-code` | solicitar el código (`{ email }`) |
| `POST` | `/v1/chat/login-validation` | validar el código (`{ email, code }`) |
| `POST` | `/v1/chat/logout` | cerrar sesión en el servidor |
| `GET` | `/v1/chat/conversations` | bandeja de entrada (`{ success, data: [...] }`) |
| `POST` | `/v1/chat/conversations` | crear conversación (`{ participants: [id], type, name? }`) |
| `GET` | `/v1/chat/conversations/:id/messages` | historial de mensajes |
| `POST` | `/v1/chat/conversations/:id/messages` | enviar mensaje (`{ message, type: 'text' }`) |
| `POST` | `/v1/chat/conversations/:id/read` | marcar como leída (opcional, best-effort) |
| `GET` | `/v1/chat/users` | personas disponibles para chatear (sin el usuario logueado) |

Los errores se esperan como `{ message, code, errors?: { campo: string[] } }`; los mensajes de
validación se muestran automáticamente en los formularios.

Si las rutas de tu backend cambian, solo hay que editar `src/lib/api/endpoints.ts`.

### Respuesta de la bandeja

```json
{
  "success": true,
  "data": [
    {
      "id": 4,
      "name": null,
      "type": "private",
      "created_by": { "id": 1, "name": "Angel Garcia", "email": "admin@translation.com", "photo": "http://…" },
      "participants": [ { "id": 1, "name": "Angel Garcia", "email": "…", "photo": "http://…" }, { "id": 18, "name": "Dominique Gomez", "email": "…", "photo": null } ],
      "participant_count": 2,
      "latest_message": { "id": 3, "conversation_id": 4, "user": { "id": 1, "name": "Angel Garcia" }, "message": "Nuevo", "type": "text", "created_at": "2026-03-15T17:12:09+00:00" },
      "unread_count": 0,
      "created_at": "2026-03-15T16:25:11+00:00",
      "updated_at": "2026-03-15T17:12:09+00:00"
    }
  ],
  "message": "Conversation list"
}
```

`features/chat/mappers.ts` normaliza esa respuesta al modelo de la UI:

* `name` nulo en conversaciones `private` → el título es el **otro participante**
  (los grupos usan `name` o la lista de integrantes).
* `latest_message` se convierte en la vista previa de la fila (con prefijo `Tú:` o el nombre del
  autor en grupos) y en la hora que se muestra a la derecha.
* `unread_count` pinta el badge de no leídos; al abrir la conversación se marca como leída
  (`POST …/read`, best-effort) y se guarda una marca local del último mensaje leído
  (`nexlang.chat.read-marks`) para que el contador no reaparezca al refrescar. Si llega un
  mensaje nuevo, el badge vuelve a mostrarse.
* Las fotos (`photo`) se usan como avatar; si faltan o fallan se muestran iniciales.
* La lista y el hilo se refrescan solos cada ~20 s y ~12 s (polling configurable en
  `features/chat/hooks.ts`).

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
│   ├── auth/             servicio login-code / login-validation, sesión y pantalla
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
  (todos / no leídos / grupos), búsqueda (`⌘K`), orden, lista de conversaciones con último
  mensaje, hora y badge de no leídos, hilo de mensajes con burbujas agrupadas, composer
  (emojis, envío con `Enter`) y panel derecho con los participantes de la conversación.
* **Nueva conversación**: al elegir una persona se crea el chat directo al instante; en modo
  grupo se seleccionan varios participantes (y nombre opcional) y se crea al confirmar.

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
* La bandeja y el hilo se actualizan por **polling**; `features/chat/hooks.ts` es el punto para
  añadir WebSocket/SSE invalidando las mismas query keys.
