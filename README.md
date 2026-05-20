# Rapidos y Precoces

Plataforma full stack para club de motociclistas con frontend React, API local Express, API serverless para Netlify, JWT, Supabase PostgreSQL/Storage, mapa Leaflet, catalogo de motos, galeria social, eventos, blog y panel admin.

## Abrir en local

```bash
npm install
npm run dev
```

Luego abre:

```text
http://localhost:5173
```

La API corre en:

```text
http://localhost:4000/api/health
```

Usuario demo:

```text
admin@rapidos.test
admin123
```

## Notas

- Los datos actuales son semilla en memoria para poder ejecutar el proyecto sin configurar base de datos.
- En local, la API corre con Express en `server/index.js`.
- En Netlify, la API corre como serverless function en `netlify/functions/api.mjs`.
- Si configuras Supabase, la API persiste usuarios, fotos, rutas, votos, reacciones y asistencias.
- Si no configuras Supabase, la API usa `server/seed.js` como fallback en memoria.
- Las imagenes usan URLs remotas optimizadas para prototipo visual.

## Supabase

1. Crea un proyecto en Supabase.
2. Abre `SQL Editor`.
3. Copia y ejecuta el contenido de:

```text
supabase/schema.sql
```

4. Crea un bucket publico en `Storage` llamado:

```text
club-photos
```

5. En local, crea `.env` basado en `.env.example`:

```text
PORT=4000
JWT_SECRET=una-clave-larga-y-segura
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
SUPABASE_PHOTOS_BUCKET=club-photos
```

Usa `service_role`, no `anon`, porque la API del servidor necesita escribir en tablas y Storage. No expongas esa clave en el frontend.

6. Reinicia el servidor:

```bash
npm run dev
```

Para confirmar que esta usando Supabase, abre:

```text
http://localhost:4000/api/health
```

Debe responder:

```json
{"database":"supabase"}
```

## Subir a GitHub

```bash
git init
git add .
git commit -m "Initial biker platform"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/TU-REPO.git
git push -u origin main
```

No subas `node_modules` ni `dist`; ya estan ignorados en `.gitignore`.

## Publicar en Netlify

1. Crea un repositorio en GitHub y sube el proyecto.
2. En Netlify, elige `Add new site` y luego `Import from Git`.
3. Selecciona el repositorio.
4. Netlify detectara `netlify.toml`. La configuracion queda asi:

```text
Build command: npm run build
Publish directory: dist
Functions directory: netlify/functions
```

5. En variables de entorno, agrega:

```text
JWT_SECRET=una-clave-larga-y-segura
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
SUPABASE_PHOTOS_BUCKET=club-photos
```

La API publica queda disponible bajo:

```text
/api/health
/api/stats
/api/routes
/api/gallery
/api/bikes
/api/members
/api/events
/api/posts
```

Importante: si no agregas las variables de Supabase, la API serverless usa datos en memoria para demo.
