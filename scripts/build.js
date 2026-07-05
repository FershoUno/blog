#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');
const { marked } = require('marked');
const hljs = require('highlight.js');
const yaml = require('js-yaml');
const zlib = require('zlib');
const cfg = require('./config');

const { BASE_URL, SITE_URL, SITE_NAME, SITE_DESC } = cfg;
const { CONTENT_DIR, DATA_DIR, PUBLIC_DIR, ASSETS_DIR } = cfg;

const REQUIRED_FM = ['title', 'date', 'category'];
const ASSET_EXTENSIONS = /\.(png|jpg|jpeg|gif|svg|webp|ico|css|js|json|xml)$/i;

marked.setOptions({ breaks: true, gfm: true });

marked.use({
  renderer: {
    code(text, lang) {
      const langClass = lang ? ` class="language-${lang}"` : '';
      if (lang && hljs.getLanguage(lang)) {
        try {
          return `<pre><code${langClass}>${hljs.highlight(text, { language: lang }).value}</code></pre>`;
        } catch (e) {}
      }
      return `<pre><code${langClass}>${text}</code></pre>`;
    }
  }
});

/* ============================================
   PNG Icon Generator (pure Node.js)
   ============================================ */
function createPNG(width, height, r, g, b) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const typeB = Buffer.from(type);
    const crc = crc32(Buffer.concat([typeB, data]));
    const crcB = Buffer.alloc(4);
    crcB.writeUInt32BE(crc);
    return Buffer.concat([len, typeB, data, crcB]);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // color type RGB
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const rawData = Buffer.alloc(height * (1 + width * 3));
  for (let y = 0; y < height; y++) {
    rawData[y * (1 + width * 3)] = 0; // filter byte
    for (let x = 0; x < width; x++) {
      const offset = y * (1 + width * 3) + 1 + x * 3;
      rawData[offset] = r;
      rawData[offset + 1] = g;
      rawData[offset + 2] = b;
    }
  }

  const compressed = zlib.deflateSync(rawData);
  const idat = chunk('IDAT', compressed);
  const iend = chunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, chunk('IHDR', ihdr), idat, iend]);
}

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

/* ============================================
   Read & validate posts
   ============================================ */
function readPosts() {
  if (!fs.existsSync(CONTENT_DIR)) return [];
  const files = fs.readdirSync(CONTENT_DIR)
    .filter(f => f.endsWith('.md'))
    .sort();

  const posts = [];

  files.forEach(file => {
    const raw = fs.readFileSync(path.join(CONTENT_DIR, file), 'utf-8');
    const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!fmMatch) {
      console.error(`  ❌ ${file}: Sin frontmatter`);
      process.exit(1);
    }

    let fm;
    try {
      fm = yaml.load(fmMatch[1]);
    } catch (e) {
      console.error(`  ❌ ${file}: Error en frontmatter YAML: ${e.message}`);
      process.exit(1);
    }

    const content = fmMatch[2];
    const id = file.replace('.md', '');

    for (const field of REQUIRED_FM) {
      if (!fm[field]) {
        console.error(`  ❌ ${file}: Falta campo requerido '${field}'`);
        process.exit(1);
      }
    }

    if (fm.published === false) {
      console.log(`  🔴 ${file}: No publicado, omitido`);
      return;
    }

    const tags = Array.isArray(fm.tags) ? fm.tags : [];
    const bodyHtml = marked.parse(content);
    const wordCount = content.replace(/[#*`\[\]]/g, '').split(/\s+/).filter(Boolean).length;
    const readingTime = Math.max(1, Math.round(wordCount / 200));

    posts.push({
      id, slug: fm.slug || id,
      title: fm.title, author: fm.author || SITE_NAME,
      date: fm.date, time: fm.time || '12:00',
      category: fm.category, tags,
      summary: fm.summary || '', cover: fm.cover || '',
      readingTime, bodyHtml, wordCount, content
    });
  });

  return posts.sort((a, b) => new Date(b.date + 'T' + b.time) - new Date(a.date + 'T' + a.time));
}

/* ============================================
   Helpers
   ============================================ */
function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('es-ES', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function validateAsset(filePath, context) {
  if (!fs.existsSync(filePath)) {
    console.error(`  ❌ Asset faltante: ${filePath} (requerido por: ${context})`);
    process.exit(1);
  }
}

/* ============================================
   Generate config.js for client
   ============================================ */
function writeClientConfig() {
  const js = `(function(){window.__BASE_URL="${BASE_URL}";window.__SITE_URL="${SITE_URL}";window.__SITE_NAME="${SITE_NAME}";})();`;
  fs.writeFileSync(path.join(PUBLIC_DIR, 'assets', 'js', 'config.js'), js);
}

/* ============================================
   Generate PNG icons
   ============================================ */
function generateIcons() {
  const iconsDir = path.join(PUBLIC_DIR, 'assets', 'icons');
  fs.ensureDirSync(iconsDir);

  const sizes = [
    { size: 192, file: 'icon-192.png' },
    { size: 512, file: 'icon-512.png' },
  ];

  const accent = [88, 166, 255];

  for (const { size, file } of sizes) {
    const png = createPNG(size, size, ...accent);
    const outPath = path.join(iconsDir, file);
    fs.writeFileSync(outPath, png);
    console.log(`  ✅ ${file} (${size}x${size})`);
  }
}

/* ============================================
   Generate manifest.json
   ============================================ */
function writeManifest() {
  const manifest = {
    name: SITE_NAME,
    short_name: 'DBN MicroNews',
    description: SITE_DESC,
    start_url: `${BASE_URL}/`,
    display: 'standalone',
    orientation: 'any',
    background_color: '#0d1117',
    theme_color: '#0d1117',
    categories: ['news', 'technology', 'linux'],
    lang: 'es',
    scope: `${BASE_URL}/`,
    icons: [
      { src: `${BASE_URL}/assets/icons/icon-192.png`, type: 'image/png', sizes: '192x192', purpose: 'any maskable' },
      { src: `${BASE_URL}/assets/icons/icon-512.png`, type: 'image/png', sizes: '512x512', purpose: 'any maskable' },
      { src: `${BASE_URL}/assets/icons/favicon.svg`, type: 'image/svg+xml', sizes: '192x192', purpose: 'any' },
    ],
    shortcuts: [
      {
        name: 'Últimos artículos',
        short_name: 'Novedades',
        description: 'Ver los artículos más recientes',
        url: `${BASE_URL}/`,
        icons: [{ src: `${BASE_URL}/assets/icons/icon-192.png`, sizes: '192x192' }]
      },
      {
        name: 'Buscar',
        short_name: 'Buscar',
        description: 'Buscar artículos',
        url: `${BASE_URL}/search.html`,
        icons: [{ src: `${BASE_URL}/assets/icons/icon-192.png`, sizes: '192x192' }]
      }
    ]
  };
  fs.writeJsonSync(path.join(PUBLIC_DIR, 'manifest.json'), manifest, { spaces: 2 });
}

/* ============================================
   Generate sw.js with BASE_URL injected
   ============================================ */
function writeServiceWorker(posts) {
  const postUrls = posts.map(p => `${BASE_URL}/post/${p.id}/`);

  const sw = `
var CACHE_NAME = 'debian-micronews-' + Date.now();
var OFFLINE_URL = '${BASE_URL}/offline.html';

var PRECACHE_URLS = [
  '${BASE_URL}/',
  '${BASE_URL}/assets/css/style.css',
  '${BASE_URL}/assets/js/config.js',
  '${BASE_URL}/assets/js/app.js',
  '${BASE_URL}/offline.html',
  '${BASE_URL}/data/posts.json',
  '${BASE_URL}/data/search.json',
  '${BASE_URL}/version.json',
  '${BASE_URL}/manifest.json'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(PRECACHE_URLS).then(function () {
        return self.skipWaiting();
      });
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE_NAME; }).map(function (k) {
          return caches.delete(k);
        })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;

  var url = req.url;

  if (url.indexOf('${BASE_URL}/data/') !== -1 || url.indexOf('${BASE_URL}/version.json') !== -1) {
    event.respondWith(
      caches.open(CACHE_NAME).then(function (cache) {
        return fetch(req).then(function (res) {
          cache.put(req, res.clone());
          return res;
        }).catch(function () {
          return caches.match(req);
        });
      })
    );
    return;
  }

  if (url.indexOf('${BASE_URL}/') !== -1) {
    event.respondWith(
      caches.match(req).then(function (cached) {
        var fetchP = fetch(req).then(function (res) {
          if (res && res.status === 200) {
            var copy = res.clone();
            caches.open(CACHE_NAME).then(function (cache) { cache.put(req, copy); });
          }
          return res;
        }).catch(function () {
          return caches.match(OFFLINE_URL);
        });
        return cached || fetchP;
      })
    );
  }
});

self.addEventListener('message', function (event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
`;

  fs.writeFileSync(path.join(PUBLIC_DIR, 'sw.js'), sw.trim());
}

/* ============================================
   Generate HTML pages
   ============================================ */
function renderHead(title, desc, canonical, ogType, extraMeta) {
  ogType = ogType || 'website';
  return `
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}${title !== SITE_NAME ? ' - ' + SITE_NAME : ''}</title>
  <meta name="description" content="${escapeHtml(desc || SITE_DESC)}">
  <link rel="canonical" href="${SITE_URL}${canonical}">
  <meta property="og:type" content="${ogType}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(desc || SITE_DESC)}">
  <meta property="og:url" content="${SITE_URL}${canonical}">
  <meta property="og:site_name" content="${SITE_NAME}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(desc || SITE_DESC)}">
  ${extraMeta || ''}
  <link rel="stylesheet" href="${BASE_URL}/assets/css/style.css">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&family=Fira+Code:wght@400;500&display=swap" rel="stylesheet">
  <link rel="icon" type="image/svg+xml" href="${BASE_URL}/assets/icons/favicon.svg">
  <link rel="alternate" type="application/rss+xml" title="${SITE_NAME}" href="${BASE_URL}/rss.xml">
  <link rel="manifest" href="${BASE_URL}/manifest.json">
</head>`;
}

function renderHeader(current) {
  return `
<header class="site-header">
  <div class="container">
    <a href="${BASE_URL}/" class="logo">${SITE_NAME}</a>
    <nav class="nav-links" role="navigation" aria-label="Navegación principal">
      <a href="${BASE_URL}/" ${current === 'home' ? 'aria-current="page"' : ''}>Inicio</a>
      <a href="${BASE_URL}/search.html" ${current === 'search' ? 'aria-current="page"' : ''}>Buscar</a>
      <a href="${BASE_URL}/rss.xml" target="_blank" rel="noopener">RSS</a>
    </nav>
    <button class="menu-toggle" aria-label="Menú" aria-expanded="false">
      <span></span><span></span><span></span>
    </button>
  </div>
</header>`;
}

function renderFooter() {
  return `
<footer class="site-footer">
  <div class="container">
    <p>&copy; ${new Date().getFullYear()} ${SITE_NAME}.</p>
  </div>
</footer>
<script src="${BASE_URL}/assets/js/config.js"></script>
<script src="${BASE_URL}/assets/js/app.js"></script>`;
}

/* ============================================
   MAIN BUILD
   ============================================ */
async function build() {
  console.log('\n══════════════════════════════════════════');
  console.log('  Debian MicroNews - Builder');
  console.log(`  BASE_URL: ${BASE_URL}`);
  console.log(`  SITE_URL: ${SITE_URL}`);
  console.log('══════════════════════════════════════════\n');

  // Clean and create dirs
  fs.emptyDirSync(PUBLIC_DIR);
  fs.ensureDirSync(DATA_DIR);
  fs.ensureDirSync(path.join(PUBLIC_DIR, 'post'));
  fs.ensureDirSync(path.join(PUBLIC_DIR, 'category'));
  fs.ensureDirSync(path.join(PUBLIC_DIR, 'data'));
  fs.ensureDirSync(path.join(PUBLIC_DIR, 'assets', 'css'));
  fs.ensureDirSync(path.join(PUBLIC_DIR, 'assets', 'js'));
  fs.ensureDirSync(path.join(PUBLIC_DIR, 'assets', 'icons'));

  // Read posts
  const posts = readPosts();
  console.log(`📝 Posts: ${posts.length}\n`);

  // Validate & copy CSS
  validateAsset(path.join(ASSETS_DIR, 'css', 'style.css'), 'build');
  fs.copySync(path.join(ASSETS_DIR, 'css', 'style.css'), path.join(PUBLIC_DIR, 'assets', 'css', 'style.css'));
  console.log('  ✅ style.css');

  // Copy JS sources (except sw.js which is generated)
  const jsFiles = ['app.js', 'offline.js', 'search.js'];
  jsFiles.forEach(f => {
    const src = path.join(ASSETS_DIR, 'js', f);
    validateAsset(src, f);
    fs.copySync(src, path.join(PUBLIC_DIR, 'assets', 'js', f));
    console.log(`  ✅ ${f}`);
  });

  // Write client config
  writeClientConfig();
  console.log('  ✅ config.js');

  // Copy icons
  const iconFiles = ['favicon.svg', 'icon-192.svg', 'icon-512.svg'];
  iconFiles.forEach(f => {
    const src = path.join(ASSETS_DIR, 'icons', f);
    if (fs.existsSync(src)) {
      fs.copySync(src, path.join(PUBLIC_DIR, 'assets', 'icons', f));
      console.log(`  ✅ ${f}`);
    }
  });

  // Generate PNG icons
  generateIcons();

  // Copy images (validate each referenced in posts)
  posts.forEach(post => {
    if (post.cover) {
      const imgPath = path.join(ASSETS_DIR, post.cover.replace('assets/', ''));
      if (!fs.existsSync(imgPath)) {
        console.error(`  ❌ Imagen faltante: ${imgPath} (referenciada en post ${post.id})`);
        process.exit(1);
      }
      const destDir = path.join(PUBLIC_DIR, path.dirname(post.cover));
      fs.ensureDirSync(destDir);
      fs.copySync(imgPath, path.join(PUBLIC_DIR, post.cover));
      console.log(`  ✅ ${post.cover}`);
    }
  });

  // Generate posts.json
  const postsJson = posts.map(p => ({
    id: p.id, slug: p.slug, title: p.title, author: p.author,
    date: p.date, time: p.time, category: p.category, tags: p.tags,
    summary: p.summary, cover: p.cover, readingTime: p.readingTime
  }));
  fs.writeJsonSync(path.join(DATA_DIR, 'posts.json'), postsJson, { spaces: 2 });
  fs.writeJsonSync(path.join(PUBLIC_DIR, 'data', 'posts.json'), postsJson, { spaces: 2 });
  console.log('  ✅ posts.json');

  // Generate index.json  
  fs.writeJsonSync(path.join(PUBLIC_DIR, 'data', 'index.json'), {
    site: { name: SITE_NAME, description: SITE_DESC, url: SITE_URL },
    posts: postsJson,
    categories: [...new Set(posts.map(p => p.category))],
    tags: [...new Set(posts.flatMap(p => p.tags))],
    updated: new Date().toISOString()
  }, { spaces: 2 });
  console.log('  ✅ index.json');

  // Generate search.json
  const searchJson = posts.map(p => ({
    id: p.id, title: p.title, summary: p.summary,
    author: p.author, date: p.date, time: p.time,
    category: p.category, tags: p.tags,
    content: p.content.replace(/[#*`\[\]<>]/g, '').substring(0, 500)
  }));
  fs.writeJsonSync(path.join(PUBLIC_DIR, 'data', 'search.json'), searchJson, { spaces: 2 });
  console.log('  ✅ search.json');

  // Generate post HTML pages
  const categories = [...new Set(posts.map(p => p.category))];

  posts.forEach((post, i) => {
    const postDir = path.join(PUBLIC_DIR, 'post', post.id);
    fs.ensureDirSync(postDir);
    const prev = posts[i + 1] || null;
    const next = posts[i - 1] || null;
    const tagsHtml = post.tags.map(t => `<span class="tag">${t}</span>`).join('');
    const timeEst = post.readingTime === 1 ? '1 min' : `${post.readingTime} min`;

    const related = posts
      .filter(p => p.id !== post.id && (p.category === post.category || p.tags.some(t => post.tags.includes(t))))
      .slice(0, 3);

    const relatedHtml = related.map(r => `
      <a href="${BASE_URL}/post/${r.id}/" class="related-card">
        ${r.cover ? `<img src="${BASE_URL}/${r.cover}" alt="${r.title}" loading="lazy">` : ''}
        <div>
          <span class="category-badge">${r.category}</span>
          <h4>${r.title}</h4>
        </div>
      </a>
    `).join('');

    const ogImage = post.cover ? `<meta property="og:image" content="${SITE_URL}/${post.cover}">` : '';
    const jsonLd = `<script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "NewsArticle",
      "headline": "${escapeHtml(post.title)}",
      "author": { "@type": "Person", "name": "${post.author}" },
      "datePublished": "${post.date}T${post.time}:00",
      "description": "${escapeHtml(post.summary || post.title)}",
      "articleSection": "${post.category}"
    }
    </script>`;

    const articleTags = post.tags.map(t => `<meta property="article:tag" content="${t}">`).join('\n    ');

    const extraMeta = `
    <meta property="article:published_time" content="${post.date}T${post.time}:00">
    <meta property="article:author" content="${post.author}">
    <meta property="article:section" content="${post.category}">
    ${articleTags}
    ${ogImage}
    ${jsonLd}`;

    const html = `<!DOCTYPE html>
<html lang="es">
${renderHead(post.title, post.summary || post.title, `/post/${post.id}/`, 'article', extraMeta)}
<body>
  ${renderHeader()}
  <main class="container post-page">
    <article class="post-full">
      ${post.cover ? `<img src="${BASE_URL}/${post.cover}" alt="${post.title}" class="post-cover" loading="eager">` : ''}
      <header class="post-header">
        <span class="category-badge">${post.category}</span>
        <h1>${post.title}</h1>
        <div class="post-meta">
          <span class="meta-author">Por ${post.author}</span>
          <time datetime="${post.date}">${formatDate(post.date)} · ${post.time}</time>
          <span class="meta-reading">${timeEst} lectura</span>
        </div>
        <div class="tags">${tagsHtml}</div>
      </header>
      <div class="post-content">${post.bodyHtml}</div>
      <footer class="post-footer">
        <div class="post-share">
          <span>Compartir:</span>
          <button class="share-btn" data-share="twitter" aria-label="Compartir en Twitter">X</button>
          <button class="share-btn" data-share="linkedin" aria-label="Compartir en LinkedIn">in</button>
          <button class="share-btn copy-link" aria-label="Copiar enlace">🔗</button>
        </div>
        ${related.length ? `
        <section class="related-posts">
          <h3>Artículos relacionados</h3>
          <div class="related-grid">${relatedHtml}</div>
        </section>` : ''}
        <nav class="post-nav" aria-label="Navegación entre artículos">
          ${prev ? `<a href="${BASE_URL}/post/${prev.id}/" class="prev">← ${prev.title}</a>` : '<span></span>'}
          ${next ? `<a href="${BASE_URL}/post/${next.id}/" class="next">${next.title} →</a>` : ''}
        </nav>
      </footer>
    </article>
  </main>
  ${renderFooter()}
</body>
</html>`;

    fs.writeFileSync(path.join(postDir, 'index.html'), html);
    console.log(`  ✅ /post/${post.id}/`);
  });

  // Generate index page
  const cardsHtml = posts.map(p => {
    const tagsHtml = p.tags.slice(0, 3).map(t => `<span class="tag">${t}</span>`).join('');
    const timeEst = p.readingTime === 1 ? '1 min' : `${p.readingTime} min`;
    return `
    <article class="post-card">
      ${p.cover ? `<img src="${BASE_URL}/${p.cover}" alt="${p.title}" class="card-cover" loading="lazy">` : ''}
      <div class="card-body">
        <span class="category-badge">${p.category}</span>
        <time datetime="${p.date}">${formatDate(p.date)} · ${p.time}</time>
        <h2><a href="${BASE_URL}/post/${p.id}/">${p.title}</a></h2>
        <p class="card-summary">${p.summary || ''}</p>
        <div class="card-footer">
          <span class="card-author">${p.author}</span>
          <span class="card-reading">${timeEst}</span>
          <div class="tags">${tagsHtml}</div>
        </div>
        <a href="${BASE_URL}/post/${p.id}/" class="read-more">Leer más →</a>
      </div>
    </article>`;
  }).join('\n');

  const catsBar = categories.map(c =>
    `<a href="${BASE_URL}/category/${c.toLowerCase()}/" class="category-pill">${c}</a>`
  ).join('');

  const indexHtml = `<!DOCTYPE html>
<html lang="es">
${renderHead(SITE_NAME, SITE_DESC, '/', 'website')}
<body>
  ${renderHeader('home')}
  <main class="container">
    <section class="hero">
      <h1>${SITE_NAME}</h1>
      <p class="subtitle">${SITE_DESC}</p>
      <div class="categories-bar">${catsBar}</div>
    </section>
    <section class="post-list" aria-label="Lista de artículos">${cardsHtml}</section>
  </main>
  ${renderFooter()}
</body>
</html>`;

  fs.writeFileSync(path.join(PUBLIC_DIR, 'index.html'), indexHtml);
  console.log('  ✅ index.html');

  // Generate category pages
  categories.forEach(cat => {
    const catPosts = posts.filter(p => p.category === cat);
    const catCards = catPosts.map(p => {
      const timeEst = p.readingTime === 1 ? '1 min' : `${p.readingTime} min`;
      return `
      <article class="post-card">
        ${p.cover ? `<img src="${BASE_URL}/${p.cover}" class="card-cover" loading="lazy">` : ''}
        <div class="card-body">
          <span class="category-badge">${p.category}</span>
          <time datetime="${p.date}">${formatDate(p.date)} · ${p.time}</time>
          <h2><a href="${BASE_URL}/post/${p.id}/">${p.title}</a></h2>
          <p class="card-summary">${p.summary || ''}</p>
          <a href="${BASE_URL}/post/${p.id}/" class="read-more">Leer más →</a>
        </div>
      </article>`;
    }).join('\n');

    const catHtml = `<!DOCTYPE html>
<html lang="es">
${renderHead(`${cat} - ${SITE_NAME}`, `Artículos sobre ${cat}`, `/category/${cat.toLowerCase()}/`, 'website')}
<body>
  ${renderHeader()}
  <main class="container">
    <section class="hero category-hero">
      <h1>${cat}</h1>
      <p class="subtitle">${catPosts.length} artículo${catPosts.length !== 1 ? 's' : ''}</p>
    </section>
    <section class="post-list">${catCards}</section>
  </main>
  ${renderFooter()}
</body>
</html>`;

    const catDir = path.join(PUBLIC_DIR, 'category', cat.toLowerCase());
    fs.ensureDirSync(catDir);
    fs.writeFileSync(path.join(catDir, 'index.html'), catHtml);
    console.log(`  ✅ /category/${cat.toLowerCase()}/`);
  });

  // Generate search page
  const searchHtml = `<!DOCTYPE html>
<html lang="es">
${renderHead('Buscar - ' + SITE_NAME, 'Buscar artículos', '/search.html', 'website')}
<body>
  ${renderHeader('search')}
  <main class="container search-page">
    <h1>Buscar artículos</h1>
    <div class="search-box">
      <input type="search" id="search-input" placeholder="Buscar por título, contenido, categoría..." aria-label="Buscar artículos">
      <span class="search-icon">⌕</span>
    </div>
    <div id="search-results" role="status">
      <p class="search-hint">Escribe para comenzar a buscar...</p>
    </div>
  </main>
  ${renderFooter()}
  <script src="${BASE_URL}/assets/js/search.js"></script>
</body>
</html>`;

  fs.writeFileSync(path.join(PUBLIC_DIR, 'search.html'), searchHtml);
  console.log('  ✅ search.html');

  // Generate 404 page
  const notFoundHtml = `<!DOCTYPE html>
<html lang="es">
${renderHead('404 - ' + SITE_NAME, 'Página no encontrada', '/404.html', 'website')}
<body>
  <main class="container error-page">
    <h1>404</h1>
    <p>Página no encontrada</p>
    <a href="${BASE_URL}/" class="btn-primary">Volver al inicio</a>
  </main>
  <script src="${BASE_URL}/assets/js/config.js"></script>
</body>
</html>`;
  fs.writeFileSync(path.join(PUBLIC_DIR, '404.html'), notFoundHtml);
  console.log('  ✅ 404.html');

  // Generate offline page
  const offlineHtml = `<!DOCTYPE html>
<html lang="es">
${renderHead('Sin conexión - ' + SITE_NAME, 'Sin conexión a Internet', '/offline.html', 'website')}
<body>
  <main class="container error-page">
    <h1>Sin conexión</h1>
    <p>No hay conexión a Internet. Los artículos guardados están disponibles sin conexión.</p>
    <button class="btn-primary" onclick="location.reload()">Reintentar</button>
  </main>
  <script src="${BASE_URL}/assets/js/config.js"></script>
</body>
</html>`;
  fs.writeFileSync(path.join(PUBLIC_DIR, 'offline.html'), offlineHtml);
  console.log('  ✅ offline.html');

  // Generate manifest.json
  writeManifest();
  console.log('  ✅ manifest.json');

  // Generate Service Worker
  writeServiceWorker(posts);
  console.log('  ✅ sw.js');

  // Generate RSS
  const rssItems = posts.map(p => `
    <item>
      <title>${escapeHtml(p.title)}</title>
      <link>${SITE_URL}/post/${p.id}/</link>
      <guid isPermaLink="true">${SITE_URL}/post/${p.id}/</guid>
      <pubDate>${new Date(p.date + 'T' + p.time).toUTCString()}</pubDate>
      <description>${escapeHtml(p.summary || p.title)}</description>
      <category>${escapeHtml(p.category)}</category>
      ${p.tags.map(t => `<category>${escapeHtml(t)}</category>`).join('\n      ')}
    </item>`).join('');

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${SITE_NAME}</title>
    <link>${SITE_URL}/</link>
    <description>${SITE_DESC}</description>
    <language>es</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml"/>
    ${rssItems}
  </channel>
</rss>`;
  fs.writeFileSync(path.join(PUBLIC_DIR, 'rss.xml'), rss);
  console.log('  ✅ rss.xml');

  // Generate sitemap
  const sitemapUrls = [
    { loc: '/', priority: '1.0' },
    { loc: '/search.html', priority: '0.6' },
    ...categories.map(c => ({ loc: `/category/${c.toLowerCase()}/`, priority: '0.7' })),
    ...posts.map(p => ({ loc: `/post/${p.id}/`, priority: '0.9' }))
  ];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${sitemapUrls.map(u => `
  <url>
    <loc>${SITE_URL}${u.loc}</loc>
    <priority>${u.priority}</priority>
  </url>`).join('')}
</urlset>`;
  fs.writeFileSync(path.join(PUBLIC_DIR, 'sitemap.xml'), sitemap);
  console.log('  ✅ sitemap.xml');

  // Generate robots.txt
  fs.writeFileSync(path.join(PUBLIC_DIR, 'robots.txt'),
    `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml`);
  console.log('  ✅ robots.txt');

  // Generate version.json
  fs.writeJsonSync(path.join(PUBLIC_DIR, 'version.json'), {
    version: Date.now().toString(36),
    updated: new Date().toISOString(),
    posts: posts.length
  });
  console.log('  ✅ version.json');

  // Generate CNAME if custom domain
  if (process.env.CNAME) {
    fs.writeFileSync(path.join(PUBLIC_DIR, 'CNAME'), process.env.CNAME.trim());
    console.log(`  ✅ CNAME (${process.env.CNAME})`);
  }

  // ==========================================
  // VALIDATION: Verify no 404s
  // ==========================================
  console.log('\n══════════════════════════════════════════');
  console.log('  Validando assets...\n');

  let errors = 0;

  const checkFile = (filePath, label) => {
    if (!fs.existsSync(filePath)) {
      console.error(`  ❌ ${label}: ${filePath} no existe`);
      errors++;
    }
  };

  checkFile(path.join(PUBLIC_DIR, 'index.html'), 'index.html');
  checkFile(path.join(PUBLIC_DIR, 'assets', 'css', 'style.css'), 'style.css');
  checkFile(path.join(PUBLIC_DIR, 'assets', 'js', 'app.js'), 'app.js');
  checkFile(path.join(PUBLIC_DIR, 'assets', 'js', 'config.js'), 'config.js');
  checkFile(path.join(PUBLIC_DIR, 'assets', 'js', 'search.js'), 'search.js');
  checkFile(path.join(PUBLIC_DIR, 'assets', 'icons', 'favicon.svg'), 'favicon.svg');
  checkFile(path.join(PUBLIC_DIR, 'assets', 'icons', 'icon-192.png'), 'icon-192.png');
  checkFile(path.join(PUBLIC_DIR, 'assets', 'icons', 'icon-512.png'), 'icon-512.png');
  checkFile(path.join(PUBLIC_DIR, 'sw.js'), 'sw.js');
  checkFile(path.join(PUBLIC_DIR, 'manifest.json'), 'manifest.json');
  checkFile(path.join(PUBLIC_DIR, 'offline.html'), 'offline.html');
  checkFile(path.join(PUBLIC_DIR, 'rss.xml'), 'rss.xml');
  checkFile(path.join(PUBLIC_DIR, 'sitemap.xml'), 'sitemap.xml');
  checkFile(path.join(PUBLIC_DIR, 'robots.txt'), 'robots.txt');
  checkFile(path.join(PUBLIC_DIR, 'version.json'), 'version.json');
  checkFile(path.join(PUBLIC_DIR, 'data', 'posts.json'), 'data/posts.json');
  checkFile(path.join(PUBLIC_DIR, 'data', 'search.json'), 'data/search.json');

  posts.forEach(p => {
    checkFile(path.join(PUBLIC_DIR, 'post', p.id, 'index.html'), `post/${p.id}/index.html`);
    if (p.cover) {
      checkFile(path.join(PUBLIC_DIR, p.cover), `cover: ${p.cover}`);
    }
  });

  categories.forEach(c => {
    checkFile(path.join(PUBLIC_DIR, 'category', c.toLowerCase(), 'index.html'), `category/${c}/index.html`);
  });

  if (errors > 0) {
    console.error(`\n❌ ${errors} error(es) de asset encontrados. Build fallido.`);
    process.exit(1);
  }

  console.log(`  ✅ Todos los assets verificados (0 errores)`);

  // ==========================================
  // Summary
  // ==========================================
  console.log('\n══════════════════════════════════════════');
  console.log(`  Build exitoso`);
  console.log(`  ${posts.length} posts · ${categories.length} categorías`);
  console.log(`  BASE_URL: ${BASE_URL}`);
  console.log(`  SITE_URL: ${SITE_URL}`);
  if (process.env.CNAME) console.log(`  CNAME: ${process.env.CNAME}`);
  console.log('══════════════════════════════════════════\n');
}

build().catch(err => {
  console.error('\n❌ Error fatal:', err.message);
  process.exit(1);
});
