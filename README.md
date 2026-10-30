# Nexlang Chat

Aplicación de mensajería para equipos inspirada en Slack y Microsoft Teams: chats directos,
grupos de trabajo, bandeja de conversaciones con último mensaje, contador de no leídos, panel de
participantes y **llamadas y videollamadas propias** (WebRTC, sin servicios de terceros). Todas
las conversaciones y mensajes vienen de la API real.

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
| Llamadas | **WebRTC nativo** (P2P) + servidor de señalización propio con `ws` |
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
| `npm run signaling` | servidor de señalización de llamadas | `SIGNALING_*` (ver abajo) |
| `npm run signaling:dev` | igual, con recarga automática (`node --watch`) | `SIGNALING_*` |
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
| `VITE_SIGNALING_URL` | `auto` | servidor de señalización: `auto` = mismo origen (`wss://tu-dominio/signaling`) o una URL `ws(s)://` |
| `VITE_STUN_URLS` | `stun:turn.nexlang.io:3478` | servidores STUN (lista separada por comas) |
| `VITE_TURN_URL` | `turn:turn.nexlang.io:3478` | TURN propio (coturn) para atravesar NAT estricto |
| `VITE_TURN_USERNAME` / `VITE_TURN_CREDENTIAL` | — | credenciales del TURN |
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

## Llamadas y videollamadas

Todo es propio: **WebRTC** en el navegador y un **servidor de señalización incluido en este
repo** (`server/signaling`). No interviene Zoom, Twilio, Daily, Agora ni ningún SDK externo.

```
┌──────────┐   oferta/respuesta/ICE (WebSocket)   ┌────────────────────┐
│  App A   │ ───────────────────────────────────► │ server/signaling   │
│ (React)  │ ◄─────────────────────────────────── │  (Node + ws)       │
└────┬─────┘                                      └─────────┬──────────┘
     │                                                      │
     │            audio + vídeo P2P (WebRTC, SRTP)          │
     └──────────────────────────────────────────────────────┘
                      App B (otro navegador)
```

* **Sin límite de tiempo**: el audio y el vídeo van directos entre navegadores; el servidor solo
  reenvía unos pocos mensajes al inicio. Nada corta la llamada a los X minutos.
* **Sigue si se cae la señalización**: al establecerse el P2P, la llamada continúa; el cliente
  reconecta el WebSocket en segundo plano y muestra un aviso discreto.
* **Siempre disponible mientras la app esté abierta**: no hay software que instalar. (No hay push
  nativo: si el navegador está cerrado, la llamada no puede sonar.)
* **Grupos**: malla P2P hasta **6 personas** (cada participante envía su media a cada par).

### Probar en local

```bash
# terminal 1 · app
npm run dev

# terminal 2 · señalización (el proxy de Vite la expone en /signaling)
npm run signaling
```

Abre `http://localhost:5176` en dos navegadores (o dos perfiles) con **usuarios distintos**,
entra a la misma conversación y pulsa el teléfono o la cámara del encabezado.

### Cómo se comporta la UI

| Estado | Qué se ve |
| --- | --- |
| `dialing` | panel flotante “Llamando…” con opción de colgar |
| `incoming` | tarjeta con avatar, tipo de llamada y botones **Aceptar / Rechazar** (suena un tono generado con Web Audio) |
| `connecting` | “Conectando…” mientras se intercambian SDP e ICE |
| `active` | cronómetro, vídeo remoto + miniatura local (o avatar en llamadas de voz) |
| controles | silenciar micrófono, encender/apagar cámara, compartir pantalla y colgar |

Otras reglas: si ya estás en una llamada se responde `busy`; una llamada saliente se cancela sola
a los 45 s y una entrante se descarta a los 60 s; el aviso de “no está conectado” aparece cuando
la persona no tiene la app abierta.

### Desplegar

1. **Servidor de señalización** (Node ≥ 20, ya incluye `ws`):

   ```bash
   SIGNALING_PORT=8081 \
   SIGNALING_ALLOWED_ORIGINS=https://chat.nexlang.io \
   SIGNALING_VERIFY_URL=https://api.nexlang.io/api/v1/chat/conversations \
   node server/signaling/index.mjs
   ```

   | Variable | Por defecto | Uso |
   | --- | --- | --- |
   | `SIGNALING_PORT` | `8081` | puerto HTTP/WS |
   | `SIGNALING_HOST` | `0.0.0.0` | interfaz |
   | `SIGNALING_ALLOWED_ORIGINS` | `*` | orígenes permitidos (`*.mi-dominio.com` también vale) |
   | `SIGNALING_REQUIRE_TOKEN` | `true` | exige `?token=` |
   | `SIGNALING_VERIFY_URL` | — | endpoint autenticado de la API para validar el token |
   | `SIGNALING_MAX_MESSAGE_BYTES` | `65536` | tamaño máximo por mensaje |
   | `SIGNALING_MAX_MESSAGES_PER_SECOND` | `60` | límite anti-abuso por conexión |
   | `SIGNALING_HEARTBEAT_MS` | `30000` | ping/pong |

2. **Proxy TLS** (nginx) para que el navegador use `wss://`:

   ```nginx
   location /signaling {
     proxy_pass http://127.0.0.1:8081/;   # la barra final recorta /signaling
     proxy_http_version 1.1;
     proxy_set_header Upgrade $http_upgrade;
     proxy_set_header Connection "upgrade";
     proxy_set_header Host $host;
     proxy_read_timeout 3600s;
   }
   ```

3. **TURN propio (coturn)** para las redes que no permiten P2P directo (NAT simétrico, wifi
   corporativa, 4G). Es infraestructura tuya, no un servicio de terceros:

   ```bash
   docker run -d --network host coturn/coturn \
     -n --realm=nexlang.io --lt-cred-mech --user=nexlang:CLAVE \
     --min-port=49160 --max-port=49200
   ```

   Y en el `.env` de la app:

   ```
   VITE_STUN_URLS=stun:turn.nexlang.io:3478
   VITE_TURN_URL=turn:turn.nexlang.io:3478
   VITE_TURN_USERNAME=nexlang
   VITE_TURN_CREDENTIAL=CLAVE
   ```

   Sin TURN las llamadas funcionan en la mayoría de redes domésticas, pero pueden fallar en las
   restrictivas. El TURN solo retransmite cuando hace falta (≈0,3–1,5 Mbps por llamada) y **no**
   cobra ni limita por minuto.

### Seguridad y límites (importante)

* El servidor de señalización **nunca** ve el audio ni el vídeo: solo invitaciones, SDP y
  candidatos ICE (cifrados en tránsito con `wss`).
* El token de sesión viaja en la URL del WebSocket (`?token=…`) y, si defines
  `SIGNALING_VERIFY_URL`, se valida contra la API antes de aceptar la conexión.
* La identidad (`userId`) la declara el cliente en el mensaje `hello`. Para máxima seguridad,
  conviene que tu API exponga un endpoint tipo `/v1/chat/me` y que `SIGNALING_VERIFY_URL` lo use
  para devolver también el id: así el servidor podría fijar la identidad en lugar de confiar en el
  cliente.
* Hace falta **HTTPS** en producción (los navegadores solo dan micrófono/cámara en contextos
  seguros).
* Una misma cuenta abierta en dos pestañas: la última recibe las llamadas y la anterior se
  desconecta (`session:replaced`).
* La calidad depende de la red de cada participante; el vídeo se limita a 720p/30 fps por defecto.

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
│   ├── chat/             api, hooks (queries/mutations con optimistic), componentes y página
│   └── calls/            señalización, WebRTC, estado de llamada y componentes
├── server/
│   └── signaling/        servidor WebSocket de señalización (Node + ws)
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
* Las llamadas usan `features/calls/call-manager.ts` como máquina de estados (fuera de React) y
  `features/calls/store.ts` (Zustand) como estado observable por la UI; así una llamada sigue
  activa al cambiar de conversación.
