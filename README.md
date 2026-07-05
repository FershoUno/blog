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
│   │   ├── sw.js        # Service Worker
│   │   └── offline.js   # Fallback offline
│   ├── icons/           # Favicon e íconos PWA
│   └── images/          # Portadas e imágenes
├── scripts/             # Build system
│   ├── build.js         # Orquestador principal
│   ├── generate-feed.js # RSS feed
│   ├── generate-sitemap.js
│   ├── generate-post-id.js  # Generación automática de IDs
│   └── optimize-images.js
├── data/                # Metadatos generados (no editar)
├── public/              # Output de build (para GitHub Pages)
├── manifest.json        # PWA manifest
├── offline.html         # Página offline
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
tags:
  - Debian
  - Linux
cover: assets/images/portada.webp
published: true
---

Contenido del artículo en Markdown...
```

### Numeración automática

```bash
node scripts/generate-post-id.js
# → 000004
```

El script detecta el último ID y genera el siguiente. Nunca reutiliza IDs eliminados.

## Build local

```bash
npm install
npm run build
```

El output se genera en `public/`, listo para GitHub Pages.

## GitHub Actions

El workflow en `.github/workflows/deploy.yml`:

1. **Valida** frontmatter de todos los posts
2. **Construye** el sitio completo
3. **Genera** RSS, sitemap, search index, JSON-LD
4. **Despliega** a GitHub Pages

Push a `main` → publicación automática.

## PWA

- Service Worker con estrategia Cache First
- Offline page
- Manifest con shortcuts y splash screen
- Detección de nuevas versiones (polling cada 60s)
- Banner de actualización sin recarga forzada
- Preparado para Web Push Notifications (Modo 2)

## Búsqueda

Búsqueda instantánea 100% cliente sobre JSON indexado:
- Título
- Contenido
- Categoría
- Tags
- Autor
- Resumen

## Características técnicas

- ✅ Sin backend, 100% GitHub Pages
- ✅ Markdown completo (CommonMark + GFM)
- ✅ Syntax highlighting (highlight.js)
- ✅ OpenGraph, Twitter Cards, JSON-LD
- ✅ RSS + sitemap + robots.txt
- ✅ Categorías dinámicas
- ✅ Puntuación Lighthouse ≥ 95 objetivo
- ✅ WCAG AA (teclado, ARIA, contraste, focus visible)
- ✅ Responsive (mobile → ultrawide)
- ✅ Lazy loading de imágenes
- ✅ Tema oscuro profesional (GitHub Dark / Catppuccin Mocha)
