# Debian MicroNews

Plataforma de microblogging estática sobre Debian, GNU/Linux y Software Libre.

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
│   │   ├── app.js       # App principal (menú, share, PWA)
│   │   ├── search.js    # Búsqueda instantánea cliente
│   │   └── offline.js   # (no usado en build, mantenido como referencia)
│   ├── icons/           # Favicon e íconos SVG
│   └── images/          # Portadas e imágenes
├── scripts/
│   ├── config.js        # Config central (BASE_URL, SITE_URL, helpers)
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

`BASE_URL` se deriva automáticamente de `SITE_URL`. También se puede forzar:

```bash
BASE_URL=/blog npm run build
```

## GitHub Actions

El workflow en `.github/workflows/deploy.yml`:

1. **Valida** frontmatter de todos los posts
2. **Construye** el sitio completo (genera HTML, RSS, sitemap, search index, JSON-LD)
3. **Valida** assets y enlaces post-build
4. **Despliega** a GitHub Pages

Push a `main` → publicación automática.

## PWA

- Service Worker con estrategia Cache First + Network Update
- Offline page
- Manifest con shortcuts y splash screen
- Detección de nuevas versiones (polling cada 60s)
- Banner de actualización sin recarga forzada

## Búsqueda

Búsqueda instantánea 100% cliente sobre JSON indexado:
- Título, contenido, categoría, tags, autor, resumen

## Configuración

Variables de entorno:

| Variable     | Descripción                          | Default                          |
|-------------|--------------------------------------|----------------------------------|
| `SITE_URL`  | URL completa del sitio               | `https://blog.fershouno.me`      |
| `BASE_URL`  | Prefijo de ruta (auto-derivado)      | Desde `SITE_URL`                 |
| `SITE_NAME` | Nombre del sitio                     | `Debian MicroNews`               |
| `SITE_DESC` | Descripción del sitio                | `Noticias sobre Debian, ...`     |
| `CNAME`     | Dominio personalizado (opcional)     | —                                |

## Características técnicas

- ✅ Sin backend, 100% GitHub Pages
- ✅ Markdown completo (CommonMark + GFM) con syntax highlighting
- ✅ OpenGraph, Twitter Cards, JSON-LD
- ✅ RSS + sitemap + robots.txt
- ✅ Categorías dinámicas
- ✅ Headers de seguridad (CSP, Referrer-Policy, X-Content-Type-Options, X-Frame-Options, Permissions-Policy)
- ✅ Puntuación Lighthouse ≥ 95 objetivo
- ✅ WCAG AA (teclado, ARIA, contraste, focus visible)
- ✅ Responsive (mobile → ultrawide)
- ✅ Lazy loading de imágenes
- ✅ Tema oscuro profesional (GitHub Dark / Catppuccin Mocha)
- ✅ Validación de assets y enlaces en build
- ✅ PWA: Service Worker, offline, manifest, actualización automática
