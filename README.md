# Fersho Uno - Blog

Blog personal de Fernando.

**Arquitectura:** Jamstack · **Hosting:** GitHub Pages · **Build:** Node.js · **Frontend:** HTML/CSS/JS vanilla

---

## Flujo de publicación

```
Crear .md → Git Add → Git Commit → Git Push → GitHub Actions → Publicación automática
```

## Estructura del proyecto

```
├── content/posts/       # Artículos en Markdown (fuente única de verdad)
├── assets/              # Recursos estáticos
│   ├── css/style.css    # Sistema de diseño completo
│   ├── js/
│   │   ├── app.js       # App principal (menú, share, PWA, notificaciones)
│   │   ├── search.js    # Búsqueda instantánea cliente
│   │   └── offline.js   # (no usado en build, mantenido como referencia)
│   ├── icons/           # Favicon e íconos SVG y PNG (generados)
│   └── images/          # Portadas e imágenes
├── scripts/
│   ├── config.js        # Config central (SITE_URL, helpers url/asset/fullUrl)
│   └── build.js         # Build orquestador principal
├── public/              # Output de build (para GitHub Pages, gitignorado)
└── .github/workflows/   # CI/CD
```

## Cómo crear un artículo

Crear un archivo en `content/posts/` con frontmatter YAML:

```markdown
---
title: Título del artículo
author: Tu Nombre
date: 2026-07-04
time: 18:30
category: Debian
summary: Breve descripción para tarjetas y SEO.
tags:
  - Debian
  - Linux
cover: assets/images/portada.webp
published: true
---

Contenido del artículo en Markdown...
```

## Build local

```bash
npm install
npm run build
```

El output se genera en `public/`, listo para GitHub Pages.

### Dominio personalizado

```bash
npm run build    # SITE_URL por defecto: https://blog.fershouno.me
```

### GitHub Pages (ruta /blog/)

```bash
SITE_URL=https://fershunoo.github.io/blog npm run build
```

`BASE_URL` se deriva automáticamente de `SITE_URL`.

## GitHub Actions

El workflow en `.github/workflows/deploy.yml`:

1. **Valida** frontmatter de todos los posts
2. **Construye** el sitio completo (genera HTML, RSS, sitemap, search index, JSON-LD)
3. **Valida** assets y enlaces post-build
4. **Valida** que no existan rutas `/blog/` en el output
5. **Despliega** a GitHub Pages

Push a `main` → publicación automática.

## PWA

- Service Worker con estrategia Cache First + Network Update
- Offline page
- Manifest con shortcuts y splash screen
- Detección de versiones (polling cada 60s)
- Banner de actualización sin recarga forzada
- Notificaciones push cuando hay nuevo contenido

## Búsqueda

Búsqueda instantánea 100% cliente sobre JSON indexado:
- Título, contenido, categoría, tags, autor, resumen

## Configuración

Variables de entorno:

| Variable     | Descripción                          | Default                          |
|-------------|--------------------------------------|----------------------------------|
| `SITE_URL`  | URL completa del sitio               | `https://blog.fershouno.me`      |
| `SITE_NAME` | Nombre del sitio                     | `Fersho Uno - Blog`              |
| `SITE_DESC` | Descripción del sitio                | `Blog personal de Fernando`      |
| `CNAME`     | Dominio personalizado (opcional)     | —                                |

## Helpers de URL

Todas las rutas se construyen mediante helpers centralizados en `config.js`:

```js
url('/post/000001/')       // → /post/000001/  o  /blog/post/000001/
asset('css/style.css')     // → /assets/css/style.css  o  /blog/assets/css/style.css
fullUrl('/post/000001/')   // → https://blog.fershouno.me/post/000001/
```

## Características técnicas

- ✅ Sin backend, 100% GitHub Pages
- ✅ Markdown completo (CommonMark + GFM) con syntax highlighting
- ✅ OpenGraph, Twitter Cards, JSON-LD
- ✅ RSS + sitemap + robots.txt
- ✅ Categorías dinámicas desde frontmatter
- ✅ Headers de seguridad (CSP, Referrer-Policy, X-Content-Type-Options, X-Frame-Options, Permissions-Policy)
- ✅ Puntuación Lighthouse ≥ 95 objetivo
- ✅ WCAG AA (teclado, ARIA, contraste, focus visible)
- ✅ Responsive (mobile → ultrawide)
- ✅ Lazy loading de imágenes
- ✅ Tema oscuro profesional (GitHub Dark / Catppuccin Mocha)
- ✅ Validación de assets, enlaces y rutas `/blog/` en build
- ✅ PWA: Service Worker, offline, manifest, notificaciones, actualización automática
- ✅ Icono SVG/PNG generado automáticamente con tema Linux
