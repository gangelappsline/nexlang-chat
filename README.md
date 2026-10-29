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
npm run dev      # http://localhost:5176
```

Otros scripts:

```bash
npm run build      # typecheck + build de producción
npm run preview    # sirve el build
npm run lint       # ESLint (incluye reglas del React Compiler)
npm run typecheck  # tsc -b
```

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
├── api · http            wrapper fetch con token, errores normalizados y modo demo
├── components/
│   ├── brand/            logo Nexlang (marca y logotipo completo, versiones claro/oscuro)
│   └── ui/               Button, Input, Avatar, Modal, Dropdown, Badge, Skeletons…
├── features/
│   ├── auth/             api, hooks, esquemas Zod, store de sesión y pantalla de login
│   └── chat/             api, hooks (queries/mutations/optimistic), componentes y página
├── lib/                  cn, formato (date-fns), query client, media query, countdown
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

```bash
cp .env.example .env
# VITE_API_BASE_URL=https://api.tu-dominio.com
# VITE_USE_MOCK_API=false
```

Con esas variables todas las llamadas salen por `fetch` hacia tu API con
`Authorization: Bearer <token>`; no hay que tocar componentes. Endpoints esperados:

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
